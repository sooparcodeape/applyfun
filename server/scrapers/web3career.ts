import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser } from 'puppeteer';
import { getDb } from "../db";
import { jobs } from "../../drizzle/schema";

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

interface JobListing {
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  tags: string[];
  detailUrl: string;
}

/**
 * Extract real application URL by navigating to job detail page
 */
async function extractApplicationUrl(browser: Browser, detailUrl: string): Promise<string | null> {
  let page = null;
  
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Navigate to job detail page and check for 404
    const response = await page.goto(detailUrl, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    
    // Skip if page returned 404 or server error
    if (!response || response.status() === 404 || response.status() >= 500) {
      console.log(`[Web3Career] Skipping ${detailUrl} - HTTP ${response?.status() || 'no response'}`);
      await page.close();
      return null;
    }
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look for Apply button and extract href
    const applyUrl = await page.evaluate(() => {
      // Try multiple selectors for Apply button
      const selectors = [
        'a[href*="apply"]',
        'a[href*="greenhouse"]',
        'a[href*="lever.co"]',
        'a[href*="ashbyhq"]',
        'a[href*="workable"]',
        'button[onclick*="apply"]',
        '.apply-button',
        '#apply-button',
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const href = element.getAttribute('href') || element.getAttribute('onclick');
          if (href && (href.includes('http') || href.startsWith('/'))) {
            // Extract URL from onclick if needed
            const urlMatch = href.match(/https?:\/\/[^\s'"]+/);
            return urlMatch ? urlMatch[0] : href;
          }
        }
      }
      
      // Fallback: look for any link with "apply" text
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        const text = link.textContent?.toLowerCase() || '';
        if (text.includes('apply') && link.href) {
          return link.href;
        }
      }
      
      return null;
    });
    
    if (!applyUrl) {
      await page.close();
      return null;
    }
    
    // Make relative URLs absolute
    let finalUrl = applyUrl;
    if (applyUrl.startsWith('/')) {
      finalUrl = `https://web3.career${applyUrl}`;
    }
    
    // Return the URL as-is - automation will handle clicking Apply button
    
    await page.close();
    return finalUrl;
    
  } catch (error) {
    console.error(`[Web3Career] Error extracting URL from ${detailUrl}:`, error);
    if (page) {
      await page.close().catch(() => {});
    }
    return null;
  }
}

export async function scrapeWeb3Career(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const maxPages = 10;
  let browser: Browser | null = null;
  
  try {
    console.log("[Web3Career] Starting scrape with real URL extraction...");
    
    // Step 1: Scrape job listings to get detail URLs
    const jobListings: JobListing[] = [];
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = page === 1
          ? "https://web3.career/"
          : `https://web3.career/?page=${page}`;
        
        console.log(`[Web3Career] Scraping page ${page}...`);
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 10000,
        });
        
        const $ = cheerio.load(response.data);
        let jobsOnPage = 0;
        
        // Find job listings in table rows
        $("tr").each((_: number, element: any) => {
          try {
            const $row = $(element);
            
            // Skip sponsored rows and headers
            if ($row.attr("id")?.includes("sponsor")) return;
            
            // Extract title and company from links
            const links = $row.find("a");
            if (links.length < 2) return;
            
            const titleLink = links.eq(0);
            const title = titleLink.text().trim();
            const detailUrl = titleLink.attr('href');
            const company = links.eq(1).text().trim();
            
            if (!title || !company || !detailUrl || title.includes("Bootcamp")) return;
            
            // Make URL absolute
            const fullDetailUrl = detailUrl.startsWith('http') 
              ? detailUrl 
              : `https://web3.career${detailUrl}`;
            
            // Extract location
            const rowText = $row.text();
            const isRemote = rowText.toLowerCase().includes("remote");
            const location = isRemote ? "Remote" : "On-site";
            
            // Extract salary
            let salaryMin: number | undefined;
            let salaryMax: number | undefined;
            const salaryMatch = rowText.match(/\$(\d+)k\s*-\s*\$(\d+)k/);
            if (salaryMatch) {
              salaryMin = parseInt(salaryMatch[1]) * 1000;
              salaryMax = parseInt(salaryMatch[2]) * 1000;
            }
            
            // Extract tags (remaining links after title and company)
            const tags: string[] = [];
            links.slice(2).each((_: number, tagEl: any) => {
              const tag = $(tagEl).text().trim();
              if (tag && tag.length < 30 && !tag.includes("$")) {
                tags.push(tag);
              }
            });
            
            jobListings.push({
              title,
              company,
              location,
              salaryMin,
              salaryMax,
              tags,
              detailUrl: fullDetailUrl,
            });
            
            jobsOnPage++;
          } catch (error) {
            // Skip invalid jobs
          }
        });
        
        console.log(`[Web3Career] Page ${page}: Found ${jobsOnPage} jobs`);
        
        if (jobsOnPage === 0) {
          console.log(`[Web3Career] No more jobs found, stopping at page ${page}`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Web3Career] Error on page ${page}:`, error);
        break;
      }
    }
    
    console.log(`[Web3Career] Found ${jobListings.length} job listings, extracting application URLs...`);
    
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
    
    // Process jobs in batches to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < jobListings.length; i += batchSize) {
      const batch = jobListings.slice(i, i + batchSize);
      
      console.log(`[Web3Career] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobListings.length / batchSize)}...`);
      
      for (const listing of batch) {
        try {
          const applyUrl = await extractApplicationUrl(browser, listing.detailUrl);
          
          if (applyUrl) {
            const externalId = `web3career-${listing.company.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
            
            scrapedJobs.push({
              externalId,
              source: "web3.career",
              title: listing.title,
              company: listing.company,
              location: listing.location,
              jobType: "Full-time",
              salaryMin: listing.salaryMin,
              salaryMax: listing.salaryMax,
              salaryCurrency: "USD",
              tags: JSON.stringify(listing.tags),
              applyUrl,
              postedDate: new Date(),
              isActive: 1,
            });
            
            console.log(`[Web3Career] ✓ ${listing.title} -> ${applyUrl}`);
          } else {
            console.log(`[Web3Career] ✗ ${listing.title} - No apply URL found`);
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`[Web3Career] Error processing ${listing.title}:`, error);
        }
      }
    }
    
    console.log(`[Web3Career] Total scraped: ${scrapedJobs.length} jobs with valid application URLs`);
    return scrapedJobs;
    
  } catch (error) {
    console.error("[Web3Career] Scraping error:", error);
    return scrapedJobs;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function saveWeb3CareerJobs() {
  const db = await getDb();
  if (!db) {
    console.error("[Web3Career] Database not available");
    return { success: false, count: 0 };
  }
  
  const scrapedJobs = await scrapeWeb3Career();
  let savedCount = 0;
  
  for (const job of scrapedJobs) {
    try {
      await db.insert(jobs).values(job).onDuplicateKeyUpdate({
        set: {
          title: job.title,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          tags: job.tags,
          applyUrl: job.applyUrl, // Update apply URL
          isActive: job.isActive,
        },
      });
      savedCount++;
    } catch (error) {
      // Job already exists or other error
      console.log(`[Web3Career] Skipped: ${job.title}`);
    }
  }
  
  console.log(`[Web3Career] Saved ${savedCount}/${scrapedJobs.length} jobs`);
  return { success: true, count: savedCount };
}
