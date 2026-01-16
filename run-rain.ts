import { scrapeAshbyCompany } from './server/scrapers/ashby';

async function test() {
  console.log('Running Rain scraper with Chrome dependencies...');
  const jobs = await scrapeAshbyCompany('rain', 'Rain');
  console.log(`\nFound ${jobs.length} Rain jobs`);
  if (jobs.length > 0) {
    console.log('\nFirst 3 jobs:');
    jobs.slice(0, 3).forEach((job, i) => {
      console.log(`${i+1}. ${job.title} - ${job.applyUrl}`);
    });
  }
}

test().catch(console.error);
