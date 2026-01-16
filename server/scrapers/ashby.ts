import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser } from 'puppeteer';

// Add stealth plugin
puppeteer.use(StealthPlugin());

interface ScrapedJob {
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description?: string;
  requirements?: string;
  tags: string;
  applyUrl: string;
  postedDate: Date;
  isActive: number;
}

/**
 * Scrape jobs from a company's Ashby job board
 * @param companySlug - The company slug in Ashby URL (e.g., "rain" for https://jobs.ashbyhq.com/rain)
 * @param companyName - The display name of the company
 */
export async function scrapeAshbyCompany(companySlug: string, companyName: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  const baseUrl = `https://jobs.ashbyhq.com/${companySlug}`;
  
  console.log(`[Ashby-${companyName}] Starting scrape from ${baseUrl}...`);
  
  let browser: Browser | null = null;
  
  try {
    // Launch browser
    const executablePath = findChromePath();
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
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Navigate to company job board
    await page.goto(baseUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    // Wait for job listings to load
    await page.waitForSelector('a[href*="/jobs/"]', { timeout: 10000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract job listings
    const jobLinks = await page.evaluate((slug) => {
      const links: Array<{ title: string; url: string; location: string }> = [];
      
      // Ashby uses different structures, try multiple selectors
      const jobElements = document.querySelectorAll('a[href*="/jobs/"]');
      
      jobElements.forEach((element) => {
        const href = element.getAttribute('href');
        if (!href) return;
        
        // Build full URL
        const fullUrl = href.startsWith('http') ? href : `https://jobs.ashbyhq.com${href}`;
        
        // Extract title (usually in a heading or strong text)
        const titleEl = element.querySelector('h3, h4, strong, [class*="title"]');
        const title = titleEl?.textContent?.trim() || element.textContent?.trim() || '';
        
        // Extract location if available
        const locationEl = element.querySelector('[class*="location"], [class*="Location"]');
        const location = locationEl?.textContent?.trim() || 'Remote';
        
        if (title && fullUrl.includes(`/${slug}/jobs/`)) {
          links.push({ title, url: fullUrl, location });
        }
      });
      
      return links;
    }, companySlug);
    
    console.log(`[Ashby-${companyName}] Found ${jobLinks.length} job listings`);
    
    // Process each job
    for (const jobLink of jobLinks) {
      try {
        const jobId = jobLink.url.split('/jobs/')[1]?.split('?')[0] || '';
        if (!jobId) continue;
        
        const job: ScrapedJob = {
          externalId: `ashby-${companySlug}-${jobId}`,
          source: `ashby-${companySlug}`,
          title: jobLink.title,
          company: companyName,
          location: jobLink.location,
          jobType: 'Full-time', // Ashby doesn't always show this on listing page
          tags: JSON.stringify([]),
          applyUrl: jobLink.url,
          postedDate: new Date(),
          isActive: 1,
        };
        
        jobs.push(job);
        console.log(`[Ashby-${companyName}] ✓ ${job.title} -> ${job.applyUrl}`);
        
      } catch (error) {
        console.error(`[Ashby-${companyName}] Error processing job ${jobLink.url}:`, error);
      }
    }
    
    await page.close();
    
  } catch (error) {
    console.error(`[Ashby-${companyName}] Scraping error:`, error);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
  
  console.log(`[Ashby-${companyName}] Scraping complete. Found ${jobs.length} jobs.`);
  return jobs;
}

/**
 * Find Chrome executable path
 */
function findChromePath(): string {
  const possiblePaths = [
    '/home/ubuntu/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
    '/root/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
    '/usr/local/share/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome',
  ];
  
  const fs = require('fs');
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  
  throw new Error(`Chrome not found. Tried paths: ${possiblePaths.join(', ')}`);
}

/**
 * Scrape Rain jobs from Ashby
 */
export async function scrapeRainJobs(): Promise<ScrapedJob[]> {
  return scrapeAshbyCompany('rain', 'Rain');
}
