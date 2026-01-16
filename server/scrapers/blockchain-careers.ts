import axios from "axios";
import * as cheerio from "cheerio";
import { TOP_BLOCKCHAINS, type BlockchainCareerSite } from "./blockchain-careers-list";

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
 * Generic blockchain career page scraper
 * Attempts to extract job listings from various career page formats
 */
async function scrapeBlockchainCareerPage(
  blockchain: BlockchainCareerSite
): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  const urlsToTry = [blockchain.careerUrl, ...(blockchain.fallbackUrls || [])];

  for (const url of urlsToTry) {
    try {
      console.log(`[${blockchain.name}] Trying ${url}...`);

      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Try multiple common job listing patterns
      const jobSelectors = [
        ".job-listing",
        ".career-listing",
        ".position",
        ".opening",
        '[class*="job"]',
        '[class*="position"]',
        '[class*="career"]',
        'a[href*="/jobs/"]',
        'a[href*="/careers/"]',
        'a[href*="/positions/"]',
      ];

      let foundJobs = false;

      for (const selector of jobSelectors) {
        const elements = $(selector);
        
        if (elements.length === 0) continue;

        elements.each((_: number, element: any) => {
          try {
            const $el = $(element);
            
            // Extract title
            let title = $el.find("h2, h3, h4, .title, [class*='title']").first().text().trim();
            if (!title) title = $el.text().trim().split("\n")[0];
            if (!title || title.length < 5 || title.length > 200) return;

            // Skip if it's navigation, footer links, or non-job content
            const lowerTitle = title.toLowerCase();
            const invalidPatterns = [
              "view all", "see all", "apply now",
              "fortune", "best workplace", "talent titans",
              "why ", "about ", "our culture", "our values",
              "blog", "news", "press", "article",
              "top 100", "best medium", "awards",
              "learn more", "read more", "discover"
            ];
            
            if (invalidPatterns.some(pattern => lowerTitle.includes(pattern))) {
              return;
            }
            
            // Must contain job-related keywords
            const jobKeywords = [
              "engineer", "developer", "manager", "designer",
              "analyst", "lead", "senior", "junior", "intern",
              "specialist", "coordinator", "director", "architect",
              "scientist", "researcher", "consultant", "associate"
            ];
            
            if (!jobKeywords.some(keyword => lowerTitle.includes(keyword))) {
              return;
            }

            // Extract location
            let location = $el.find("[class*='location'], .location").text().trim();
            if (!location) {
              const text = $el.text();
              const locationMatch = text.match(/Remote|Hybrid|On-site|[A-Z][a-z]+,\s*[A-Z]{2}/);
              location = locationMatch ? locationMatch[0] : "Remote";
            }

            // Extract job type
            let jobType = "Full-time";
            const typeMatch = $el.text().match(/Full-time|Part-time|Contract|Internship/i);
            if (typeMatch) jobType = typeMatch[0];

            // Extract apply URL
            let applyUrl = $el.find("a").first().attr("href") || "";
            if (!applyUrl) applyUrl = $el.attr("href") || "";
            
            // Make URL absolute
            if (applyUrl && !applyUrl.startsWith("http")) {
              const baseUrl = new URL(url);
              applyUrl = new URL(applyUrl, baseUrl.origin).toString();
            }
            if (!applyUrl) applyUrl = url;

            // Create external ID
            const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const externalId = `${blockchain.symbol.toLowerCase()}-${titleSlug}`;

            jobs.push({
              externalId,
              source: blockchain.name,
              title,
              company: blockchain.name,
              location,
              jobType,
              salaryCurrency: "USD",
              tags: JSON.stringify([blockchain.symbol]),
              applyUrl,
              postedDate: new Date(),
              isActive: 1,
            });

            foundJobs = true;
          } catch (error) {
            // Skip invalid job entries
          }
        });

        if (foundJobs) {
          console.log(`[${blockchain.name}] Found ${jobs.length} jobs using selector: ${selector}`);
          break;
        }
      }

      if (jobs.length > 0) {
        return jobs;
      }

    } catch (error: any) {
      console.error(`[${blockchain.name}] Error scraping ${url}:`, error.message);
    }
  }

  return jobs;
}

/**
 * Scrape all top blockchain career pages
 */
export async function scrapeBlockchainCareers(): Promise<ScrapedJob[]> {
  console.log("\n[Blockchain Careers] Starting scrape of top 20 blockchains...\n");
  
  const allJobs: ScrapedJob[] = [];
  const results: Record<string, number> = {};

  for (const blockchain of TOP_BLOCKCHAINS) {
    try {
      const jobs = await scrapeBlockchainCareerPage(blockchain);
      allJobs.push(...jobs);
      results[blockchain.name] = jobs.length;
      
      console.log(`[${blockchain.name}] Scraped ${jobs.length} jobs`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error: any) {
      console.error(`[${blockchain.name}] Failed:`, error.message);
      results[blockchain.name] = 0;
    }
  }

  console.log("\n[Blockchain Careers] Summary:");
  Object.entries(results).forEach(([name, count]) => {
    if (count > 0) console.log(`  ${name}: ${count} jobs`);
  });
  console.log(`[Blockchain Careers] Total: ${allJobs.length} jobs\n`);

  return allJobs;
}
