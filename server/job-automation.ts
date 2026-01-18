import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import { proxyManager } from './proxy-manager';
import { getATSFieldMappings, getAllFieldSelectors, type ATSFieldMappings } from './ats-field-mappings';
import { createApplicationLog } from './db';
import { detectAllFormFields, analyzeFormFields, getFormAnalysisSummary } from './field-detector';

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
  twitterUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
  // Additional fields for cover letter generation
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  writingSample?: string;
  skills?: string[];
  experience?: string;
  // ATS fields from profile
  currentCompany?: string;
  currentTitle?: string;
  yearsOfExperience?: string;
  workAuthorization?: string;
  howDidYouHear?: string;
  availableStartDate?: string;
  // Ashby-specific fields
  university?: string;
  sponsorshipRequired?: boolean;
  fintechExperience?: boolean;
  fintechExperienceDescription?: string;
  // EEO fields
  gender?: string;
  race?: string;
  veteranStatus?: string;
  // Additional fields
  openToRelocation?: boolean;
  ableToWorkInOffice?: boolean;
}

export interface ApplicationResult {
  success: boolean;
  message: string;
  screenshotUrl?: string;
  fieldsFilledCount?: number;
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
 * Parse proxy URL to extract credentials and server
 */
function parseProxyUrl(proxyUrl: string): { server: string; username: string; password: string } | null {
  try {
    // Format: http://username:password@ip:port
    const match = proxyUrl.match(/^https?:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!match) return null;
    
    return {
      username: match[1],
      password: match[2],
      server: match[3], // ip:port
    };
  } catch (error) {
    console.error('[AutoApply] Failed to parse proxy URL:', error);
    return null;
  }
}

/**
 * Get or create browser instance - uses Browserless.io in production, local Chrome in dev
 */
async function getBrowser(useProxy = true): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    const browserlessApiKey = process.env.BROWSERLESS_API_KEY;
    
    console.log(`[AutoApply] ========== BROWSER SETUP ==========`);
    console.log(`[AutoApply] BROWSERLESS_API_KEY configured: ${!!browserlessApiKey}`);
    console.log(`[AutoApply] Key prefix: ${browserlessApiKey ? browserlessApiKey.substring(0, 8) + '...' : 'N/A'}`);
    
    // Use Browserless.io in production (when API key is set)
    if (browserlessApiKey) {
      const wsEndpoint = `wss://production-sfo.browserless.io/?token=${browserlessApiKey}&stealth`;
      console.log(`[AutoApply] Connecting to Browserless.io...`);
      console.log(`[AutoApply] WebSocket endpoint: wss://chrome.browserless.io?token=***&stealth=true`);
      
      try {
        browserInstance = await puppeteer.connect({
          browserWSEndpoint: wsEndpoint,
        });
        console.log(`[AutoApply] ✓ Connected to Browserless.io successfully`);
      } catch (connError: any) {
        console.error(`[AutoApply] ✗ Browserless.io connection failed:`, connError.message);
        throw new Error(`Browserless.io connection failed: ${connError.message}`);
      }
    } else {
      // Local Chrome for development
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
        const proxyConfig = parseProxyUrl(proxyUrl);
        if (proxyConfig) {
          const proxyArg = `--proxy-server=${proxyConfig.server}`;
          launchArgs.push(proxyArg);
          console.log(`[AutoApply] Launching Chrome with ASOCKS residential proxy: ${proxyConfig.server}`);
        } else {
          console.log(`[AutoApply] Failed to parse proxy URL, launching without proxy`);
        }
      } else {
        console.log(`[AutoApply] No proxy configured, launching Chrome without proxy`);
      }
      
      browserInstance = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: launchArgs,
      });
      console.log(`[AutoApply] Chrome launched successfully`);
    }
  }
  return browserInstance;
}

/**
 * Internal function: Attempts to automatically fill and submit a job application form
 */
