import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

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
    // Find Chrome/Chromium executable
    let executablePath: string | undefined;
    const possiblePaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ];
    
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        executablePath = path;
        break;
      }
    }
    
    if (!executablePath) {
      throw new Error('Chrome/Chromium not found. Please install chromium-browser.');
    }
    
    // Launch headless browser using system Chromium
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
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
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Detect ATS platform
    const atsType = await detectATSPlatform(page);
    console.log(`[Job Automation] Detected ATS: ${atsType}`);

    // Detect and fill form fields based on ATS type
    const fieldsFound = await detectAndFillFormFields(page, applicantData, atsType);

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
 * Detect which ATS platform is being used
 */
async function detectATSPlatform(page: Page): Promise<string> {
  try {
    const url = page.url().toLowerCase();
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.toLowerCase());
    
    // Greenhouse
    if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io') || bodyHtml.includes('greenhouse')) {
      return 'greenhouse';
    }
    
    // Lever
    if (url.includes('lever.co') || url.includes('jobs.lever.co') || bodyHtml.includes('lever-frame')) {
      return 'lever';
    }
    
    // Workable
    if (url.includes('workable.com') || url.includes('apply.workable.com') || bodyHtml.includes('workable')) {
      return 'workable';
    }
    
    // Ashby
    if (url.includes('ashbyhq.com') || url.includes('jobs.ashbyhq.com') || bodyHtml.includes('ashby')) {
      return 'ashby';
    }
    
    // BambooHR
    if (url.includes('bamboohr.com') || bodyHtml.includes('bamboohr')) {
      return 'bamboohr';
    }
    
    // Jobvite
    if (url.includes('jobvite.com') || bodyHtml.includes('jobvite')) {
      return 'jobvite';
    }
    
    // SmartRecruiters
    if (url.includes('smartrecruiters.com') || bodyHtml.includes('smartrecruiters')) {
      return 'smartrecruiters';
    }
    
    return 'generic';
  } catch (error) {
    console.error('[Job Automation] Error detecting ATS:', error);
    return 'generic';
  }
}

/**
 * Detect and fill form fields based on ATS platform and common patterns
 */
async function detectAndFillFormFields(
  page: Page,
  data: JobApplicationData,
  atsType: string = 'generic'
): Promise<number> {
  let fieldsFilledCount = 0;

  // ATS-specific selectors
  const atsSelectors: Record<string, any> = {
    greenhouse: {
      firstName: ['#first_name', 'input[name="job_application[first_name]"]'],
      lastName: ['#last_name', 'input[name="job_application[last_name]"]'],
      email: ['#email', 'input[name="job_application[email]"]'],
      phone: ['#phone', 'input[name="job_application[phone]"]'],
      resume: ['input[name="job_application[resume]"]'],
      coverLetter: ['#cover_letter_text', 'textarea[name="job_application[cover_letter]"]'],
      linkedin: ['input[name="job_application[linkedin_url]"]'],
      github: ['input[name="job_application[github_url]"]'],
    },
    lever: {
      name: ['input[name="name"]', '.application-name input'],
      email: ['input[name="email"]', '.application-email input'],
      phone: ['input[name="phone"]', '.application-phone input'],
      resume: ['input[name="resume"]', '.application-resume input'],
      coverLetter: ['textarea[name="comments"]', '.application-comments textarea'],
      linkedin: ['input[name="urls[LinkedIn]"]'],
      github: ['input[name="urls[GitHub]"]'],
    },
    workable: {
      firstName: ['input[name="candidate[firstname]"]'],
      lastName: ['input[name="candidate[lastname]"]'],
      email: ['input[name="candidate[email]"]'],
      phone: ['input[name="candidate[phone]"]'],
      resume: ['input[name="candidate[resume]"]'],
      coverLetter: ['textarea[name="candidate[cover_letter]"]'],
      linkedin: ['input[name="candidate[social_linkedin]"]'],
      github: ['input[name="candidate[social_github]"]'],
    },
  };

  // Try ATS-specific selectors first if available
  if (atsType !== 'generic' && atsSelectors[atsType]) {
    const atsMapping = atsSelectors[atsType];
    
    // Fill first name
    if (atsMapping.firstName) {
      fieldsFilledCount += await fillField(page, atsMapping.firstName, data.fullName.split(' ')[0]);
    }
    
    // Fill last name
    if (atsMapping.lastName) {
      fieldsFilledCount += await fillField(page, atsMapping.lastName, data.fullName.split(' ').slice(1).join(' '));
    }
    
    // Fill full name (for Lever)
    if (atsMapping.name) {
      fieldsFilledCount += await fillField(page, atsMapping.name, data.fullName);
    }
    
    // Fill email
    if (atsMapping.email) {
      fieldsFilledCount += await fillField(page, atsMapping.email, data.email);
    }
    
    // Fill phone
    if (atsMapping.phone) {
      fieldsFilledCount += await fillField(page, atsMapping.phone, data.phone);
    }
    
    // Fill LinkedIn
    if (atsMapping.linkedin && data.linkedinUrl) {
      fieldsFilledCount += await fillField(page, atsMapping.linkedin, data.linkedinUrl);
    }
    
    // Fill GitHub
    if (atsMapping.github && data.githubUrl) {
      fieldsFilledCount += await fillField(page, atsMapping.github, data.githubUrl);
    }
    
    // Fill cover letter
    if (atsMapping.coverLetter && data.coverLetter) {
      fieldsFilledCount += await fillField(page, atsMapping.coverLetter, data.coverLetter);
    }
    
    console.log(`[Job Automation] Filled ${fieldsFilledCount} fields using ${atsType} selectors`);
    
    // If we filled fields successfully, return early
    if (fieldsFilledCount > 0) {
      return fieldsFilledCount;
    }
  }

  // Fallback to generic field selectors
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
 * Helper function to fill a field with multiple selector options
 */
async function fillField(page: Page, selectors: string[], value: string): Promise<number> {
  for (const selector of selectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          await element.click();
          await element.type(value, { delay: 50 });
          return 1; // Successfully filled one field
        }
      }
    } catch (error) {
      // Field not found or not fillable, try next selector
    }
  }
  return 0; // No fields filled
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
