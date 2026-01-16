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
    console.log(`[AutoApply] Chrome launched successfully`);
  }
  return browserInstance;
}

/**
 * Internal function: Attempts to automatically fill and submit a job application form
 */
async function autoApplyToJobInternal(
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
    
    // Anti-bot evasion: Simulate human behavior before interacting
    console.log('[AutoApply] Simulating human behavior...');
    
    // 1. Random mouse movements (with page closure detection)
    try {
      if (page.isClosed()) throw new Error('Page closed before mouse movement');
      await page.mouse.move(100 + Math.random() * 200, 100 + Math.random() * 200);
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
      if (page.isClosed()) throw new Error('Page closed during mouse movement');
      await page.mouse.move(300 + Math.random() * 400, 200 + Math.random() * 300);
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    } catch (err: any) {
      if (err.message.includes('Session closed') || err.message.includes('Page closed')) {
        throw new Error('Page closed unexpectedly during human behavior simulation');
      }
      throw err;
    }
    
    // 2. Scroll down and up to simulate reading
    await page.evaluate(() => {
      window.scrollTo({
        top: 300 + Math.random() * 200,
        behavior: 'smooth'
      });
    });
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    await page.evaluate(() => {
      window.scrollTo({
        top: 100 + Math.random() * 100,
        behavior: 'smooth'
      });
    });
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    // 3. Move mouse to random positions (simulate reading)
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        200 + Math.random() * 600,
        150 + Math.random() * 400
      );
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
    }

    // Step 0: Handle Solana jobs multi-step redirect flow
    if (jobUrl.includes('jobs.solana.com')) {
      console.log('[AutoApply] Detected Solana job - handling multi-step redirect flow...');
      
      try {
        // Step 1: Click "Apply now" button on Solana job page
        const applyNowButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          return buttons.find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('apply now') || text.includes('apply for this job');
          });
        });
        
        const applyNowElement = await applyNowButton.asElement();
        if (applyNowElement) {
          console.log('[AutoApply] Step 1: Clicking "Apply now" button...');
          await (applyNowElement as any).click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 2: Handle popup - Click "No thanks" or look for external link
          const currentUrl = page.url();
          console.log('[AutoApply] Step 2: Current URL after click:', currentUrl);
          
          // Look for external application link (Notion, Ashby, TeamTailor, etc.)
          const externalLink = await page.evaluate(() => {
            // Find links that go to external job boards
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
              const href = link.href || '';
              const text = link.textContent?.toLowerCase() || '';
              
              // Check for external job board domains
              if (href.includes('notion.site') || 
                  href.includes('ashbyhq.com') || 
                  href.includes('teamtailor.com') ||
                  href.includes('greenhouse.io') ||
                  href.includes('lever.co') ||
                  href.includes('workable.com')) {
                return href;
              }
              
              // Or look for "No thanks" / "Go to application" text
              if (text.includes('no thanks') || 
                  text.includes('take me to') || 
                  text.includes('go to application')) {
                return link.href;
              }
            }
            return null;
          });
          
          if (externalLink) {
            console.log('[AutoApply] Step 3: Found external link, navigating to:', externalLink);
            try {
              await page.goto(externalLink, { waitUntil: 'networkidle2', timeout: 15000 });
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (navError) {
              console.log('[AutoApply] Navigation error, waiting for page to stabilize:', navError);
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // Step 4: If on Notion page, look for another external link
            try {
              if (page.url().includes('notion.site')) {
              console.log('[AutoApply] Step 4: On Notion page, looking for final application link...');
              
              const finalLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                for (const link of links) {
                  const href = link.href || '';
                  if (href.includes('teamtailor.com') ||
                      href.includes('ashbyhq.com') ||
                      href.includes('greenhouse.io') ||
                      href.includes('lever.co')) {
                    return href;
                  }
                }
                return null;
              });
              
                if (finalLink) {
                  console.log('[AutoApply] Step 5: Found final application link:', finalLink);
                  try {
                    await page.goto(finalLink, { waitUntil: 'networkidle2', timeout: 15000 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } catch (navError2) {
                    console.log('[AutoApply] Final navigation error:', navError2);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                  }
                }
              }
            } catch (notionError) {
              console.log('[AutoApply] Notion page handling error:', notionError);
            }
            
            console.log('[AutoApply] Final URL:', page.url());
          }
        }
      } catch (error) {
        console.log('[AutoApply] Solana redirect handling failed, continuing with current page:', error);
      }
      
      // Additional wait for form to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

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

    // Helper: Type like a human with realistic behavior (ANTI-BOT EVASION)
    const humanType = async (element: any, text: string) => {
      // Check page is still open
      if (page!.isClosed()) throw new Error('Page closed before typing');
      
      // Move mouse to element with curved path (not straight line)
      try {
        const box = await element.boundingBox();
        if (box) {
          const targetX = box.x + box.width / 2 + (Math.random() - 0.5) * 30;
          const targetY = box.y + box.height / 2 + (Math.random() - 0.5) * 15;
          if (page!.isClosed()) throw new Error('Page closed before mouse move');
          await page!.mouse.move(targetX, targetY, { steps: 20 + Math.floor(Math.random() * 20) });
          await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
        }
      } catch (err: any) {
        if (err.message.includes('Session closed') || err.message.includes('Page closed')) {
          throw new Error('Page closed during mouse movement to element');
        }
        throw err;
      }
      
      // Click with human-like delay
      if (page!.isClosed()) throw new Error('Page closed before click');
      await element.click({ delay: 150 + Math.random() * 250 });
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
      
      // Type with realistic variable speed
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Longer pause every 5-10 characters (thinking/reading)
        if (i > 0 && i % (5 + Math.floor(Math.random() * 5)) === 0) {
          await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1200));
        }
        
        // Variable typing speed: faster for common patterns, slower for complex
        let delay = 80 + Math.random() * 150;
        if (/[A-Z]/.test(char)) delay += 50; // Slower for capitals
        if (/[0-9]/.test(char)) delay += 30; // Slower for numbers
        if (/[@._-]/.test(char)) delay += 40; // Slower for special chars
        
        await element.type(char, { delay });
        
        // Pause after spaces (between words)
        if (char === ' ' && Math.random() < 0.4) {
          await new Promise(resolve => setTimeout(resolve, 250 + Math.random() * 500));
        }
      }
      
      // Pause after finishing field (reviewing what was typed)
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 700));
    };   // Helper: Fill field by selectors with anti-bot delays
    const fillField = async (selectors: string[], value: string): Promise<number> => {
      if (!value) return 0;
      
      for (const selector of selectors) {
        try {
          const element = await page!.$(selector);
          if (element && await isElementVisible(element)) {
            // Random delay before interacting with field (thinking time)
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
            
            // Scroll element into view smoothly
            await page!.evaluate((el) => {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, element);
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));
            
            // Type with human behavior
            await humanType(element, value);
            
            // Random delay after filling (reviewing what was typed)
            await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1200));
            
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
    } else if (url.includes('teamtailor.com')) {
      atsType = 'teamtailor';
    }
    
    console.log(`[AutoApply] Detected ATS type: ${atsType}`);

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
      teamtailor: {
        firstName: ['input[name="first_name"]', 'input[placeholder*="First name"]'],
        lastName: ['input[name="last_name"]', 'input[placeholder*="Last name"]'],
        email: ['input[name="email"]', 'input[type="email"]'],
        phone: ['input[name="phone"]', 'input[type="tel"]'],
        linkedin: ['input[name="linkedin"]', 'input[placeholder*="LinkedIn"]'],
        github: ['input[name="github"]', 'input[placeholder*="GitHub"]'],
        coverLetter: ['textarea[name="message"]', 'textarea[placeholder*="message"]'],
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
 * Public function: Auto-apply with retry logic (2-3 attempts with exponential backoff)
 */
export async function autoApplyToJob(
  jobUrl: string,
  applicantData: JobApplicationData,
  maxRetries: number = 3
): Promise<ApplicationResult> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AutoApply] Attempt ${attempt}/${maxRetries} for ${jobUrl}`);
      const result = await autoApplyToJobInternal(jobUrl, applicantData);
      
      // If successful, return immediately
      if (result.success) {
        console.log(`[AutoApply] Success on attempt ${attempt}`);
        return result;
      }
      
      // If failed but not due to page closure, don't retry
      if (!result.message.includes('Page closed') && !result.message.includes('Session closed')) {
        console.log(`[AutoApply] Non-retryable error: ${result.message}`);
        return result;
      }
      
      lastError = result.message;
      
      // Exponential backoff: wait before retry
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[AutoApply] Page closure detected. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } catch (error: any) {
      lastError = error.message;
      
      // Check if it's a retryable error
      const isRetryable = error.message.includes('Page closed') || 
                         error.message.includes('Session closed') ||
                         error.message.includes('Navigation timeout');
      
      if (!isRetryable || attempt === maxRetries) {
        console.log(`[AutoApply] Failed after ${attempt} attempts: ${error.message}`);
        return {
          success: false,
          message: `Automation failed after ${attempt} attempts: ${error.message}. Manual review required.`
        };
      }
      
      // Exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[AutoApply] Retryable error. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return {
    success: false,
    message: `Automation failed after ${maxRetries} attempts: ${lastError}. Manual review required.`
  };
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
