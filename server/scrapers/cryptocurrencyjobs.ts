import axios from "axios";
import * as cheerio from "cheerio";
import { getDb } from "../db";
import { jobs } from "../../drizzle/schema";

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

export async function scrapeCryptocurrencyJobs(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const MAX_PAGES = 10;
  
  try {
    console.log("[CryptocurrencyJobs] Starting scrape...");
    
    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = page === 1 
          ? "https://cryptocurrencyjobs.co/" 
          : `https://cryptocurrencyjobs.co/?page=${page}`;
        
        console.log(`[CryptocurrencyJobs] Scraping page ${page}...`);
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        
        const $ = cheerio.load(response.data);
        let jobsOnPage = 0;
        
        // Find job listings - they're in divs with job data
        $('div[data-job-id]').each((_index: number, element: any) => {
          try {
            const $job = $(element);
            
            // Extract job title and URL
            const titleLink = $job.find('h2 a, h3 a').first();
            const title = titleLink.text().trim();
            const applyUrl = titleLink.attr('href') || "";
            
            if (!title || !applyUrl) return;
            
            // Extract company
            const companyLink = $job.find('a[href*="/startups/"]').first();
            const company = companyLink.text().trim() || "Unknown Company";
            
            // Extract location
            const locationLinks = $job.find('a[href*="/remote"], a[href*="/location"]');
            const locations: string[] = [];
            locationLinks.each((_: number, locEl: any) => {
              const loc = $(locEl).text().trim();
              if (loc) locations.push(loc);
            });
            const location = locations.length > 0 ? locations.join(", ") : "Remote";
            
            // Extract job type
            const jobTypeLinks = $job.find('a[href*="/full-time"], a[href*="/part-time"], a[href*="/contract"]');
            let jobType = "Full-Time";
            jobTypeLinks.each((_: number, typeEl: any) => {
              const type = $(typeEl).text().trim();
              if (type) jobType = type;
            });
            
            // Extract salary if present
            let salaryMin: number | undefined;
            let salaryMax: number | undefined;
            let salaryCurrency = "USD";
            
            const salaryText = $job.text();
            const salaryMatch = salaryText.match(/\$(\d+)K?\s*[-–]\s*\$(\d+)K?/i);
            if (salaryMatch) {
              salaryMin = parseInt(salaryMatch[1]) * 1000;
              salaryMax = parseInt(salaryMatch[2]) * 1000;
            }
            
            // Extract tags/categories
            const tagLinks = $job.find('a[href*="/engineering"], a[href*="/marketing"], a[href*="/design"], a[href*="/sales"], a[href*="/defi"], a[href*="/nft"], a[href*="/web3"]');
            const tags: string[] = [];
            tagLinks.each((_: number, tagEl: any) => {
              const tag = $(tagEl).text().trim();
              if (tag && tag.length < 30) {
                tags.push(tag);
              }
            });
            
            // Create external ID from URL
            const urlParts = applyUrl.split('/');
            const jobSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
            const externalId = `cryptocurrencyjobs-${jobSlug}`;
            
            // Get full URL
            const fullUrl = applyUrl.startsWith('http') 
              ? applyUrl 
              : `https://cryptocurrencyjobs.co${applyUrl}`;
            
            scrapedJobs.push({
              externalId,
              source: "cryptocurrencyjobs.co",
              title,
              company,
              location,
              jobType,
              salaryMin,
              salaryMax,
              salaryCurrency,
              tags: JSON.stringify(tags),
              applyUrl: fullUrl,
              postedDate: new Date(),
              isActive: 1,
            });
            
            jobsOnPage++;
          } catch (error) {
            console.error("[CryptocurrencyJobs] Error parsing job:", error);
          }
        });
        
        console.log(`[CryptocurrencyJobs] Found ${jobsOnPage} jobs on page ${page}`);
        
        // If no jobs found on this page, stop pagination
        if (jobsOnPage === 0) {
          console.log(`[CryptocurrencyJobs] No more jobs found, stopping at page ${page}`);
          break;
        }
        
        // Rate limiting - wait 1 second between pages
        if (page < MAX_PAGES) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`[CryptocurrencyJobs] Error on page ${page}:`, error);
        break;
      }
    }
    
    console.log(`[CryptocurrencyJobs] Total jobs scraped: ${scrapedJobs.length}`);
    return scrapedJobs;
    
  } catch (error) {
    console.error("[CryptocurrencyJobs] Scraping error:", error);
    return [];
  }
}

export async function saveCryptocurrencyJobs() {
  const db = await getDb();
  if (!db) {
    console.error("[CryptocurrencyJobs] Database not available");
    return { success: false, count: 0 };
  }
  
  const scrapedJobs = await scrapeCryptocurrencyJobs();
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
          isActive: job.isActive,
        },
      });
      savedCount++;
    } catch (error) {
      // Job already exists or other error
      console.log(`[CryptocurrencyJobs] Skipped: ${job.title}`);
    }
  }
  
  console.log(`[CryptocurrencyJobs] Saved ${savedCount}/${scrapedJobs.length} jobs`);
  return { success: true, count: savedCount };
}
