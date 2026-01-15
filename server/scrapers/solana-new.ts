import axios from "axios";
import * as cheerio from "cheerio";

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
 * Scrape jobs from Solana Jobs board
 * 
 * Strategy:
 * 1. Fetch job listing pages to get job detail URLs
 * 2. For each job, fetch the detail page
 * 3. Use Browserless to click Apply button and capture redirect URL
 * 4. Save the final application URL (Ashby/Greenhouse/Lever)
 */
export async function scrapeSolanaJobs(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const maxPages = 3; // Limit to 3 pages to minimize API calls
  
  try {
    console.log("[SolanaJobs] Starting scrape...");
    
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
    
    // Step 2: For each job detail URL, extract the application URL
    // We'll use Browserless to click the Apply button and capture the redirect
    const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;
    
    if (!BROWSERLESS_API_KEY) {
      console.error("[SolanaJobs] BROWSERLESS_API_KEY not found, cannot extract application URLs");
      return scrapedJobs;
    }
    
    // Process jobs in batches to avoid overwhelming Browserless
    const batchSize = 10;
    for (let i = 0; i < Math.min(jobDetailUrls.length, 50); i += batchSize) {
      const batch = jobDetailUrls.slice(i, i + batchSize);
      
      console.log(`[SolanaJobs] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(Math.min(jobDetailUrls.length, 50) / batchSize)}...`);
      
      for (const job of batch) {
        try {
          // Use Browserless to extract the application URL
          const script = `
            const puppeteer = require('puppeteer');
            
            module.exports = async ({ page, context }) => {
              try {
                await page.goto('${job.url}', { waitUntil: 'networkidle2', timeout: 15000 });
                
                // Wait for Apply button
                await page.waitForSelector('button:has-text("Apply now")', { timeout: 5000 }).catch(() => {});
                
                // Click Apply button and wait for navigation
                const [response] = await Promise.all([
                  page.waitForNavigation({ timeout: 10000 }).catch(() => null),
                  page.click('button').catch(() => {})
                ]);
                
                // Get the final URL after redirect
                const finalUrl = page.url();
                
                // Extract job details from the page
                const title = await page.$eval('h1, h2', el => el.textContent.trim()).catch(() => '${job.title}');
                const company = await page.$eval('[class*="company"]', el => el.textContent.trim()).catch(() => '${job.company}');
                
                return {
                  success: true,
                  applyUrl: finalUrl,
                  title,
                  company
                };
              } catch (error) {
                return {
                  success: false,
                  error: error.message,
                  applyUrl: '${job.url}' // Fallback to detail page URL
                };
              }
            };
          `;
          
          const browserlessResponse = await axios.post(
            `https://chrome.browserless.io/function?token=${BROWSERLESS_API_KEY}&stealth`,
            { code: script },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 30000,
            }
          );
          
          const result = browserlessResponse.data;
          
          if (result.success) {
            scrapedJobs.push({
              externalId: `solana-${job.company.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
              source: "jobs.solana.com",
              title: result.title || job.title,
              company: result.company || job.company,
              location: "Remote", // Default, can be extracted from detail page
              jobType: "Full-time",
              tags: JSON.stringify(["solana", "blockchain", "crypto"]),
              applyUrl: result.applyUrl,
              postedDate: new Date(),
              isActive: 1,
            });
            
            console.log(`[SolanaJobs] ✓ ${job.title} -> ${result.applyUrl}`);
          } else {
            console.error(`[SolanaJobs] ✗ ${job.title}: ${result.error}`);
          }
          
          // Small delay between Browserless calls
          await new Promise(resolve => setTimeout(resolve, 2000));
          
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
  }
}
