import axios from "axios";

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
        
        const applyUrl = `https://jobs.ashbyhq.com/${companySlug}/${jobId}`;
        
        jobs.push({
          externalId: `ashby-${companySlug}-${jobId}`,
          source: `Ashby-${companyName}`,
          title: job.title,
          company: companyName,
          location: job.locationName || 'Remote',
          jobType: job.employmentType === 'FullTime' ? 'Full-time' : (job.employmentType || 'Full-time'),
          tags: [job.departmentName, job.teamName].filter(Boolean).join(', '),
          applyUrl,
          postedDate: job.publishedDate ? new Date(job.publishedDate) : new Date(),
          isActive: job.isListed ? 1 : 0,
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
