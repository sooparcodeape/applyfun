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
  
  try {
    console.log("[Web3Career] Starting scrape...");
    
    // Scrape main page
    const response = await axios.get("https://web3.career/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const $ = cheerio.load(response.data);
    
    // Find job listings - they appear in table rows
    $('tr').each((_index: number, element: any) => {
      try {
        const $row = $(element);
        
        // Skip sponsored rows and headers
        if ($row.attr("id")?.includes("sponsor")) return;
        
        // Extract job title and link
        const titleLink = $row.find("a").first();
        const title = titleLink.text().trim();
        if (!title || title.includes("Bootcamp")) return;
        
        // Extract company
        const companyLink = $row.find("a").eq(1);
        const company = companyLink.text().trim();
        if (!company) return;
        
        // Extract location
        const locationText = $row.text();
        const isRemote = locationText.toLowerCase().includes("remote");
        const location = isRemote ? "Remote" : "On-site";
        
        // Extract salary if present
        let salaryMin: number | undefined;
        let salaryMax: number | undefined;
        let salaryCurrency = "USD";
        
        const salaryMatch = locationText.match(/\$(\d+)k\s*-\s*\$(\d+)k/);
        if (salaryMatch) {
          salaryMin = parseInt(salaryMatch[1]) * 1000;
          salaryMax = parseInt(salaryMatch[2]) * 1000;
        }
        
        // Extract tags
        const tagLinks = $row.find("a").slice(2); // Skip title and company links
        const tags: string[] = [];
        tagLinks.each((_: number, tagEl: any) => {
          const tag = $(tagEl).text().trim();
          if (tag && !tag.includes("$") && tag.length < 30) {
            tags.push(tag);
          }
        });
        
        // Generate job URL
        const jobSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const applyUrl = `https://web3.career/${jobSlug}`;
        
        // Create external ID
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
          salaryCurrency,
          tags: JSON.stringify(tags),
          applyUrl,
          postedDate: new Date(),
          isActive: 1,
        });
      } catch (error) {
        console.error("[Web3Career] Error parsing job row:", error);
      }
    });
    
    console.log(`[Web3Career] Found ${scrapedJobs.length} jobs`);
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
