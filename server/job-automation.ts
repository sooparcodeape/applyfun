import puppeteer, { Browser, Page } from 'puppeteer';

export interface JobApplicationData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
}

export interface ApplicationResult {
  success: boolean;
  message: string;
  screenshotPath?: string;
}

/**
 * Attempts to automatically fill and submit a job application form
 * This is an MVP implementation that handles common form patterns
 */
export async function autoApplyToJob(
  jobUrl: string,
  applicantData: JobApplicationData
): Promise<ApplicationResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to job application URL
    await page.goto(jobUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Detect and fill common form fields
    const fieldsFound = await detectAndFillFormFields(page, applicantData);

    if (fieldsFound === 0) {
      return {
        success: false,
        message: 'No application form fields detected on this page. Manual application required.',
      };
    }

    // Look for submit button
    const submitButton = await findSubmitButton(page);

    if (!submitButton) {
      return {
        success: false,
        message: `Filled ${fieldsFound} fields but could not find submit button. Manual review required.`,
      };
    }

    // Take screenshot before submission
    const screenshotPath = `/tmp/application_${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Click submit button
    await submitButton.click();

    // Wait for navigation or success indicator
    await Promise.race([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]);

    // Check for success indicators
    const successDetected = await detectSuccessMessage(page);

    if (successDetected) {
      return {
        success: true,
        message: 'Application submitted successfully!',
        screenshotPath,
      };
    }

    return {
      success: false,
      message: `Form submitted but success confirmation not detected. Please verify manually.`,
      screenshotPath,
    };

  } catch (error: any) {
    console.error('[Job Automation] Error:', error);
    return {
      success: false,
      message: `Automation failed: ${error.message}`,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Detect and fill form fields based on common patterns
 */
async function detectAndFillFormFields(
  page: Page,
  data: JobApplicationData
): Promise<number> {
  let fieldsFilledCount = 0;

  // Common field selectors and their data mappings
  const fieldMappings = [
    // Name fields
    { selectors: ['input[name*="name"]', 'input[id*="name"]', 'input[placeholder*="name"]'], value: data.fullName },
    { selectors: ['input[name*="first"]', 'input[id*="first"]'], value: data.fullName.split(' ')[0] },
    { selectors: ['input[name*="last"]', 'input[id*="last"]'], value: data.fullName.split(' ').slice(1).join(' ') },
    
    // Email fields
    { selectors: ['input[type="email"]', 'input[name*="email"]', 'input[id*="email"]'], value: data.email },
    
    // Phone fields
    { selectors: ['input[type="tel"]', 'input[name*="phone"]', 'input[id*="phone"]'], value: data.phone },
    
    // Location fields
    { selectors: ['input[name*="location"]', 'input[id*="location"]', 'input[name*="city"]'], value: data.location },
    
    // LinkedIn
    { selectors: ['input[name*="linkedin"]', 'input[id*="linkedin"]'], value: data.linkedinUrl || '' },
    
    // GitHub
    { selectors: ['input[name*="github"]', 'input[id*="github"]'], value: data.githubUrl || '' },
    
    // Portfolio
    { selectors: ['input[name*="portfolio"]', 'input[id*="portfolio"]', 'input[name*="website"]'], value: data.portfolioUrl || '' },
    
    // Cover letter / message
    { selectors: ['textarea[name*="cover"]', 'textarea[id*="cover"]', 'textarea[name*="message"]'], value: data.coverLetter || '' },
  ];

  for (const mapping of fieldMappings) {
    if (!mapping.value) continue;

    for (const selector of mapping.selectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click();
            await element.type(mapping.value, { delay: 50 });
            fieldsFilledCount++;
            break; // Only fill the first visible match
          }
        }
      } catch (error) {
        // Field not found or not fillable, continue
      }
    }
  }

  // Handle file upload for resume if present
  if (data.resumeUrl) {
    try {
      const fileInputs = await page.$$('input[type="file"]');
      for (const input of fileInputs) {
        const isVisible = await input.isVisible();
        if (isVisible) {
          // Note: This would need to download the resume from S3 first
          // For MVP, we skip file uploads
          console.log('[Job Automation] Resume upload field detected but skipped (requires file download)');
        }
      }
    } catch (error) {
      // No file inputs found
    }
  }

  return fieldsFilledCount;
}

/**
 * Find the submit button on the page
 */
async function findSubmitButton(page: Page) {
  const buttonSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Submit")',
    'button:has-text("Apply")',
    'button:has-text("Send")',
    'a:has-text("Submit Application")',
  ];

  for (const selector of buttonSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          return button;
        }
      }
    } catch (error) {
      // Button not found, try next selector
    }
  }

  return null;
}

/**
 * Detect success message after submission
 */
async function detectSuccessMessage(page: Page): Promise<boolean> {
  const successPatterns = [
    'thank you',
    'success',
    'submitted',
    'received',
    'application sent',
    'we\'ll be in touch',
    'confirmation',
  ];

  try {
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    for (const pattern of successPatterns) {
      if (bodyText.includes(pattern)) {
        return true;
      }
    }
  } catch (error) {
    console.error('[Job Automation] Error detecting success message:', error);
  }

  return false;
}
