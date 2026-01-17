import axios from "axios";
import { preAnalyzeFormDuringScraping } from "../vision-field-detector";

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
 * Scrape jobs from a company's Ashby job board by parsing embedded JSON data
 * @param companySlug - The company slug in Ashby URL (e.g., "rain" for https://jobs.ashbyhq.com/rain)
 * @param companyName - The display name of the company
 */
export async function scrapeAshbyCompany(companySlug: string, companyName: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  const baseUrl = `https://jobs.ashbyhq.com/${companySlug}`;
  
  console.log(`[Ashby-${companyName}] Starting scrape from ${baseUrl}...`);
  
  try {
    const response = await axios.get(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });
    
    // Ashby embeds job data as JSON in window.__appData
    const match = response.data.match(/window\.__appData\s*=\s*({[\s\S]+?});/);
    
    if (!match) {
      console.error(`[Ashby-${companyName}] Could not find __appData in HTML`);
      return jobs;
    }
    
    const appData = JSON.parse(match[1]);
    const jobList = appData?.jobBoard?.jobPostings || [];
    
    console.log(`[Ashby-${companyName}] Found ${jobList.length} jobs in JSON data`);
    
    for (const job of jobList) {
      try {
        const jobId = job.id || job.jobId;
        if (!jobId || !job.title) continue;
        
        const applyUrl = `https://jobs.ashbyhq.com/${companySlug}/${jobId}/application`;
        
        // Format tags as JSON array for frontend compatibility
        const tagArray = [job.departmentName, job.teamName].filter(Boolean);
        
        jobs.push({
          externalId: `ashby-${companySlug}-${jobId}`,
          source: `Ashby-${companyName}`,
          title: job.title,
          company: companyName,
          location: job.locationName || 'Remote',
          jobType: job.employmentType === 'FullTime' ? 'Full-time' : (job.employmentType || 'Full-time'),
          tags: JSON.stringify(tagArray),
          applyUrl,
          postedDate: job.publishedDate ? new Date(job.publishedDate) : new Date(),
          isActive: job.isListed ? 1 : 0,
        });
        
        // Pre-analyze form with vision detection (runs in background)
        preAnalyzeFormDuringScraping(applyUrl, 'ashby').catch((error: any) => {
          console.log(`[Ashby-${companyName}] Vision analysis queued for ${job.title}`);
        });
      } catch (err) {
        console.error(`[Ashby-${companyName}] Error processing job:`, err);
      }
    }
    
    console.log(`[Ashby-${companyName}] Successfully scraped ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[Ashby-${companyName}] Scraping failed:`, error.message);
  }
  
  return jobs;
}

/**
 * Scrape Rain jobs from Ashby
 */
export async function scrapeRainJobs(): Promise<ScrapedJob[]> {
  return scrapeAshbyCompany('rain', 'Rain');
}


/**
 * Scrape all Ashby companies
 */
export async function scrapeAllAshbyCompanies(): Promise<{total: number, byCompany: Record<string, number>}> {
  const companies = [
    { slug: 'rain', name: 'Rain' },
    { slug: '0x', name: '0x' },
    { slug: 'raiku', name: 'Raiku' },
    { slug: 'helius', name: 'Helius' },
    { slug: 'li.fi', name: 'Li.Fi' },
    { slug: 'Blockworks', name: 'Blockworks' },
    { slug: 'quicknode', name: 'QuickNode' },
    { slug: 'pythnetwork', name: 'Pyth Network' },
    { slug: 'inference', name: 'Inference' },
  ];

  const results: Record<string, number> = {};
  let total = 0;

  for (const company of companies) {
    try {
      const jobs = await scrapeAshbyCompany(company.slug, company.name);
      
      // Save jobs to database
      const { upsertJob } = await import('../db-jobs');
      for (const job of jobs) {
        await upsertJob(job);
      }
      
      results[company.name] = jobs.length;
      total += jobs.length;
      
      console.log(`[Ashby] ${company.name}: ${jobs.length} jobs saved`);
      
      // Small delay between companies to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`[Ashby] Error scraping ${company.name}:`, error.message);
      results[company.name] = 0;
    }
  }

  return { total, byCompany: results };
}
