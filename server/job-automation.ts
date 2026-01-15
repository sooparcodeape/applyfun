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
    // Navigate to job application URL
    await page.goto(jobUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for dynamic content
    await page.waitForTimeout(3000);

    // Step 1: Look for "Apply" button and click it
    const applyButtonSelectors = [
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      '[data-testid="apply-button"]',
      '.apply-button',
      '#apply-button',
    ];

    let applyButtonFound = false;
    for (const selector of applyButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            await button.click();
            await page.waitForTimeout(2000);
            applyButtonFound = true;
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Step 2: Handle multi-step flows (Continue/Next buttons)
    const continueButtonSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("Apply Now")',
      '[data-testid="continue-button"]',
    ];

    for (let i = 0; i < 3; i++) {
      let continueButtonFound = false;
      for (const selector of continueButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            const isVisible = await button.isVisible();
            if (isVisible) {
              await button.click();
              await page.waitForTimeout(2000);
              continueButtonFound = true;
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      if (!continueButtonFound) break;
    }

    // Step 3: Detect ATS platform
    const url = page.url().toLowerCase();
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.toLowerCase());
    
    let atsType = 'generic';
    if (url.includes('greenhouse.io') || bodyHtml.includes('greenhouse')) {
      atsType = 'greenhouse';
    } else if (url.includes('lever.co') || bodyHtml.includes('lever-frame')) {
      atsType = 'lever';
    } else if (url.includes('workable.com') || bodyHtml.includes('workable')) {
      atsType = 'workable';
    }

    // Step 4: Fill form fields
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
    };

    // Try ATS-specific selectors
    if (atsType !== 'generic' && atsSelectors[atsType]) {
      const mapping = atsSelectors[atsType];
      
      // Fill name fields
      if (mapping.firstName) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.firstName, applicantData.fullName.split(' ')[0]);
      }
      if (mapping.lastName) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.lastName, applicantData.fullName.split(' ').slice(1).join(' '));
      }
      if (mapping.name) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.name, applicantData.fullName);
      }
      
      // Fill contact fields
      if (mapping.email) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.email, applicantData.email);
      }
      if (mapping.phone) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.phone, applicantData.phone);
      }
      
      // Fill social links
      if (mapping.linkedin && applicantData.linkedinUrl) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.linkedin, applicantData.linkedinUrl);
      }
      if (mapping.github && applicantData.githubUrl) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.github, applicantData.githubUrl);
      }
      
      // Fill cover letter
      if (mapping.coverLetter && applicantData.coverLetter) {
        fieldsFilledCount += await fillFieldHelper(page, mapping.coverLetter, applicantData.coverLetter);
      }
    }

    // Fallback to generic selectors if no fields filled
    if (fieldsFilledCount === 0) {
      const fieldMappings = [
        { selectors: ['input[name*="name"]', 'input[id*="name"]'], value: applicantData.fullName },
        { selectors: ['input[name*="first"]', 'input[id*="first"]'], value: applicantData.fullName.split(' ')[0] },
        { selectors: ['input[name*="last"]', 'input[id*="last"]'], value: applicantData.fullName.split(' ').slice(1).join(' ') },
        { selectors: ['input[type="email"]', 'input[name*="email"]'], value: applicantData.email },
        { selectors: ['input[type="tel"]', 'input[name*="phone"]'], value: applicantData.phone },
        { selectors: ['input[name*="linkedin"]'], value: applicantData.linkedinUrl || '' },
        { selectors: ['input[name*="github"]'], value: applicantData.githubUrl || '' },
        { selectors: ['textarea[name*="cover"]', 'textarea[name*="message"]'], value: applicantData.coverLetter || '' },
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
                break;
              }
            }
          } catch (e) {
            // Continue
          }
        }
      }
    }

    // Helper function to fill fields
    async function fillFieldHelper(page, selectors, value) {
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              await element.click();
              await element.type(value, { delay: 50 });
              return 1;
            }
          }
        } catch (e) {
          // Continue
        }
      }
      return 0;
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
