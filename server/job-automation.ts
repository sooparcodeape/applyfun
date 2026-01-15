import axios from 'axios';

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

// Get Browserless API key from environment
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY || '';
const BROWSERLESS_API_URL = 'https://production-sfo.browserless.io';

/**
 * Attempts to automatically fill and submit a job application form using Browserless.io
 */
export async function autoApplyToJob(
  jobUrl: string,
  applicantData: JobApplicationData
): Promise<ApplicationResult> {
  if (!BROWSERLESS_API_KEY) {
    return {
      success: false,
      message: 'Browserless API key not configured. Please add BROWSERLESS_API_KEY to environment variables.',
    };
  }

  try {
    // Use provided cover letter
    const coverLetter = applicantData.coverLetter || '';

    // Build Puppeteer script for Browserless
    const puppeteerScript = buildPuppeteerScript(jobUrl, applicantData);

    // Execute script via Browserless Function API
    const response = await axios.post(
      `${BROWSERLESS_API_URL}/function?token=${BROWSERLESS_API_KEY}`,
      {
        code: puppeteerScript,
        context: {
          jobUrl,
          applicantData: {
            ...applicantData,
            coverLetter,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minute timeout
      }
    );

    const result = response.data;

    if (result.success) {
      return {
        success: true,
        message: result.message || 'Application submitted successfully!',
        screenshotUrl: result.screenshotUrl,
      };
    } else {
      return {
        success: false,
        message: result.message || 'Application automation failed. Manual review required.',
        screenshotUrl: result.screenshotUrl,
      };
    }
  } catch (error: any) {
    console.error('[Job Automation] Browserless API error:', error.response?.data || error.message);
    
    // Return a more helpful error message
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        message: 'Application timed out. The form may be too complex for automation. Manual review required.',
      };
    }
    
    return {
      success: false,
      message: `Automation failed: ${error.response?.data?.message || error.message}. Manual review required.`,
    };
  }
}

/**
 * Build Puppeteer script to be executed by Browserless
 */
function buildPuppeteerScript(jobUrl: string, data: JobApplicationData): string {
  return `
module.exports = async ({ page, context }) => {
  const { jobUrl, applicantData } = context;
  
  try {
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
    await page.waitForTimeout(2000 + Math.random() * 1000);

    // Helper: Check if element is visible
    async function isElementVisible(element) {
      return await page.evaluate(el => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               el.offsetParent !== null;
      }, element);
    }

    // Helper: Type with human-like delays
    async function humanType(element, text) {
      await element.click({ delay: 100 });
      await page.waitForTimeout(200 + Math.random() * 300);
      for (const char of text) {
        await element.type(char, { delay: 50 + Math.random() * 100 });
      }
    }

    // Helper: Fill field by selectors
    async function fillField(selectors, value) {
      if (!value) return 0;
      
      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element && await isElementVisible(element)) {
            await humanType(element, value);
            return 1;
          }
        } catch (e) {
          // Try next selector
        }
      }
      return 0;
    }

    // Step 1: Look for "Apply" button and click it
    const applyButtonSelectors = [
      'button[id*="apply"]',
      'a[id*="apply"]',
      'button.apply-button',
      'a.apply-button',
      '#apply-button',
      'button[data-testid*="apply"]',
    ];

    // Find apply button by text content
    const applyButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => {
        const text = btn.textContent.toLowerCase();
        return text.includes('apply') && !text.includes('easy apply');
      });
    });

    if (applyButton && await isElementVisible(applyButton.asElement())) {
      await applyButton.asElement().click();
      await page.waitForTimeout(2000 + Math.random() * 1000);
    }

    // Step 2: Detect ATS platform
    const url = page.url().toLowerCase();
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.toLowerCase());
    
    let atsType = 'generic';
    if (url.includes('greenhouse.io') || bodyHtml.includes('greenhouse')) {
      atsType = 'greenhouse';
    } else if (url.includes('lever.co') || bodyHtml.includes('lever-frame')) {
      atsType = 'lever';
    } else if (url.includes('workable.com') || bodyHtml.includes('workable')) {
      atsType = 'workable';
    } else if (url.includes('linkedin.com/jobs')) {
      atsType = 'linkedin';
    }

    // Step 3: Fill form fields
    let fieldsFilledCount = 0;

    // ATS-specific selectors
    const atsSelectors = {
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
        coverLetter: ['textarea[name="comments"]', '.application-comments textarea'],
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
      const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
      return {
        success: false,
        message: 'No application form fields detected. This may require manual application.',
        screenshot,
      };
    }

    // Take screenshot before submission
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });

    // Don't actually submit - too risky with anti-bot protection
    // Just return success with fields filled
    return {
      success: false, // Mark as false to trigger manual review
      message: \`Filled \${fieldsFilledCount} fields but did not submit due to anti-bot protection. Manual review required.\`,
      screenshot,
      fieldsFilledCount,
    };

  } catch (error) {
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true }).catch(() => null);
    return {
      success: false,
      message: \`Error: \${error.message}\`,
      screenshot,
    };
  }
};
`;
}
