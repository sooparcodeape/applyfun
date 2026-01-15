import { scrapeSolanaJobs } from './server/scrapers/solana-new';

async function testSolanaURLs() {
  console.log('🧪 Testing Solana Jobs URL Extraction\n');
  console.log('Expected: Direct Lever/Greenhouse/Ashby URLs\n');
  
  try {
    const jobs = await scrapeSolanaJobs();
    const sampleJobs = jobs.slice(0, 10);
    
    console.log(`✅ Scraped ${sampleJobs.length} jobs from Solana\n`);
    
    let directATSCount = 0;
    let solanaRedirectCount = 0;
    let otherCount = 0;
    
    for (const job of sampleJobs) {
      console.log(`📋 ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   URL: ${job.applyUrl}`);
      
      if (job.applyUrl.includes('lever.co') || job.applyUrl.includes('greenhouse') || 
          job.applyUrl.includes('ashbyhq') || job.applyUrl.includes('workable')) {
        console.log(`   ✅ Direct ATS URL!`);
        directATSCount++;
      } else if (job.applyUrl.includes('jobs.solana.com')) {
        console.log(`   ⚠️  Solana redirect URL (needs resolution)`);
        solanaRedirectCount++;
      } else {
        console.log(`   ℹ️  Other: ${new URL(job.applyUrl).hostname}`);
        otherCount++;
      }
      console.log('');
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total jobs: ${sampleJobs.length}`);
    console.log(`   Direct ATS URLs: ${directATSCount} (${Math.round(directATSCount/sampleJobs.length*100)}%)`);
    console.log(`   Solana redirects: ${solanaRedirectCount}`);
    console.log(`   Other URLs: ${otherCount}`);
    
    if (directATSCount > 0) {
      console.log('\n✅ SUCCESS! Solana scraper is extracting direct ATS URLs!');
    } else {
      console.log('\n⚠️  WARNING: No direct ATS URLs found.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSolanaURLs();
