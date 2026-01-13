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

/**
 * Scrape jobs from CryptoJobsList
 */
export async function scrapeCryptoJobsList(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  
  try {
    console.log("[CryptoJobsList] Starting scrape...");
    
    const response = await axios.get("https://cryptojobslist.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const $ = cheerio.load(response.data);
    
    // Find job listings in table rows
    $("tr[role='button']").each((_: number, element: any) => {
      try {
        const $row = $(element);
        
        // Extract title
        const titleLink = $row.find("a").first();
        const title = titleLink.text().trim();
        if (!title) return;
        
        // Extract company
        const companyLink = $row.find("a").eq(1);
        const company = companyLink.text().trim();
        if (!company) return;
        
        // Extract location and salary from text
        const rowText = $row.text();
        const isRemote = rowText.toLowerCase().includes("remote");
        const location = isRemote ? "Remote" : "On-site";
        
        // Extract salary
        let salaryMin: number | undefined;
        let salaryMax: number | undefined;
        const salaryMatch = rowText.match(/(\d+)k-(\d+)k/);
        if (salaryMatch) {
          salaryMin = parseInt(salaryMatch[1]) * 1000;
          salaryMax = parseInt(salaryMatch[2]) * 1000;
        }
        
        // Extract tags (remaining links)
        const tags: string[] = [];
        $row.find("a").slice(2).each((_: number, tagEl: any) => {
          const tag = $(tagEl).text().trim();
          if (tag && tag.length < 30) {
            tags.push(tag);
          }
        });
        
        const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const applyUrl = `https://cryptojobslist.com/${jobSlug}`;
        const externalId = `cryptojobslist-${company.toLowerCase().replace(/\s+/g, "-")}-${jobSlug}`;
        
        scrapedJobs.push({
          externalId,
          source: "cryptojobslist.com",
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
      } catch (error) {
        console.error("[CryptoJobsList] Error parsing job:", error);
      }
    });
    
    console.log(`[CryptoJobsList] Found ${scrapedJobs.length} jobs`);
    return scrapedJobs;
  } catch (error) {
    console.error("[CryptoJobsList] Scraping error:", error);
    return [];
  }
}

/**
 * Scrape jobs from Remote3.co
 */
export async function scrapeRemote3(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  
  try {
    console.log("[Remote3] Starting scrape...");
    
    const response = await axios.get("https://remote3.co/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const $ = cheerio.load(response.data);
    
    // Find job cards
    $(".job-card, [class*='job']").each((_: number, element: any) => {
      try {
        const $card = $(element);
        
        const title = $card.find("h3, h2, .title, [class*='title']").first().text().trim();
        if (!title) return;
        
        const company = $card.find(".company, [class*='company']").first().text().trim();
        if (!company) return;
        
        const tags: string[] = [];
        $card.find(".tag, [class*='tag'], .badge, [class*='badge']").each((_: number, tagEl: any) => {
          const tag = $(tagEl).text().trim();
          if (tag && tag.length < 30) {
            tags.push(tag);
          }
        });
        
        const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const applyUrl = `https://remote3.co/job/${jobSlug}`;
        const externalId = `remote3-${company.toLowerCase().replace(/\s+/g, "-")}-${jobSlug}`;
        
        scrapedJobs.push({
          externalId,
          source: "remote3.co",
          title,
          company,
          location: "Remote",
          jobType: "Full-time",
          tags: JSON.stringify(tags),
          applyUrl,
          postedDate: new Date(),
          isActive: 1,
        });
      } catch (error) {
        console.error("[Remote3] Error parsing job:", error);
      }
    });
    
    console.log(`[Remote3] Found ${scrapedJobs.length} jobs`);
    return scrapedJobs;
  } catch (error) {
    console.error("[Remote3] Scraping error:", error);
    return [];
  }
}

/**
 * Scrape jobs from Solana Jobs
 */
export async function scrapeSolanaJobs(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  
  try {
    console.log("[SolanaJobs] Starting scrape...");
    
    const response = await axios.get("https://jobs.solana.com/jobs", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const $ = cheerio.load(response.data);
    
    // Find job listings
    $(".job-listing, [class*='job']").each((_: number, element: any) => {
      try {
        const $job = $(element);
        
        const title = $job.find("h3, h2, .title, [class*='title']").first().text().trim();
        if (!title) return;
        
        const company = $job.find(".company, [class*='company']").first().text().trim();
        if (!company) return;
        
        const tags: string[] = ["solana", "blockchain"];
        $job.find(".tag, [class*='tag']").each((_: number, tagEl: any) => {
          const tag = $(tagEl).text().trim();
          if (tag && tag.length < 30) {
            tags.push(tag);
          }
        });
        
        const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const applyUrl = `https://jobs.solana.com/jobs/${jobSlug}`;
        const externalId = `solana-${company.toLowerCase().replace(/\s+/g, "-")}-${jobSlug}`;
        
        scrapedJobs.push({
          externalId,
          source: "jobs.solana.com",
          title,
          company,
          location: "Remote",
          jobType: "Full-time",
          tags: JSON.stringify(tags),
          applyUrl,
          postedDate: new Date(),
          isActive: 1,
        });
      } catch (error) {
        console.error("[SolanaJobs] Error parsing job:", error);
      }
    });
    
    console.log(`[SolanaJobs] Found ${scrapedJobs.length} jobs`);
    return scrapedJobs;
  } catch (error) {
    console.error("[SolanaJobs] Scraping error:", error);
    return [];
  }
}

/**
 * Save scraped jobs to database
 */
async function saveJobs(scrapedJobs: ScrapedJob[]) {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return 0;
  }
  
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
    }
  }
  
  return savedCount;
}

/**
 * Run all scrapers
 */
export async function runAllScrapers() {
  console.log("\n=== Starting All Job Scrapers ===\n");
  
  const results = {
    cryptojobslist: 0,
    remote3: 0,
    solana: 0,
    total: 0,
  };
  
  // CryptoJobsList
  const cryptoJobs = await scrapeCryptoJobsList();
  results.cryptojobslist = await saveJobs(cryptoJobs);
  
  // Remote3
  const remote3Jobs = await scrapeRemote3();
  results.remote3 = await saveJobs(remote3Jobs);
  
  // Solana Jobs
  const solanaJobs = await scrapeSolanaJobs();
  results.solana = await saveJobs(solanaJobs);
  
  results.total = results.cryptojobslist + results.remote3 + results.solana;
  
  console.log("\n=== Scraping Complete ===");
  console.log(`CryptoJobsList: ${results.cryptojobslist} jobs`);
  console.log(`Remote3: ${results.remote3} jobs`);
  console.log(`Solana Jobs: ${results.solana} jobs`);
  console.log(`Total: ${results.total} jobs saved\n`);
  
  return results;
}
