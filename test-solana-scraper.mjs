import { scrapeSolanaJobs } from './server/scrapers/solana-new.ts';

console.log('Testing Solana scraper with new logic...\n');

const jobs = await scrapeSolanaJobs();

console.log(`\n✅ Scraped ${jobs.length} jobs from Solana`);

if (jobs.length > 0) {
  console.log('\nFirst 3 jobs:');
  jobs.slice(0, 3).forEach((job, i) => {
    console.log(`\n${i + 1}. ${job.title}`);
    console.log(`   Company: ${job.company}`);
    console.log(`   URL: ${job.applyUrl}`);
    console.log(`   Source: ${job.source}`);
  });
}
