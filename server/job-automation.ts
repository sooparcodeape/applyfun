import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import { proxyManager } from './proxy-manager';

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

// Random user agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Get ASOCKS proxy URL from proxy manager
 */
async function getProxyUrl(): Promise<string | null> {
  return await proxyManager.getProxyUrl();
}

/**
 * Get random user agent
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get or create browser instance with proxy
 */
async function getBrowser(useProxy = true): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    const proxyUrl = useProxy ? await getProxyUrl() : null;
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ];
    
    // Add proxy to browser args if configured
    if (proxyUrl) {
      const proxyArg = `--proxy-server=${proxyUrl}`;
      launchArgs.push(proxyArg);
      console.log(`[AutoApply] Launching Chrome with ASOCKS residential proxy`);
    } else {
      console.log(`[AutoApply] Launching Chrome without proxy`);
    }
    
    browserInstance = await puppeteer.launch({
      headless: true,
      args: launchArgs,
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

    // Set stealth mode - mimic real browser with random user agent
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);
    console.log(`[AutoApply] Using user agent: ${userAgent.substring(0, 50)}...`);
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
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
    
    // ENHANCED Anti-bot evasion: Extremely human-like behavior
    console.log('[AutoApply] Simulating realistic human behavior...');
    
    // 1. Initial page scan - Move mouse in reading pattern (F-pattern)
    try {
      if (page.isClosed()) throw new Error('Page closed before mouse movement');
      
      // Start top-left (like reading header)
      await page.mouse.move(50 + Math.random() * 100, 80 + Math.random() * 50, { steps: 15 + Math.floor(Math.random() * 10) });
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
      
      // Move right across header (F-pattern horizontal)
      await page.mouse.move(600 + Math.random() * 300, 100 + Math.random() * 80, { steps: 25 + Math.floor(Math.random() * 15) });
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));
      
      // Move down and left (F-pattern vertical)
      await page.mouse.move(120 + Math.random() * 100, 300 + Math.random() * 100, { steps: 20 + Math.floor(Math.random() * 15) });
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 700));
      
      // Move right again (second horizontal of F)
      await page.mouse.move(500 + Math.random() * 200, 320 + Math.random() * 80, { steps: 18 + Math.floor(Math.random() * 12) });
      await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 1000));
      
      // Random micro-movements (like hovering over text while reading)
      for (let i = 0; i < 4; i++) {
        const currentPos = await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
        await page.mouse.move(
          currentPos.x + (Math.random() - 0.5) * 150,
          currentPos.y + (Math.random() - 0.5) * 100,
          { steps: 8 + Math.floor(Math.random() * 7) }
        );
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
      }
    } catch (err: any) {
      if (err.message.includes('Session closed') || err.message.includes('Page closed')) {
        throw new Error('Page closed unexpectedly during human behavior simulation');
      }
      throw err;
    }
    
    // 2. Realistic scrolling behavior - Multiple small scrolls (like reading)
    const scrollSteps = 3 + Math.floor(Math.random() * 3); // 3-5 scroll actions
    for (let i = 0; i < scrollSteps; i++) {
      const scrollAmount = 200 + Math.random() * 300;
      await page.evaluate((amount) => {
        window.scrollBy({
          top: amount,
          behavior: 'smooth'
        });
      }, scrollAmount);
      
      // Variable pause between scrolls (reading time)
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
      
      // Sometimes scroll back up a bit (like re-reading)
      if (Math.random() < 0.3) {
        await page.evaluate(() => {
          window.scrollBy({
            top: -(50 + Math.random() * 100),
            behavior: 'smooth'
          });
        });
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));
      }
    }
    
    // 3. Scroll back to top (ready to fill form)
    await page.evaluate(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1000));
    
    // 4. Final mouse movements before interaction (locating form fields)
    for (let i = 0; i < 2; i++) {
      await page.mouse.move(
        300 + Math.random() * 800,
        200 + Math.random() * 400,
        { steps: 12 + Math.floor(Math.random() * 10) }
      );
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 700));
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
        
        // ENHANCED: Variable thinking pauses (every 4-8 characters)
        if (i > 0 && i % (4 + Math.floor(Math.random() * 4)) === 0) {
          await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 1000));
        }
        
        // Longer pause at punctuation (end of sentence)
        if (/[.!?]/.test(char)) {
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));
        }
        
        // ENHANCED: More realistic variable typing speed
        let delay = 60 + Math.random() * 120; // Base: 60-180ms per char
        if (/[A-Z]/.test(char)) delay += 40 + Math.random() * 30; // Slower for capitals
        if (/[0-9]/.test(char)) delay += 25 + Math.random() * 25; // Slower for numbers
        if (/[@._-]/.test(char)) delay += 35 + Math.random() * 30; // Slower for special chars
        
        // Occasional typos and corrections (very human!)
        if (Math.random() < 0.02 && i < text.length - 1) { // 2% chance of "typo"
          await element.type('x', { delay: 80 }); // Wrong key
          await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
          await element.press('Backspace', { delay: 120 }); // Correct it
          await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        }
        
        await element.type(char, { delay });
        
        // Pause after spaces (between words) - more frequent
        if (char === ' ' && Math.random() < 0.5) {
          await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
        }
      }
      
      // ENHANCED: Longer pause after finishing field (reviewing)
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1200));
      
      // Sometimes move mouse away and back (like checking other fields)
      if (Math.random() < 0.3) {
        const currentPos = await page!.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
        await page!.mouse.move(
          currentPos.x + (Math.random() - 0.5) * 300,
          currentPos.y + (Math.random() - 0.5) * 200,
          { steps: 10 }
        );
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
      }
    };   // Helper: Fill field by selectors with anti-bot delays
    const fillField = async (selectors: string[], value: string): Promise<number> => {
      if (!value) return 0;
      
      for (const selector of selectors) {
        try {
          const element = await page!.$(selector);
          if (element && await isElementVisible(element)) {
            // ENHANCED: Realistic thinking time before each field (capped at 8s total per app)
            await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1200));
            
            // Scroll element into view smoothly
            await page!.evaluate((el) => {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, element);
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 800));
            
            // Type with human behavior
            await humanType(element, value);
            
            // ENHANCED: Review delay after filling
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
            
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
 * Public function: Auto-apply with proxy rotation and retry logic
 * - Attempt 1: Use current proxy
 * - Attempt 2: Rotate to new proxy and retry
 * - Attempt 3: Rotate to another new proxy and retry
 * - After 3 failures: Return "Manual review required"
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
      
      // Close existing browser to force new proxy on retry
      if (attempt > 1 && browserInstance) {
        console.log(`[AutoApply] Closing browser to rotate proxy...`);
        await browserInstance.close();
        browserInstance = null;
      }
      
      const result = await autoApplyToJobInternal(jobUrl, applicantData);
      
      // If successful, report to proxy manager and return
      if (result.success) {
        console.log(`[AutoApply] Success on attempt ${attempt}`);
        await proxyManager.reportSuccess();
        return result;
      }
      
      // Report failure to proxy manager
      await proxyManager.reportFailure();
      
      // If failed due to anti-bot detection, rotate proxy and retry
      if (result.message.includes('anti-bot') || result.message.includes('did not submit')) {
        lastError = result.message;
        
        if (attempt < maxRetries) {
          console.log(`[AutoApply] Anti-bot detected. Rotating proxy and retrying...`);
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      
      // If failed but not due to anti-bot, don't retry
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
      await proxyManager.reportFailure();
      
      // Check if it's a retryable error
      const isRetryable = error.message.includes('Page closed') || 
                         error.message.includes('Session closed') ||
                         error.message.includes('Navigation timeout') ||
                         error.message.includes('anti-bot');
      
      if (!isRetryable || attempt === maxRetries) {
        console.log(`[AutoApply] Failed after ${attempt} attempts: ${error.message}`);
        return {
          success: false,
          message: `Automation failed after ${attempt} attempts with ${attempt} different proxies: ${error.message}. Manual review required.`
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
