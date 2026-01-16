import { runAllScrapers } from './server/scrapers/all-scrapers';

async function test() {
  console.log('Starting all scrapers...');
  const results = await runAllScrapers();
  console.log('\n=== Results ===');
  console.log(JSON.stringify(results, null, 2));
}

test().catch(console.error);
