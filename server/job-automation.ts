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
}

export interface ApplicationResult {
  success: boolean;
  message: string;
  screenshotPath?: string;
}

/**
 * Attempts to automatically fill and submit a job application form using Browserless.io
 * This replaces local Puppeteer with cloud-based browser automation
 */
export async function autoApplyToJob(
  jobUrl: string,
  applicantData: JobApplicationData
): Promise<ApplicationResult> {
  try {
    const browserlessApiKey = process.env.BROWSERLESS_API_KEY;
    
    if (!browserlessApiKey) {
      throw new Error('BROWSERLESS_API_KEY environment variable is not set');
    }

    // Build the Puppeteer script that will run on Browserless
    const automationScript = buildAutomationScript(jobUrl, applicantData);

    console.log(`[Automation] Sending job application to Browserless for ${jobUrl}`);

    // Send the script to Browserless Function API
    const response = await axios.post(
      `https://production-sfo.browserless.io/function?token=${browserlessApiKey}`,
      automationScript,
      {
        headers: {
          'Content-Type': 'application/javascript',
        },
        timeout: 120000, // 2 minute timeout
      }
    );

    // Parse the response from Browserless
    const result = response.data;

    if (result.success) {
      return {
        success: true,
        message: result.message || 'Application submitted successfully!',
        screenshotPath: result.screenshotPath,
      };
    } else {
      return {
        success: false,
        message: result.message || 'Application failed',
      };
    }

  } catch (error: any) {
    console.error('[Job Automation] Error:', error);
    
    if (error.response) {
      return {
        success: false,
        message: `Browserless API error: ${error.response.status} - ${error.response.statusText}`,
      };
    }
    
    return {
      success: false,
      message: `Automation failed: ${error.message}`,
    };
  }
}

/**
 * Build the Puppeteer automation script that will be executed on Browserless
 */
