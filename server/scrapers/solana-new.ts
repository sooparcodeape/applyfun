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
 * Extract real application URL by navigating to job detail page and clicking Apply
 */
async function extractApplicationUrl(browser: Browser, detailUrl: string, title: string): Promise<string | null> {
  let page = null;
  
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Navigate to job detail page
    await page.goto(detailUrl, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look for Apply button and extract href or click to get redirect URL
    const applyUrl = await page.evaluate(() => {
      // Try multiple selectors for Apply button
      const selectors = [
        'a[href*="apply"]',
        'a[href*="greenhouse"]',
        'a[href*="lever.co"]',
        'a[href*="ashbyhq"]',
        'a[href*="workable"]',
        'button[data-testid*="apply"]',
        '.apply-button',
        '#apply-button',
        'a.btn:has-text("Apply")',
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const href = element.getAttribute('href');
          if (href && href.includes('http')) {
            return href;
          }
        }
      }
      
      // Fallback: look for any link with "apply" text
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        const text = link.textContent?.toLowerCase() || '';
        if (text.includes('apply') && link.href && link.href.includes('http')) {
          return link.href;
        }
      }
      
      return null;
    });
    
    await page.close();
    
    if (applyUrl) {
      return applyUrl;
    }
    
    return null;
    
  } catch (error) {
    console.error(`[SolanaJobs] Error extracting URL from ${detailUrl}:`, error);
    if (page) {
      await page.close().catch(() => {});
    }
    return null;
  }
}

/**
 * Scrape jobs from Solana Jobs board
 * 
 * Strategy:
 * 1. Fetch job listing pages to get job detail URLs
 * 2. Use self-hosted Puppeteer to navigate to each job detail page
 * 3. Extract the real application URL (Ashby/Greenhouse/Lever)
 * 4. Save jobs with working application URLs
 */
export async function scrapeSolanaJobs(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const maxPages = 3; // Limit to 3 pages
  let browser: Browser | null = null;
  
  try {
    console.log("[SolanaJobs] Starting scrape with real URL extraction...");
    
    // Step 1: Get job detail URLs from listing pages
    const jobDetailUrls: Array<{url: string, title: string, company: string}> = [];
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = page === 1
          ? "https://jobs.solana.com/jobs"
          : `https://jobs.solana.com/jobs?page=${page}`;
        
        console.log(`[SolanaJobs] Fetching listing page ${page}...`);
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 10000,
        });
        
        const $ = cheerio.load(response.data);
        
        // Find all job title links
        $('a[data-testid="job-title-link"]').each((_: number, element: any) => {
          const $link = $(element);
          const href = $link.attr('href');
          const title = $link.text().trim();
          
          if (href && title) {
            // Extract company from the URL or nearby elements
            const companyMatch = href.match(/\/companies\/([^/]+)\//);
            const company = companyMatch ? companyMatch[1].replace(/-/g, ' ') : 'Unknown';
            
            const fullUrl = href.startsWith('http') ? href : `https://jobs.solana.com${href.replace('#content', '')}`;
            
            jobDetailUrls.push({
              url: fullUrl,
              title,
              company
            });
          }
        });
        
        console.log(`[SolanaJobs] Page ${page}: Found ${jobDetailUrls.length} job URLs so far`);
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[SolanaJobs] Error on listing page ${page}:`, error);
        break;
      }
    }
    
    console.log(`[SolanaJobs] Total job detail URLs found: ${jobDetailUrls.length}`);
    
    // Step 2: Launch browser and extract real application URLs
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
    
    // Process jobs in batches
    const batchSize = 5;
    const maxJobs = Math.min(jobDetailUrls.length, 50); // Limit to 50 jobs
    
    for (let i = 0; i < maxJobs; i += batchSize) {
      const batch = jobDetailUrls.slice(i, i + batchSize);
      
      console.log(`[SolanaJobs] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(maxJobs / batchSize)}...`);
      
      for (const job of batch) {
        try {
          const applyUrl = await extractApplicationUrl(browser, job.url, job.title);
          
          if (applyUrl) {
            scrapedJobs.push({
              externalId: `solana-${job.company.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
              source: "jobs.solana.com",
              title: job.title,
              company: job.company,
              location: "Remote", // Default, can be extracted from detail page
              jobType: "Full-time",
              tags: JSON.stringify(["solana", "blockchain", "crypto"]),
              applyUrl,
              postedDate: new Date(),
              isActive: 1,
            });
            
            console.log(`[SolanaJobs] ✓ ${job.title} -> ${applyUrl}`);
          } else {
            console.log(`[SolanaJobs] ✗ ${job.title} - No apply URL found`);
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`[SolanaJobs] Error processing ${job.title}:`, error);
        }
      }
    }
    
    console.log(`[SolanaJobs] Total scraped: ${scrapedJobs.length} jobs with valid application URLs`);
    return scrapedJobs;
    
  } catch (error) {
    console.error("[SolanaJobs] Scraping error:", error);
    return scrapedJobs;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
