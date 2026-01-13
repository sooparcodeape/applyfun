import cron from 'node-cron';
import { runAllScrapers } from './scrapers/all-scrapers';
import { runDripCampaign } from './email-drip';

/**
 * Automated job scraping scheduler
 * Runs every 4 hours to fetch new jobs from all sources
 */
export function initializeScheduler() {
  // Run every 4 hours (at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
  cron.schedule('0 */4 * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[Scheduler] Starting automated job scraping at ${timestamp}`);
    
    try {
      const results = await runAllScrapers();
      
      console.log(`[Scheduler] Scraping completed:`);
      console.log(`  - CryptoJobsList: ${results.cryptojobslist} jobs`);
      console.log(`  - Remote3: ${results.remote3} jobs`);
      console.log(`  - Solana Jobs: ${results.solana} jobs`);
      console.log(`  - Total jobs scraped: ${results.total}`);
      
    } catch (error) {
      console.error('[Scheduler] Fatal error during scraping:', error);
    }
  });

  // Run immediately on server start for testing
  console.log('[Scheduler] Job scraper initialized. Running initial scrape...');
  runAllScrapers()
    .then((results: any) => {
      console.log(`[Scheduler] Initial scrape completed: ${results.total} total jobs`);
    })
    .catch((error: any) => {
      console.error('[Scheduler] Initial scrape failed:', error);
    });

  console.log('[Scheduler] Automated scraping scheduled every 4 hours');

  // Run drip campaign daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[Scheduler] Running daily drip campaign at ${timestamp}`);
    
    try {
      await runDripCampaign();
      console.log('[Scheduler] Drip campaign completed');
    } catch (error) {
      console.error('[Scheduler] Drip campaign error:', error);
    }
  });

  console.log('[Scheduler] Email drip campaign scheduled daily at 9 AM');
}
