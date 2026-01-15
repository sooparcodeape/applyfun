/**
 * Run updated scrapers to populate database with real application URLs
 */

import { saveWeb3CareerJobs } from './server/scrapers/web3career';
import { scrapeSolanaJobs } from './server/scrapers/solana-new';
import { getDb } from './server/db';
import { jobs } from './drizzle/schema';

async function runScrapers() {
  console.log('🚀 Starting scraping process with real URL extraction...\n');
  
  try {
    // Run Web3Career scraper
    console.log('='.repeat(60));
    console.log('📊 SCRAPING WEB3.CAREER');
    console.log('='.repeat(60));
    const web3Result = await saveWeb3CareerJobs();
    console.log(`\n✅ Web3Career: ${web3Result.count} jobs saved\n`);
    
    // Run Solana scraper
    console.log('='.repeat(60));
    console.log('📊 SCRAPING JOBS.SOLANA.COM');
    console.log('='.repeat(60));
    const solanaJobs = await scrapeSolanaJobs();
    
    // Save Solana jobs to database
    const db = await getDb();
    if (db) {
      let solanaSavedCount = 0;
      for (const job of solanaJobs) {
        try {
          await db.insert(jobs).values(job).onDuplicateKeyUpdate({
            set: {
              title: job.title,
              location: job.location,
              tags: job.tags,
              applyUrl: job.applyUrl,
              isActive: job.isActive,
            },
          });
          solanaSavedCount++;
        } catch (error) {
          console.log(`[Solana] Skipped: ${job.title}`);
        }
      }
      console.log(`\n✅ Solana: ${solanaSavedCount} jobs saved\n`);
    }
    
    // Get total job count
    if (db) {
      const result = await db.select().from(jobs);
      console.log('='.repeat(60));
      console.log(`📈 TOTAL JOBS IN DATABASE: ${result.length}`);
      console.log('='.repeat(60));
      
      // Show sample of jobs with URLs
      console.log('\n📋 Sample jobs with application URLs:');
      const sample = result.slice(0, 5);
      for (const job of sample) {
        console.log(`\n  ✓ ${job.title}`);
        console.log(`    Company: ${job.company}`);
        console.log(`    Apply URL: ${job.apply_url}`);
      }
    }
    
    console.log('\n✅ Scraping complete! Database now contains jobs with real application URLs.');
    
  } catch (error: any) {
    console.error('\n❌ Scraping failed:', error.message);
    console.error(error.stack);
  }
}

// Run the scrapers
runScrapers()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
