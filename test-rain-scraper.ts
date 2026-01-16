import { scrapeRainJobs } from './server/scrapers/ashby';

async function test() {
  console.log('Starting Rain scraper test...');
  const jobs = await scrapeRainJobs();
  console.log(`\nFound ${jobs.length} Rain jobs:`);
  jobs.forEach(job => {
    console.log(`- ${job.title} (${job.location})`);
    console.log(`  URL: ${job.applyUrl}`);
  });
}

test().catch(console.error);
