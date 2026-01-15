import { scrapeWeb3Career } from './server/scrapers/web3career';
import { scrapeSolanaJobs } from './server/scrapers/solana-new';

async function testURLExtraction() {
  console.log('🧪 Testing URL Extraction with Redirect Following\n');
  
  try {
    // Test Web3Career scraper (limit to 5 jobs)
    console.log('📋 Testing Web3Career scraper...');
    console.log('   Expected: Direct ATS URLs (Lever/Greenhouse/Ashby)\n');
    
    const web3Jobs = await scrapeWeb3Career();
    const sampleWeb3Jobs = web3Jobs.slice(0, 5);
    
    console.log(`✅ Web3Career: Scraped ${sampleWeb3Jobs.length} jobs\n`);
    
    for (const job of sampleWeb3Jobs) {
      console.log(`   ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   URL: ${job.applyUrl}`);
      
      // Check if URL is direct ATS link
      if (job.applyUrl.includes('lever.co') || job.applyUrl.includes('greenhouse') || 
          job.applyUrl.includes('ashbyhq') || job.applyUrl.includes('workable')) {
        console.log(`   ✅ Direct ATS URL detected!`);
      } else if (job.applyUrl.includes('web3.career/i/')) {
        console.log(`   ⚠️  Still a redirect URL (should have been resolved)`);
      } else {
        console.log(`   ℹ️  Other URL type: ${new URL(job.applyUrl).hostname}`);
      }
      console.log('');
    }
    
    // Test Solana scraper (limit to 5 jobs)
    console.log('\n📋 Testing Solana scraper...');
    console.log('   Expected: Direct Lever/Greenhouse URLs\n');
    
    const solanaJobs = await scrapeSolanaJobs();
    const sampleSolanaJobs = solanaJobs.slice(0, 5);
    
    console.log(`✅ Solana: Scraped ${sampleSolanaJobs.length} jobs\n`);
    
    for (const job of sampleSolanaJobs) {
      console.log(`   ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   URL: ${job.applyUrl}`);
      
      // Check if URL is direct ATS link
      if (job.applyUrl.includes('lever.co') || job.applyUrl.includes('greenhouse') || 
          job.applyUrl.includes('ashbyhq') || job.applyUrl.includes('workable')) {
        console.log(`   ✅ Direct ATS URL detected!`);
      } else if (job.applyUrl.includes('jobs.solana.com')) {
        console.log(`   ⚠️  Still a Solana redirect URL (should have been resolved)`);
      } else {
        console.log(`   ℹ️  Other URL type: ${new URL(job.applyUrl).hostname}`);
      }
      console.log('');
    }
    
    // Summary
    const totalJobs = sampleWeb3Jobs.length + sampleSolanaJobs.length;
    const directATSJobs = [...sampleWeb3Jobs, ...sampleSolanaJobs].filter(job => 
      job.applyUrl.includes('lever.co') || job.applyUrl.includes('greenhouse') || 
      job.applyUrl.includes('ashbyhq') || job.applyUrl.includes('workable')
    ).length;
    
    console.log('\n📊 Summary:');
    console.log(`   Total jobs tested: ${totalJobs}`);
    console.log(`   Direct ATS URLs: ${directATSJobs} (${Math.round(directATSJobs/totalJobs*100)}%)`);
    console.log(`   Other URLs: ${totalJobs - directATSJobs}`);
    
    if (directATSJobs > 0) {
      console.log('\n✅ SUCCESS! URL extraction is working correctly!');
    } else {
      console.log('\n⚠️  WARNING: No direct ATS URLs found. Check scraper logic.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testURLExtraction();
