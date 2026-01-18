import axios from "axios";
import * as cheerio from "cheerio";
import { extractFinalATSUrl } from "./extract-ats-url";
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
 * Scrape jobs from CryptoJobsList with pagination
 */
export async function scrapeCryptoJobsList(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const maxPages = 10; // Scrape up to 10 pages
  
  try {
    console.log("[CryptoJobsList] Starting scrape...");
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = page === 1 
          ? "https://cryptojobslist.com/" 
          : `https://cryptojobslist.com/?page=${page}`;
        
        console.log(`[CryptoJobsList] Scraping page ${page}...`);
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 10000,
        });
        
        const $ = cheerio.load(response.data);
        let jobsOnPage = 0;
        
        // Find job listings in table rows
        $("tr[role='button']").each((_: number, element: any) => {
          try {
            const $row = $(element);
            
            // Extract title and URL
            const titleLink = $row.find("a").first();
            const title = titleLink.text().trim();
            if (!title) return;
            
            // Extract real job URL from href
            let applyUrl = titleLink.attr("href") || "";
            if (!applyUrl) return;
            
            // Make URL absolute
            if (!applyUrl.startsWith("http")) {
              applyUrl = `https://cryptojobslist.com${applyUrl.startsWith("/") ? applyUrl : "/" + applyUrl}`;
            }
            
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
              if (tag && tag.length < 30 && !tag.includes('$')) {
                tags.push(tag);
              }
            });
            
            // Use URL as external ID
            const urlSlug = applyUrl.split("/").pop() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const externalId = `cryptojobslist-${urlSlug}`;
            
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
            
            jobsOnPage++;
          } catch (error) {
            console.error("[CryptoJobsList] Error parsing job:", error);
          }
        });
        
        console.log(`[CryptoJobsList] Page ${page}: Found ${jobsOnPage} jobs`);
        
        // If no jobs found on this page, stop pagination
        if (jobsOnPage === 0) {
          console.log(`[CryptoJobsList] No more jobs found, stopping at page ${page}`);
          break;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[CryptoJobsList] Error on page ${page}:`, error);
        break;
      }
    }
    
    console.log(`[CryptoJobsList] Total found: ${scrapedJobs.length} jobs`);
    return scrapedJobs;
  } catch (error) {
    console.error("[CryptoJobsList] Scraping error:", error);
    return scrapedJobs;
  }
}

/**
 * Scrape jobs from Remote3.co with pagination
 */
export async function scrapeRemote3(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const maxPages = 10;
  
  try {
    console.log("[Remote3] Starting scrape...");
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `https://remote3.co/jobs?page=${page}`;
        console.log(`[Remote3] Scraping page ${page}...`);
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 10000,
        });
        
        const $ = cheerio.load(response.data);
        let jobsOnPage = 0;
        
        // Try multiple selectors for job cards
        const jobSelectors = [
          ".job-card",
          "[class*='job']",
          "article",
          ".listing",
          "[data-job]"
        ];
        
        for (const selector of jobSelectors) {
          $(selector).each((_: number, element: any) => {
            try {
              const $card = $(element);
              
              // Try multiple selectors for title
              const title = $card.find("h3, h2, .title, [class*='title'], a[href*='job']").first().text().trim();
              if (!title || title.length < 3) return;
              
              // Try multiple selectors for company
              const company = $card.find(".company, [class*='company'], [class*='employer']").first().text().trim();
              if (!company || company.length < 2) return;
              
              // Extract tags
              const tags: string[] = [];
              $card.find(".tag, [class*='tag'], .badge, [class*='badge'], .skill, [class*='skill']").each((_: number, tagEl: any) => {
                const tag = $(tagEl).text().trim();
                if (tag && tag.length < 30 && tag.length > 1) {
                  tags.push(tag);
                }
              });
              
              const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const applyUrl = `https://remote3.co/job/${jobSlug}`;
              const externalId = `remote3-${company.toLowerCase().replace(/\s+/g, "-")}-${jobSlug}`;
              
              // Check if already added
              if (scrapedJobs.some(j => j.externalId === externalId)) return;
              
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
              
              jobsOnPage++;
            } catch (error) {
              // Skip invalid jobs
            }
          });
          
          if (jobsOnPage > 0) break; // Found jobs with this selector
        }
        
        console.log(`[Remote3] Page ${page}: Found ${jobsOnPage} jobs`);
        
        if (jobsOnPage === 0) {
          console.log(`[Remote3] No more jobs found, stopping at page ${page}`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Remote3] Error on page ${page}:`, error);
        break;
      }
    }
    
    console.log(`[Remote3] Total found: ${scrapedJobs.length} jobs`);
    return scrapedJobs;
  } catch (error) {
    console.error("[Remote3] Scraping error:", error);
    return scrapedJobs;
  }
}

/**
 * Scrape jobs from Solana Jobs with pagination
 */
export async function scrapeSolanaJobs(): Promise<ScrapedJob[]> {
  const scrapedJobs: ScrapedJob[] = [];
  const maxPages = 5;
  
  try {
    console.log("[SolanaJobs] Starting scrape...");
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = page === 1
          ? "https://jobs.solana.com/jobs"
          : `https://jobs.solana.com/jobs?page=${page}`;
        
        console.log(`[SolanaJobs] Scraping page ${page}...`);
        
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 10000,
        });
        
        const $ = cheerio.load(response.data);
        let jobsOnPage = 0;
        
        // Find job listings
        $(".job-listing, [class*='job'], article, .posting").each((_: number, element: any) => {
          try {
            const $job = $(element);
            
            const title = $job.find("h3, h2, .title, [class*='title'], a").first().text().trim();
            if (!title || title.length < 3) return;
            
            const company = $job.find(".company, [class*='company'], [class*='employer']").first().text().trim();
            if (!company || company.length < 2) return;
            
            const tags: string[] = ["solana", "blockchain"];
            $job.find(".tag, [class*='tag'], .skill, [class*='skill']").each((_: number, tagEl: any) => {
              const tag = $(tagEl).text().trim();
              if (tag && tag.length < 30 && tag.length > 1) {
                tags.push(tag);
              }
            });
            
            const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const applyUrl = `https://jobs.solana.com/jobs/${jobSlug}`;
            const externalId = `solana-${company.toLowerCase().replace(/\s+/g, "-")}-${jobSlug}`;
            
            if (scrapedJobs.some(j => j.externalId === externalId)) return;
            
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
            
            jobsOnPage++;
          } catch (error) {
            // Skip invalid jobs
          }
        });
        
        console.log(`[SolanaJobs] Page ${page}: Found ${jobsOnPage} jobs`);
        
        if (jobsOnPage === 0) {
          console.log(`[SolanaJobs] No more jobs found, stopping at page ${page}`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[SolanaJobs] Error on page ${page}:`, error);
        break;
      }
    }
    
    console.log(`[SolanaJobs] Total found: ${scrapedJobs.length} jobs`);
    return scrapedJobs;
  } catch (error) {
    console.error("[SolanaJobs] Scraping error:", error);
    return scrapedJobs;
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
    rain: 0, // All Ashby companies combined
    solana: 0,
    web3career: 0,
    cryptocurrencyjobs: 0,
    blockchainCareers: 0,
    total: 0,
  };
  
  // Import new scrapers
  // const { scrapeWeb3Career } = await import("./web3career"); // DISABLED - too many timeouts
  const { scrapeCryptocurrencyJobs } = await import("./cryptocurrencyjobs");
  const { scrapeBlockchainCareers } = await import("./blockchain-careers");
  const { scrapeAllAshbyCompanies } = await import("./ashby");
  
  // CryptoJobsList - DISABLED
  // const cryptoJobs = await scrapeCryptoJobsList();
  // results.cryptojobslist = await saveJobs(cryptoJobs);
  
  // Remote3
  const remote3Jobs = await scrapeRemote3();
  results.remote3 = await saveJobs(remote3Jobs);
  
  // Solana Jobs
  const solanaJobs = await scrapeSolanaJobs();
  results.solana = await saveJobs(solanaJobs);
  
  // Web3.career - DISABLED (too many timeouts)
  // const web3CareerJobs = await scrapeWeb3Career();
  // results.web3career = await saveJobs(web3CareerJobs);
  
  // CryptocurrencyJobs.co (Cloudflare protected)
  const cryptoCurrencyJobs = await scrapeCryptocurrencyJobs();
  results.cryptocurrencyjobs = await saveJobs(cryptoCurrencyJobs);
  
  // Top 20 Blockchain Career Pages
  const blockchainJobs = await scrapeBlockchainCareers();
  results.blockchainCareers = await saveJobs(blockchainJobs);
  
  // All Ashby Companies (Rain, 0x, Helius, etc.)
  const ashbyResults = await scrapeAllAshbyCompanies();
  results.rain = ashbyResults.total;
  
  results.total = results.remote3 + results.rain + results.solana + results.cryptocurrencyjobs + results.blockchainCareers;
  
  console.log("\n=== Scraping Complete ===");
  // console.log(`CryptoJobsList: ${results.cryptojobslist} jobs`); // DISABLED
  console.log(`Remote3: ${results.remote3} jobs`);
  console.log(`Ashby Companies: ${results.rain} jobs`);
  console.log(`  - Rain: ${ashbyResults.byCompany['Rain'] || 0}`);
  console.log(`  - 0x: ${ashbyResults.byCompany['0x'] || 0}`);
  console.log(`  - Helius: ${ashbyResults.byCompany['Helius'] || 0}`);
  console.log(`  - QuickNode: ${ashbyResults.byCompany['QuickNode'] || 0}`);
  console.log(`  - Pyth Network: ${ashbyResults.byCompany['Pyth Network'] || 0}`);
  console.log(`  - Others: ${(ashbyResults.byCompany['Raiku'] || 0) + (ashbyResults.byCompany['Li.Fi'] || 0) + (ashbyResults.byCompany['Blockworks'] || 0) + (ashbyResults.byCompany['Inference'] || 0)}`);
  console.log(`Solana Jobs: ${results.solana} jobs`);
  // console.log(`Web3.career: ${results.web3career} jobs`); // DISABLED
  console.log(`CryptocurrencyJobs.co: ${results.cryptocurrencyjobs} jobs`);
  console.log(`Blockchain Career Pages: ${results.blockchainCareers} jobs`);
  console.log(`Total: ${results.total} jobs saved\n`);
  
  return results;
}