async function autoApplyToJobInternal(
  jobUrl: string,
  applicantData: JobApplicationData,
  userId?: number,
  jobId?: number,
  applicationId?: number
): Promise<ApplicationResult> {
  let page: Page | null = null;
  
  // Import field detection utilities
  const { detectAllFormFields, analyzeFormFields, getFormAnalysisSummary } = await import('./field-detector');
  
  // Tracking variables for logging
  const startTime = Date.now();
  const filledSelectors = new Set<string>();
  let atsType = 'generic';
  let resumeUploadSuccess = false;
  let resumeSelector = 'none';
  let resumeFileSize = 0;
  let submitClicked = false;
  let submitSelector = 'none';
  let proxyInfo = await proxyManager.getCurrentProxyInfo();
  
  try {
    console.log(`[AutoApply] ========== STARTING APPLICATION ==========`);
    console.log(`[AutoApply] Job URL: ${jobUrl}`);
    console.log(`[AutoApply] Applicant: ${applicantData.fullName} (${applicantData.email})`);
    console.log(`[AutoApply] Resume URL: ${applicantData.resumeUrl || 'NOT PROVIDED'}`);
    
    console.log(`[AutoApply] Step 1: Getting browser instance...`);
    const browser = await getBrowser();
    console.log(`[AutoApply] ✓ Browser obtained`);
    
    console.log(`[AutoApply] Step 2: Creating new page...`);
    page = await browser.newPage();
    console.log(`[AutoApply] ✓ New page created`);
    
    // Authenticate with proxy if configured
    const proxyUrl = await getProxyUrl();
    if (proxyUrl) {
      console.log(`[AutoApply] Step 3: Configuring proxy authentication...`);
      const proxyConfig = parseProxyUrl(proxyUrl);
      if (proxyConfig) {
        await page.authenticate({
          username: proxyConfig.username,
          password: proxyConfig.password,
        });
        console.log(`[AutoApply] ✓ Authenticated with ASOCKS proxy`);
      }
    } else {
      console.log(`[AutoApply] Step 3: No proxy configured, skipping...`);
    }

    // Set stealth mode - mimic real browser with random user agent
    console.log(`[AutoApply] Step 4: Setting up stealth mode...`);
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);
    console.log(`[AutoApply] ✓ User agent: ${userAgent.substring(0, 50)}...`);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });
    console.log(`[AutoApply] ✓ Viewport and headers configured`);

    // Navigate to job application URL
    console.log(`[AutoApply] Step 5: Navigating to ${jobUrl}...`);
    await page.goto(jobUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    const currentUrl = page.url();
    console.log(`[AutoApply] ✓ Page loaded. Current URL: ${currentUrl}`);

    // Wait for dynamic content with human-like delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
    
    // Helper to safely execute page operations (handles frame detachment)
    const safePageOp = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        if (!page || page.isClosed()) return fallback;
        return await operation();
      } catch (err: any) {
        if (err.message?.includes('detached') || err.message?.includes('Session closed') || err.message?.includes('Target closed')) {
          console.log('[AutoApply] Frame detached, continuing...');
          return fallback;
        }
        throw err;
      }
    };
    
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
      if (err.message?.includes('detached') || err.message?.includes('Session closed') || err.message?.includes('Page closed') || err.message?.includes('Target closed')) {
        console.log('[AutoApply] Frame detached during human simulation, continuing...');
      } else {
        throw err;
      }
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
    }    // Helper: Fill field by selectors with anti-bot delays
    const fillField = async (selectors: string[], value: string, fieldName?: string): Promise<number> => {
      if (!value) return 0;
      
      // Tier 1: Try CSS selectors first (fast, ATS-specific)
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
            
            // Track filled selector for logging
            filledSelectors.add(selector);
            
            console.log(`[AutoApply] ✅ Tier 1 (CSS): ${fieldName || 'field'} filled with selector: ${selector}`);
            return 1;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      // Tier 2: Try DOM traversal with label matching (robust for dynamic forms)
      if (fieldName) {
        try {
          const { fillFieldByLabel, fillTextareaByLabel, selectDropdownByLabel, selectRadioByLabel } = await import('./dom-field-detector');
          
          // Map field names to common label texts
          const labelMappings: Record<string, string[]> = {
            firstName: ['first name', 'first', 'given name', 'forename'],
            lastName: ['last name', 'last', 'surname', 'family name'],
            fullName: ['full name', 'name', 'your name', 'full legal name'],
            email: ['email', 'email address', 'e-mail'],
            phone: ['phone', 'phone number', 'mobile', 'telephone'],
            location: ['location', 'city', 'address', 'where are you based'],
            linkedin: ['linkedin', 'linkedin url', 'linkedin profile'],
            github: ['github', 'github url', 'github profile'],
            twitter: ['twitter', 'twitter handle', 'twitter url', 'x profile'],
            portfolio: ['portfolio', 'website', 'personal website', 'portfolio url'],
            currentCompany: ['current company', 'company', 'current employer', 'employer'],
            currentTitle: ['current title', 'job title', 'current role', 'position'],
            yearsOfExperience: ['years of experience', 'experience', 'years experience', 'how many years'],
            workAuthorization: ['work authorization', 'work auth', 'visa status', 'authorized to work'],
            howDidYouHear: ['how did you hear', 'referral', 'how did you find', 'source'],
            availableStartDate: ['start date', 'available', 'when can you start', 'availability'],
            coverLetter: ['cover letter', 'why', 'additional info', 'tell us about yourself'],
            university: ['university', 'college', 'school', 'which university', 'which one did you earn', 'degree'],
            sponsorshipRequired: ['sponsorship', 'require sponsorship', 'employer sponsorship', 'will you now or in the future require'],
            willingToRelocate: ['relocation', 'relocate', 'open to relocation', 'willing to relocate', 'hybrid role'],
            fintechExperience: ['fintech', 'payments', 'crypto', 'stablecoins', 'blockchain', 'experience within fintech'],
            fintechExperienceDescription: ['describe your experience', 'please describe', 'if so please describe', 'what made you apply'],
          };
          
          const possibleLabels = labelMappings[fieldName] || [fieldName];
          
          for (const label of possibleLabels) {
            // Try as regular input
            const inputFilled = await fillFieldByLabel(page!, label, value, humanType);
            if (inputFilled) {
              console.log(`[AutoApply] ✅ Tier 2 (DOM): ${fieldName} filled via label "${label}"`);
              return 1;
            }
            
            // Try as textarea
            const textareaFilled = await fillTextareaByLabel(page!, label, value, humanType);
            if (textareaFilled) {
              console.log(`[AutoApply] ✅ Tier 2 (DOM): ${fieldName} filled via textarea label "${label}"`);
              return 1;
            }
            
            // Try as radio button (for boolean/Yes-No questions)
            if (['sponsorshipRequired', 'fintechExperience', 'willingToRelocate'].includes(fieldName)) {
              const radioFilled = await selectRadioByLabel(page!, label, value);
              if (radioFilled) {
                console.log(`[AutoApply] ✅ Tier 2 (DOM): ${fieldName} selected via radio label "${label}"`);
                return 1;
              }
            }
            
            // Try as dropdown (for workAuthorization, howDidYouHear, etc.)
            if (['workAuthorization', 'howDidYouHear', 'yearsOfExperience'].includes(fieldName)) {
              const dropdownFilled = await selectDropdownByLabel(page!, label, value);
              if (dropdownFilled) {
                console.log(`[AutoApply] ✅ Tier 2 (DOM): ${fieldName} selected via dropdown label "${label}"`);
                return 1;
              }
            }
          }
        } catch (domError) {
          console.log(`[AutoApply] Tier 2 (DOM) failed for ${fieldName}:`, domError);
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
    
    // Prioritize URL-based detection (more reliable) over body HTML
    atsType = 'generic'; // Update tracking variable
    if (url.includes('ashbyhq.com')) {
      atsType = 'ashby';
    } else if (url.includes('greenhouse.io')) {
      atsType = 'greenhouse';
    } else if (url.includes('lever.co')) {
      atsType = 'lever';
    } else if (url.includes('workable.com')) {
      atsType = 'workable';
    } else if (url.includes('linkedin.com/jobs')) {
      atsType = 'linkedin';
    } else if (url.includes('teamtailor.com')) {
      atsType = 'teamtailor';
    } else if (bodyHtml.includes('greenhouse')) {
      atsType = 'greenhouse';
    } else if (bodyHtml.includes('lever-frame')) {
      atsType = 'lever';
    } else if (bodyHtml.includes('workable')) {
      atsType = 'workable';
    }
    
    console.log(`[AutoApply] Detected ATS type: ${atsType}`);

    // Step 3: Fill form fields using comprehensive ATS-specific mappings
    let fieldsFilledCount = 0;

    // Use Ashby-specific automation for Ashby forms
    if (atsType === 'ashby') {
      console.log('[AutoApply] Using optimized Ashby-specific automation...');
      const { fillAshbyForm, submitAshbyForm } = await import('./ashby-automation');
      
      const ashbyData = {
        fullName: applicantData.fullName,
        email: applicantData.email,
        phone: applicantData.phone,
        location: applicantData.location || '',
        linkedinUrl: applicantData.linkedinUrl,
        githubUrl: applicantData.githubUrl,
        twitterUrl: applicantData.twitterUrl,
        portfolioUrl: applicantData.portfolioUrl,
        currentCompany: applicantData.currentCompany,
        currentTitle: applicantData.currentTitle,
        university: applicantData.university,
        resumeUrl: applicantData.resumeUrl,
        sponsorshipRequired: applicantData.sponsorshipRequired,
        fintechExperience: applicantData.fintechExperience,
        fintechExperienceDescription: applicantData.fintechExperienceDescription,
        yearsOfExperience: applicantData.yearsOfExperience,
        whyThisRole: applicantData.fintechExperienceDescription,
        workAuthorization: applicantData.workAuthorization === 'yes',
        willingToRelocate: true,
        // EEO fields
        gender: (applicantData as any).gender,
        race: (applicantData as any).race,
        veteranStatus: (applicantData as any).veteranStatus,
        // Additional fields
        visaType: (applicantData as any).visaType,
        pronouns: (applicantData as any).pronouns,
        openToRelocation: (applicantData as any).openToRelocation,
        ableToWorkInOffice: (applicantData as any).ableToWorkInOffice,
      };
      
      const result = await fillAshbyForm(page, ashbyData);
      fieldsFilledCount = result.fieldsFilledCount;
      
      if (fieldsFilledCount >= 5) {
        // Submit the form
        const submitted = await submitAshbyForm(page);
        
        if (submitted) {
          await page.close();
          return {
            success: true,
            message: `Successfully submitted Ashby application! Filled ${fieldsFilledCount} fields.`,
            fieldsFilledCount,
          };
        }
      }
      
      // If Ashby automation didn't work well, fall through to generic
      if (fieldsFilledCount < 3) {
        console.log('[AutoApply] Ashby automation filled few fields, trying generic...');
      } else {
        await page.close();
        return {
          success: false,
          message: `Filled ${fieldsFilledCount} fields but could not submit. Manual review required.`,
          fieldsFilledCount,
        };
      }
    }

    // Get field mappings for detected ATS platform
    const fieldMappings: ATSFieldMappings = atsType !== 'generic' 
      ? getATSFieldMappings(atsType)
      : getAllFieldSelectors(); // Use all selectors as fallback
    
    console.log(`[AutoApply] Using field mappings for: ${atsType}`);
    
    // Split name for platforms that use separate first/last name fields
    const nameParts = applicantData.fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Fallback to firstName if no lastName
    
    // Map applicant data to field values (no defaults - use real profile data only)
    const fieldValues: Record<string, string> = {
      firstName,
      lastName,
      fullName: applicantData.fullName,
      email: applicantData.email,
      phone: applicantData.phone,
      location: applicantData.location || '',
      linkedin: applicantData.linkedinUrl || '',
      github: applicantData.githubUrl || '',
      twitter: applicantData.twitterUrl || '',
      portfolio: applicantData.portfolioUrl || '',
      coverLetter: applicantData.coverLetter || '',
      currentCompany: applicantData.currentCompany || '',
      currentTitle: applicantData.currentTitle || '',
      yearsOfExperience: applicantData.yearsOfExperience || '',
      workAuthorization: applicantData.workAuthorization || '',
      howDidYouHear: applicantData.howDidYouHear || '',
      availableStartDate: applicantData.availableStartDate || '',
      university: applicantData.university || '',
      sponsorshipRequired: applicantData.sponsorshipRequired ? 'Yes' : 'No',
      fintechExperience: applicantData.fintechExperience ? 'Yes' : 'No',
      fintechExperienceDescription: applicantData.fintechExperienceDescription || '',
    };
    
    // Sort fields by priority (higher priority first)
    const sortedFields = Object.entries(fieldMappings)
      .filter(([fieldName]) => fieldName !== 'resume') // Handle resume separately
      .sort(([, a], [, b]) => b.priority - a.priority);
    
    // Fill all available fields
    console.log(`[AutoApply] Attempting to fill ${sortedFields.length} field types...`);
    const skippedFields: string[] = [];
    const attemptedFields: string[] = [];
    const filledFields: string[] = [];
    
    for (const [fieldName, mapping] of sortedFields) {
      const value = fieldValues[fieldName];
      if (value) {
        attemptedFields.push(fieldName);
        const filled = await fillField(mapping.selectors, value, fieldName);
        if (filled > 0) {
          filledFields.push(fieldName);
          console.log(`[AutoApply] ✅ Filled ${fieldName}: ${value.substring(0, 30)}...`);
        } else {
          console.log(`[AutoApply] ⚠️ Field ${fieldName} not found on page (tried ${mapping.selectors.length} CSS selectors + DOM traversal)`);
        }
        fieldsFilledCount += filled;
      } else {
        skippedFields.push(fieldName);
      }
    }
    
    console.log(`[AutoApply] Field Summary: ${filledFields.length} filled, ${attemptedFields.length - filledFields.length} not found, ${skippedFields.length} skipped (no data)`);
    if (skippedFields.length > 0) {
      console.log(`[AutoApply] Skipped fields (no user data): ${skippedFields.join(', ')}`);
    }

    // Step 4: Handle resume file upload with detailed tracking
    
    if (applicantData.resumeUrl && fieldMappings.resume) {
      try {
        console.log(`[Resume Upload] Starting for ATS: ${atsType}`);
        console.log(`[Resume Upload] Resume URL: ${applicantData.resumeUrl}`);
        console.log(`[Resume Upload] Available selectors: ${fieldMappings.resume.selectors.length}`);
        
        // Use ATS-specific resume selectors
        const fileInputSelectors = fieldMappings.resume.selectors;

        // Tier 1: Try CSS selectors first
        let fileInput = null;
        let selectorIndex = 0;
        for (const selector of fileInputSelectors) {
          selectorIndex++;
          console.log(`[Resume Upload] Tier 1: Trying CSS selector ${selectorIndex}/${fileInputSelectors.length}: ${selector}`);
          fileInput = await page.$(selector);
          if (fileInput) {
            resumeSelector = selector;
            console.log(`[Resume Upload] ✅ Tier 1: Found resume input with CSS selector: ${selector}`);
            break;
          }
        }

        // Tier 2: Try DOM traversal with label matching
        if (!fileInput) {
          console.log(`[Resume Upload] Tier 1 failed, trying Tier 2 (DOM traversal)...`);
          try {
            const { findFileInputByLabel } = await import('./dom-field-detector');
            const resumeLabels = ['resume', 'upload resume', 'cv', 'upload cv', 'attach resume'];
            
            for (const label of resumeLabels) {
              fileInput = await findFileInputByLabel(page, label);
              if (fileInput) {
                resumeSelector = `DOM:${label}`;
                console.log(`[Resume Upload] ✅ Tier 2: Found resume input via label "${label}"`);
                break;
              }
            }
          } catch (domError) {
            console.log(`[Resume Upload] Tier 2 (DOM) error:`, domError);
          }
        }

        if (!fileInput) {
          console.log(`[Resume Upload] ❌ No resume input found after trying ${fileInputSelectors.length} CSS selectors + DOM traversal`);
        }

        if (fileInput) {
          // Download resume from S3 to temp file
          const axios = await import('axios');
          const fs = await import('fs');
          const path = await import('path');
          const os = await import('os');
          
          console.log(`[Resume Upload] Downloading resume from S3...`);
          const downloadStart = Date.now();
          const response = await axios.default.get(applicantData.resumeUrl, { responseType: 'arraybuffer' });
          const downloadTime = Date.now() - downloadStart;
          
          resumeFileSize = response.data.length;
          const fileSizeKB = (resumeFileSize / 1024).toFixed(2);
          console.log(`[Resume Upload] Downloaded ${fileSizeKB} KB in ${downloadTime}ms`);
          
          const tempFilePath = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`);
          fs.writeFileSync(tempFilePath, response.data);
          console.log(`[Resume Upload] Saved to temp file: ${tempFilePath}`);
          
          // Upload file
          console.log(`[Resume Upload] Uploading to form...`);
          const uploadStart = Date.now();
          await (fileInput as any).uploadFile(tempFilePath);
          const uploadTime = Date.now() - uploadStart;
          console.log(`[Resume Upload] Upload completed in ${uploadTime}ms`);
          
          fieldsFilledCount++;
          resumeUploadSuccess = true;
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
          console.log(`[Resume Upload] Temp file cleaned up`);
          
          console.log(`[Resume Upload] ✅ SUCCESS - ATS: ${atsType}, Selector: ${resumeSelector}, Size: ${fileSizeKB}KB`);
        }
      } catch (error: any) {
        console.error(`[Resume Upload] ❌ FAILED - ATS: ${atsType}, Error: ${error.message}`);
        console.error(`[Resume Upload] Stack trace:`, error.stack);
        // Continue even if resume upload fails
      }
    } else if (!applicantData.resumeUrl) {
      console.log(`[Resume Upload] ⚠️ SKIPPED - No resume URL in applicant profile`);
    } else if (!fieldMappings.resume) {
      console.log(`[Resume Upload] ⚠️ SKIPPED - No resume field mapping for ATS: ${atsType}`);
    }

    // Fallback 1: Try vision-based field detection if few fields filled
    if (fieldsFilledCount <= 3) {
      console.log('[AutoApply] Few fields filled, trying vision-based detection...');
      try {
        const { detectFieldsFromForm } = await import('./vision-field-detector');
        
        // Capture screenshot
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
        const formHtml = await page.content();
        
        // Analyze form with vision (uses cache if available)
        const visionResult = await detectFieldsFromForm(screenshot, formHtml, jobUrl);
        console.log(`[AutoApply] Vision detected ${visionResult.fields.length} fields`);
        
        // Try to fill fields using vision-detected selectors
        for (const field of visionResult.fields) {
          const value = fieldValues[field.fieldName];
          if (value && field.confidence > 0.7) {
            const filled = await fillField([field.selector], value);
            if (filled > 0) {
              fieldsFilledCount++;
              console.log(`[AutoApply] ✅ Vision-filled ${field.fieldName} (confidence: ${field.confidence})`);
            }
          }
        }
      } catch (visionError: any) {
        console.error('[AutoApply] Vision detection failed:', visionError.message);
      }
    }
    
    // Fallback 2: Generic selectors if still no fields filled
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

    // Step 4: Find and click Submit button with human-like behavior
    console.log('[AutoApply] Looking for Submit button...');
    
    // Wait a bit before submitting (like reviewing the form)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    // Scroll to bottom where Submit button usually is
    await page.evaluate(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    });
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    // Try to find Submit button
    const submitButtonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[id*="submit"]',
      'button[class*="submit"]',
      'button[data-testid*="submit"]',
      'button[aria-label*="submit"]',
      'a[class*="submit"]',
      'button[name="commit"]', // Greenhouse specific
      'button.submit-button',
      'input.submit-button',
    ];
    
    let submitButton = null;
    for (const selector of submitButtonSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await isElementVisible(element)) {
          submitButton = element;
          submitSelector = selector;
          console.log(`[AutoApply] Found Submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    // Fallback: Find button by text content
    if (!submitButton) {
      submitButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a'));
        return buttons.find(btn => {
          const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
          return text.includes('submit') || text.includes('apply') || text.includes('send application');
        });
      }).then(handle => handle.asElement());
      
      if (submitButton) {
        submitSelector = 'text-content-match';
        console.log('[AutoApply] Found Submit button by text content');
      }
    }
    
    if (!submitButton) {
      await page.close();
      return {
        success: false,
        message: `Filled ${fieldsFilledCount} fields but could not find Submit button. Manual review required.`,
      };
    }
    
    // Move mouse to Submit button with realistic movement
    try {
      const buttonBox = await submitButton.boundingBox();
      if (buttonBox) {
        // Move to button with curved path
        const targetX = buttonBox.x + buttonBox.width / 2 + (Math.random() - 0.5) * 20;
        const targetY = buttonBox.y + buttonBox.height / 2 + (Math.random() - 0.5) * 10;
        
        await page.mouse.move(targetX, targetY, { steps: 25 + Math.floor(Math.random() * 15) });
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 800));
        
        // Hover over button (like hesitating)
        await page.mouse.move(
          targetX + (Math.random() - 0.5) * 5,
          targetY + (Math.random() - 0.5) * 5,
          { steps: 3 }
        );
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1000));
      }
    } catch (e) {
      console.log('[AutoApply] Could not move mouse to button, will click directly');
    }
    
    // Click Submit button
    try {
      console.log('[AutoApply] Clicking Submit button...');
      await (submitButton as any).click();
      submitClicked = true;
      
      // Wait for submission to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if we got redirected to success page
      const finalUrl = page.url().toLowerCase();
      const isSuccessPage = finalUrl.includes('thank') || 
                           finalUrl.includes('success') || 
                           finalUrl.includes('confirmation') ||
                           finalUrl.includes('submitted');
      
      // Check page content for success indicators
      const pageText = await page.evaluate(() => document.body.textContent?.toLowerCase() || '');
      const hasSuccessMessage = pageText.includes('thank you') ||
                               pageText.includes('application submitted') ||
                               pageText.includes('we received your application') ||
                               pageText.includes('successfully submitted');
      
      // Detect all form fields before closing page
      const allFields = await detectAllFormFields(page);
      const formAnalysis = analyzeFormFields(allFields, filledSelectors);
      const executionTime = Date.now() - startTime;
      
      console.log(`[AutoApply] Form Analysis: ${getFormAnalysisSummary(formAnalysis)}`);
      console.log(`[AutoApply] Execution time: ${executionTime}ms`);
      
      // Save application log to database (if userId, jobId, and applicationId provided)
      if (userId && jobId && applicationId) {
        console.log(`[AutoApply] Saving application log - appId: ${applicationId}, userId: ${userId}, jobId: ${jobId}`);
        const proxyInfo = await proxyManager.getCurrentProxyInfo();
        console.log(`[AutoApply] Proxy info:`, proxyInfo);
        await createApplicationLog({
          applicationId,
          userId,
          jobId,
          atsType,
          applyUrl: jobUrl,
        availableFields: JSON.stringify(formAnalysis.availableFields),
        filledFields: JSON.stringify(formAnalysis.filledFields),
        missedFields: JSON.stringify(formAnalysis.missedFields),
        resumeUploaded: resumeUploadSuccess,
        resumeSelector: resumeSelector || undefined,
        resumeFileSize: resumeFileSize || undefined,
        fieldsFilledCount,
        submitClicked,
        submitSelector: submitSelector || undefined,
        proxyUsed: !!proxyInfo,
        proxyIp: proxyInfo?.ip,
        proxyCountry: proxyInfo?.country,
        success: true,
        executionTimeMs: executionTime,
        }).catch((err: any) => console.error('[AutoApply] Failed to save application log:', err));
      }
      
      await page.close();
      
      // Add helpful message if many fields were skipped
      const profileCompletionHint = skippedFields.length > 3 
        ? ' Complete your profile page to fill more fields.'
        : '';
      
      if (isSuccessPage || hasSuccessMessage) {
        return {
          success: true,
          message: `Successfully submitted application! Filled ${fieldsFilledCount} fields and clicked Submit.${profileCompletionHint}`,
          fieldsFilledCount,
        };
      } else {
        // Submitted but can't confirm success
        return {
          success: true,
          message: `Submitted application (filled ${fieldsFilledCount} fields). Please verify submission manually.`,
          fieldsFilledCount,
        };
      }
    } catch (clickError: any) {
      console.error('[AutoApply] Failed to click Submit button:', clickError.message);
      await page.close();
      return {
        success: false,
        message: `Filled ${fieldsFilledCount} fields but failed to click Submit button: ${clickError.message}. Manual review required.`,
        fieldsFilledCount,
      };
    }

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
  maxRetries: number = 3,
  userId?: number,
  jobId?: number,
  applicationId?: number
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
      
      const result = await autoApplyToJobInternal(jobUrl, applicantData, userId, jobId, applicationId);
      
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
