import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';

// Add stealth plugin
puppeteer.use(StealthPlugin());

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
  // Additional fields for cover letter generation
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  writingSample?: string;
  skills?: string[];
  experience?: string;
}

export interface ApplicationResult {
  success: boolean;
  message: string;
  screenshotUrl?: string;
}

// Shared browser instance for better performance
let browserInstance: Browser | null = null;

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });
  }
  return browserInstance;
}

/**
 * Attempts to automatically fill and submit a job application form using self-hosted Puppeteer
 */
export async function autoApplyToJob(
  jobUrl: string,
  applicantData: JobApplicationData
): Promise<ApplicationResult> {
  let page: Page | null = null;
  
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set stealth mode - mimic real browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Navigate to job application URL
    await page.goto(jobUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for dynamic content with human-like delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    // Helper: Check if element is visible
    const isElementVisible = async (element: any): Promise<boolean> => {
      return await page!.evaluate(el => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               el.offsetParent !== null;
      }, element);
    };

    // Helper: Type with human-like delays
    const humanType = async (element: any, text: string) => {
      await element.click({ delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      for (const char of text) {
        await element.type(char, { delay: 50 + Math.random() * 100 });
      }
    };

    // Helper: Fill field by selectors
    const fillField = async (selectors: string[], value: string): Promise<number> => {
      if (!value) return 0;
      
      for (const selector of selectors) {
        try {
          const element = await page!.$(selector);
          if (element && await isElementVisible(element)) {
            await humanType(element, value);
            return 1;
          }
        } catch (e) {
          // Try next selector
        }
      }
      return 0;
    };

    // Step 1: Look for "Apply" button and click it (especially for Greenhouse)
    const applyButtonSelectors = [
      'button[id*="apply"]',
      'a[id*="apply"]',
      'button.apply-button',
      'a.apply-button',
      '#apply-button',
      'button[data-testid*="apply"]',
      '.app-btn', // Greenhouse specific
      'a.app-link', // Greenhouse specific
    ];

    // Find apply button by text content
    const applyButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('apply') && !text.includes('easy apply');
      });
    });

    const applyElement = await applyButton.asElement();
    if (applyElement && await isElementVisible(applyElement)) {
      console.log('[AutoApply] Clicking Apply button...');
      await (applyElement as any).click();
      
      // Wait for navigation or form to appear (especially for Greenhouse)
      try {
        await Promise.race([
          page.waitForNavigation({ timeout: 5000, waitUntil: 'networkidle2' }),
          page.waitForSelector('input[type="text"], input[type="email"], textarea', { timeout: 5000 }),
        ]);
        console.log('[AutoApply] Form appeared after clicking Apply');
      } catch (e) {
        console.log('[AutoApply] No navigation/form detected, continuing...');
      }
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    }

    // Step 2: Detect ATS platform
    const url = page.url().toLowerCase();
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.toLowerCase());
    
    let atsType: string = 'generic';
    if (url.includes('greenhouse.io') || bodyHtml.includes('greenhouse')) {
      atsType = 'greenhouse';
    } else if (url.includes('lever.co') || bodyHtml.includes('lever-frame')) {
      atsType = 'lever';
    } else if (url.includes('workable.com') || bodyHtml.includes('workable')) {
      atsType = 'workable';
    } else if (url.includes('linkedin.com/jobs')) {
      atsType = 'linkedin';
    } else if (url.includes('ashbyhq.com')) {
      atsType = 'ashby';
    }

    // Step 3: Fill form fields
    let fieldsFilledCount = 0;

    // ATS-specific selectors
    const atsSelectors: Record<string, Record<string, string[]>> = {
      greenhouse: {
        firstName: ['#first_name', 'input[name="job_application[first_name]"]'],
        lastName: ['#last_name', 'input[name="job_application[last_name]"]'],
        email: ['#email', 'input[name="job_application[email]"]'],
        phone: ['#phone', 'input[name="job_application[phone]"]'],
        coverLetter: ['#cover_letter_text', 'textarea[name="job_application[cover_letter]"]'],
        linkedin: ['input[name="job_application[linkedin_url]"]'],
        github: ['input[name="job_application[github_url]"]'],
      },
      lever: {
        name: ['input[name="name"]', '.application-name input'],
        email: ['input[name="email"]', '.application-email input'],
        phone: ['input[name="phone"]', '.application-phone input'],
        coverLetter: ['textarea[name="comments"]', '.application-comments textarea', '#additional-information'],
        linkedin: ['input[name="urls[LinkedIn]"]'],
        github: ['input[name="urls[GitHub]"]'],
      },
      workable: {
        firstName: ['input[name="candidate[firstname]"]'],
        lastName: ['input[name="candidate[lastname]"]'],
        email: ['input[name="candidate[email]"]'],
        phone: ['input[name="candidate[phone]"]'],
        coverLetter: ['textarea[name="candidate[cover_letter]"]'],
        linkedin: ['input[name="candidate[social_linkedin]"]'],
        github: ['input[name="candidate[social_github]"]'],
      },
      ashby: {
        name: ['input[name="name"]'],
        email: ['input[name="email"]'],
        phone: ['input[name="phone"]'],
        linkedin: ['input[name="linkedInUrl"]'],
        github: ['input[name="githubUrl"]'],
      },
      linkedin: {
        // LinkedIn Easy Apply is detected but we don't auto-submit
        phone: ['input[id*="phoneNumber"]', 'input[name*="phoneNumber"]'],
      },
    };

    // Try ATS-specific selectors
    if (atsType !== 'generic' && atsSelectors[atsType]) {
      const mapping = atsSelectors[atsType];
      
      // Split name
      const nameParts = applicantData.fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      // Fill name fields
      if (mapping.firstName) {
        fieldsFilledCount += await fillField(mapping.firstName, firstName);
      }
      if (mapping.lastName) {
        fieldsFilledCount += await fillField(mapping.lastName, lastName);
      }
      if (mapping.name) {
        fieldsFilledCount += await fillField(mapping.name, applicantData.fullName);
      }
      
      // Fill contact fields
      if (mapping.email) {
        fieldsFilledCount += await fillField(mapping.email, applicantData.email);
      }
      if (mapping.phone) {
        fieldsFilledCount += await fillField(mapping.phone, applicantData.phone);
      }
      
      // Fill social links
      if (mapping.linkedin && applicantData.linkedinUrl) {
        fieldsFilledCount += await fillField(mapping.linkedin, applicantData.linkedinUrl);
      }
      if (mapping.github && applicantData.githubUrl) {
        fieldsFilledCount += await fillField(mapping.github, applicantData.githubUrl);
      }
      
      // Fill cover letter
      if (mapping.coverLetter && applicantData.coverLetter) {
        fieldsFilledCount += await fillField(mapping.coverLetter, applicantData.coverLetter);
      }
    }

    // Step 4: Handle resume file upload
    if (applicantData.resumeUrl) {
      try {
        // Find file input for resume
        const fileInputSelectors = [
          'input[type="file"][name*="resume"]',
          'input[type="file"][name*="cv"]',
          'input[type="file"][id*="resume"]',
          'input[type="file"][id*="cv"]',
          'input[type="file"]', // Fallback to any file input
        ];

        let fileInput = null;
        for (const selector of fileInputSelectors) {
          fileInput = await page.$(selector);
          if (fileInput) break;
        }

        if (fileInput) {
          // Download resume from S3 to temp file
          const axios = await import('axios');
          const fs = await import('fs');
          const path = await import('path');
          const os = await import('os');
          
          const response = await axios.default.get(applicantData.resumeUrl, { responseType: 'arraybuffer' });
          const tempFilePath = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`);
          fs.writeFileSync(tempFilePath, response.data);
          
          // Upload file
          await (fileInput as any).uploadFile(tempFilePath);
          fieldsFilledCount++;
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
          
          console.log('[AutoApply] Resume uploaded successfully');
        }
      } catch (error) {
        console.error('[AutoApply] Resume upload failed:', error);
        // Continue even if resume upload fails
      }
    }

    // Fallback to generic selectors if no fields filled
    if (fieldsFilledCount === 0) {
      const nameParts = applicantData.fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const fieldMappings = [
        { selectors: ['input[name*="first"]', 'input[id*="first"]', 'input[placeholder*="First"]'], value: firstName },
        { selectors: ['input[name*="last"]', 'input[id*="last"]', 'input[placeholder*="Last"]'], value: lastName },
        { selectors: ['input[type="email"]', 'input[name*="email"]', 'input[id*="email"]'], value: applicantData.email },
        { selectors: ['input[type="tel"]', 'input[name*="phone"]', 'input[id*="phone"]'], value: applicantData.phone },
        { selectors: ['input[name*="linkedin"]', 'input[id*="linkedin"]'], value: applicantData.linkedinUrl || '' },
        { selectors: ['input[name*="github"]', 'input[id*="github"]'], value: applicantData.githubUrl || '' },
        { selectors: ['textarea[name*="cover"]', 'textarea[name*="message"]', 'textarea[id*="cover"]'], value: applicantData.coverLetter || '' },
      ];

      for (const mapping of fieldMappings) {
        if (mapping.value) {
          fieldsFilledCount += await fillField(mapping.selectors, mapping.value);
        }
      }
    }

    // Check if any fields were filled
    if (fieldsFilledCount === 0) {
      await page.close();
      return {
        success: false,
        message: 'No application form fields detected. This may require manual application.',
      };
    }

    // Don't actually submit - too risky with anti-bot protection
    // Just return success with fields filled
    await page.close();
    
    return {
      success: false, // Mark as false to trigger manual review
      message: `Filled ${fieldsFilledCount} fields but did not submit due to anti-bot protection. Manual review required.`,
    };

  } catch (error: any) {
    console.error('[Job Automation] Self-hosted Puppeteer error:', error.message);
    
    // Check if error is due to missing Chrome
    if (error.message && error.message.includes('Could not find Chrome')) {
      console.error('[Job Automation] Chrome not installed. Run: npx puppeteer browsers install chrome');
    }
    
    if (page) {
      await page.close().catch(() => {});
    }
    
    // Return a more helpful error message
    if (error.name === 'TimeoutError') {
      return {
        success: false,
        message: 'Application timed out. The form may be too complex for automation. Manual review required.',
      };
    }
    
    return {
      success: false,
      message: `Automation failed: ${error.message}. Manual review required.`,
    };
  }
}

/**
 * Close browser instance when shutting down
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