function buildAutomationScript(jobUrl: string, applicantData: JobApplicationData): string {
  // Escape strings for JavaScript
  const escapeJs = (str: string) => JSON.stringify(str);
  
  return `
export default async function ({ page }) {
  try {
    const jobUrl = ${escapeJs(jobUrl)};
    const applicantData = ${JSON.stringify(applicantData)};
    
    // Navigate to job application URL
    await page.goto(jobUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Detect ATS platform
    const atsType = await detectATSPlatform(page);
    console.log(\`Detected ATS: \${atsType}\`);

    // Detect and fill form fields
    const fieldsFound = await detectAndFillFormFields(page, applicantData, atsType);

    if (fieldsFound === 0) {
      return {
        data: {
          success: false,
          message: 'No application form fields detected on this page. Manual application required.',
        },
        type: 'application/json',
      };
    }

    // Look for submit button
    const submitButton = await findSubmitButton(page);

    if (!submitButton) {
      return {
        data: {
          success: false,
          message: \`Filled \${fieldsFound} fields but could not find submit button. Manual review required.\`,
        },
        type: 'application/json',
      };
    }

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
        data: {
          success: true,
          message: 'Application submitted successfully!',
        },
        type: 'application/json',
      };
    }

    return {
      data: {
        success: false,
        message: 'Form submitted but success confirmation not detected. Please verify manually.',
      },
      type: 'application/json',
    };

  } catch (error) {
    return {
      data: {
        success: false,
        message: \`Automation failed: \${error.message}\`,
      },
      type: 'application/json',
    };
  }
}

// Helper functions (embedded in the script)

async function detectATSPlatform(page) {
  try {
    const url = page.url().toLowerCase();
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.toLowerCase());
    
    if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io') || bodyHtml.includes('greenhouse')) {
      return 'greenhouse';
    }
    if (url.includes('lever.co') || url.includes('jobs.lever.co') || bodyHtml.includes('lever-frame')) {
      return 'lever';
    }
    if (url.includes('workable.com') || url.includes('apply.workable.com') || bodyHtml.includes('workable')) {
      return 'workable';
    }
    if (url.includes('ashbyhq.com') || url.includes('jobs.ashbyhq.com') || bodyHtml.includes('ashby')) {
      return 'ashby';
    }
    if (url.includes('bamboohr.com') || bodyHtml.includes('bamboohr')) {
      return 'bamboohr';
    }
    if (url.includes('jobvite.com') || bodyHtml.includes('jobvite')) {
      return 'jobvite';
    }
    if (url.includes('smartrecruiters.com') || bodyHtml.includes('smartrecruiters')) {
      return 'smartrecruiters';
    }
    
    return 'generic';
  } catch (error) {
    return 'generic';
  }
}

async function detectAndFillFormFields(page, data, atsType = 'generic') {
  let fieldsFilledCount = 0;

  const atsSelectors = {
    greenhouse: {
      firstName: ['#first_name', 'input[name="job_application[first_name]"]'],
      lastName: ['#last_name', 'input[name="job_application[last_name]"]'],
      email: ['#email', 'input[name="job_application[email]"]'],
      phone: ['#phone', 'input[name="job_application[phone]"]'],
      linkedin: ['input[name="job_application[linkedin_url]"]'],
      github: ['input[name="job_application[github_url]"]'],
      coverLetter: ['#cover_letter_text', 'textarea[name="job_application[cover_letter]"]'],
    },
    lever: {
      name: ['input[name="name"]', '.application-name input'],
      email: ['input[name="email"]', '.application-email input'],
      phone: ['input[name="phone"]', '.application-phone input'],
      linkedin: ['input[name="urls[LinkedIn]"]'],
      github: ['input[name="urls[GitHub]"]'],
      coverLetter: ['textarea[name="comments"]', '.application-comments textarea'],
    },
    workable: {
      firstName: ['input[name="candidate[firstname]"]'],
      lastName: ['input[name="candidate[lastname]"]'],
      email: ['input[name="candidate[email]"]'],
      phone: ['input[name="candidate[phone]"]'],
      linkedin: ['input[name="candidate[social_linkedin]"]'],
      github: ['input[name="candidate[social_github]"]'],
      coverLetter: ['textarea[name="candidate[cover_letter]"]'],
    },
  };

  // Try ATS-specific selectors first
  if (atsType !== 'generic' && atsSelectors[atsType]) {
    const atsMapping = atsSelectors[atsType];
    
    if (atsMapping.firstName) {
      fieldsFilledCount += await fillField(page, atsMapping.firstName, data.fullName.split(' ')[0]);
    }
    if (atsMapping.lastName) {
      fieldsFilledCount += await fillField(page, atsMapping.lastName, data.fullName.split(' ').slice(1).join(' '));
    }
    if (atsMapping.name) {
      fieldsFilledCount += await fillField(page, atsMapping.name, data.fullName);
    }
    if (atsMapping.email) {
      fieldsFilledCount += await fillField(page, atsMapping.email, data.email);
    }
    if (atsMapping.phone) {
      fieldsFilledCount += await fillField(page, atsMapping.phone, data.phone);
    }
    if (atsMapping.linkedin && data.linkedinUrl) {
      fieldsFilledCount += await fillField(page, atsMapping.linkedin, data.linkedinUrl);
    }
    if (atsMapping.github && data.githubUrl) {
      fieldsFilledCount += await fillField(page, atsMapping.github, data.githubUrl);
    }
    if (atsMapping.coverLetter && data.coverLetter) {
      fieldsFilledCount += await fillField(page, atsMapping.coverLetter, data.coverLetter);
    }
    
    if (fieldsFilledCount > 0) {
      return fieldsFilledCount;
    }
  }

  // Fallback to generic selectors
  const fieldMappings = [
    { selectors: ['input[name*="name"]', 'input[id*="name"]', 'input[placeholder*="name"]'], value: data.fullName },
    { selectors: ['input[name*="first"]', 'input[id*="first"]'], value: data.fullName.split(' ')[0] },
    { selectors: ['input[name*="last"]', 'input[id*="last"]'], value: data.fullName.split(' ').slice(1).join(' ') },
    { selectors: ['input[type="email"]', 'input[name*="email"]', 'input[id*="email"]'], value: data.email },
    { selectors: ['input[type="tel"]', 'input[name*="phone"]', 'input[id*="phone"]'], value: data.phone },
    { selectors: ['input[name*="location"]', 'input[id*="location"]', 'input[name*="city"]'], value: data.location },
    { selectors: ['input[name*="linkedin"]', 'input[id*="linkedin"]'], value: data.linkedinUrl || '' },
    { selectors: ['input[name*="github"]', 'input[id*="github"]'], value: data.githubUrl || '' },
    { selectors: ['textarea[name*="cover"]', 'textarea[id*="cover"]'], value: data.coverLetter || '' },
  ];

  for (const mapping of fieldMappings) {
    if (mapping.value) {
      fieldsFilledCount += await fillField(page, mapping.selectors, mapping.value);
    }
  }

  return fieldsFilledCount;
}

async function fillField(page, selectors, value) {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click({ clickCount: 3 });
        await element.type(value, { delay: 50 });
        return 1;
      }
    } catch (error) {
      continue;
    }
  }
  return 0;
}

async function findSubmitButton(page) {
  const buttonSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:contains("Submit")',
    'button:contains("Apply")',
    'button:contains("Send")',
    'a:contains("Submit")',
    'a:contains("Apply")',
  ];

  for (const selector of buttonSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        const isVisible = await button.isIntersectingViewport();
        if (isVisible) {
          return button;
        }
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function detectSuccessMessage(page) {
  try {
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const successKeywords = [
      'thank you',
      'success',
      'submitted',
      'received',
      'application received',
      'we\\'ll be in touch',
      'hear from us',
    ];

    return successKeywords.some(keyword => bodyText.includes(keyword));
  } catch (error) {
    return false;
  }
}
`;
}
