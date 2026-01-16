import { scrapeRainJobs } from './server/scrapers/ashby';
import { bulkUpsertJobs } from './server/db-jobs';

async function run() {
  console.log('Scraping Rain jobs...');
  const jobs = await scrapeRainJobs();
  console.log(`Scraped ${jobs.length} jobs, saving to database...`);
  const saved = await bulkUpsertJobs(jobs);
  console.log(`✅ Saved ${saved} Rain jobs to database`);
}

run().catch(console.error);
