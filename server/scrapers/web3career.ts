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

export async function scrapeWeb3Career(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const maxPages = 10;
  
  try {
    console.log("[Web3Career] Starting scrape with pagination...");
    
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
            
            const title = links.eq(0).text().trim();
            const company = links.eq(1).text().trim();
            
            if (!title || !company || title.includes("Bootcamp")) return;
            
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
            
            const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const applyUrl = `https://web3.career/${jobSlug}`;
            const externalId = `web3career-${company.toLowerCase().replace(/\s+/g, "-")}-${jobSlug}`;
            
            scrapedJobs.push({
              externalId,
              source: "web3.career",
              title,
              company,
              location,
              jobType: "Full-time",
              salaryMin,
              salaryMax,
              salaryCurrency: "USD",
              tags: JSON.stringify(tags),
              applyUrl,
              postedDate: new Date(),
              isActive: 1,
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
    
    console.log(`[Web3Career] Total found: ${scrapedJobs.length} jobs`);
    return scrapedJobs;
    
  } catch (error) {
    console.error("[Web3Career] Scraping error:", error);
    return [];
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
