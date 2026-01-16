/**
 * Shared utility to extract final ATS application URL from any job page
 * Clicks through intermediate pages to get to Lever/Greenhouse/Ashby/etc.
 */
import puppeteer, { Browser, Page } from "puppeteer";
import { findChromePath } from "../chrome-utils";

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }

  const chromePath = await findChromePath();
  
  sharedBrowser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  return sharedBrowser;
}

/**
 * Extract final ATS URL from a job page
 * Clicks "Apply" buttons and follows redirects until reaching ATS
 */
export async function extractFinalATSUrl(jobUrl: string): Promise<string | null> {
  let page: Page | null = null;
  
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    );
    
    console.log(`[ATS Extractor] Navigating to ${jobUrl}`);
    await page.goto(jobUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
    // Check if already on ATS page
    const currentUrl = page.url();
    if (isATSUrl(currentUrl)) {
      console.log(`[ATS Extractor] Already on ATS: ${currentUrl}`);
      await page.close();
      return currentUrl;
    }
    
    // Try to find and click Apply button
    const applySelectors = [
      'a:has-text("Apply")',
      'button:has-text("Apply")',
      'a[href*="apply"]',
      'a[href*="lever.co"]',
      'a[href*="greenhouse.io"]',
      'a[href*="ashbyhq.com"]',
      '.apply-button',
      '.job-apply',
      '[class*="apply"]',
    ];
    
    for (const selector of applySelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`[ATS Extractor] Found apply button: ${selector}`);
          
          // Get href if it's a link
          const href = await element.evaluate(el => 
            el.tagName === 'A' ? (el as HTMLAnchorElement).href : null
          );
          
          if (href && isATSUrl(href)) {
            console.log(`[ATS Extractor] Direct ATS link: ${href}`);
            await page.close();
            return href;
          }
          
          // Click and wait for navigation
          await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {}),
            element.click(),
          ]);
          
          const finalUrl = page.url();
          if (isATSUrl(finalUrl)) {
            console.log(`[ATS Extractor] Reached ATS: ${finalUrl}`);
            await page.close();
            return finalUrl;
          }
        }
      } catch (error) {
        // Try next selector
        continue;
      }
    }
    
    // If no ATS found, return original URL
    console.log(`[ATS Extractor] No ATS found, using original URL`);
    await page.close();
    return jobUrl;
    
  } catch (error: any) {
    console.error(`[ATS Extractor] Error extracting ATS URL from ${jobUrl}:`, error.message);
    if (page) await page.close();
    return null;
  }
}

/**
 * Check if URL is an ATS application page
 */
function isATSUrl(url: string): boolean {
  const atsPatterns = [
    'lever.co',
    'greenhouse.io',
    'ashbyhq.com',
    'workable.com',
    'breezy.hr',
    'recruitee.com',
    'personio.de',
    'bamboohr.com',
    'apply',
    '/application',
  ];
  
  return atsPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

/**
 * Close shared browser
 */
export async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}
