import { scrapeSolanaJobs } from './server/scrapers/solana-new.ts';
import { bulkUpsertJobs } from './server/db-jobs.ts';

console.log('Scraping Solana jobs...\n');

const jobs = await scrapeSolanaJobs();

console.log(`\nSaving ${jobs.length} jobs to database...`);

const results = await bulkUpsertJobs(jobs);

const successCount = results.filter(r => r.success).length;

console.log(`✅ Saved ${successCount}/${jobs.length} Solana jobs to database`);
