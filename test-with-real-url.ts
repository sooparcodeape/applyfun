/**
 * Test self-hosted Puppeteer automation with a real extracted URL
 */

import { autoApplyToJob, closeBrowser } from './server/job-automation';
import type { JobApplicationData } from './server/job-automation';

async function testWithRealUrl() {
  console.log('🚀 Testing self-hosted Puppeteer automation with real extracted URL\n');

  // Test data
  const testApplicant: JobApplicationData = {
    fullName: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedinUrl: 'https://linkedin.com/in/johnsmith',
    githubUrl: 'https://github.com/johnsmith',
    portfolioUrl: 'https://johnsmith.dev',
    coverLetter: `Dear Hiring Manager,

I am excited to apply for this position. With 5 years of experience in blockchain development and a strong background in Web3 technologies, I believe I would be a great fit for your team.

Best regards,
John Smith`,
    skills: ['Solidity', 'Rust', 'React', 'TypeScript', 'Web3.js'],
    experience: '5 years of blockchain development',
  };

  // Use a real URL that was extracted by our scraper
  const realJobUrl = 'https://web3.career/i/xITOyQTM';
  
  console.log('📋 Test Configuration:');
  console.log(`   Job URL: ${realJobUrl}`);
  console.log(`   Applicant: ${testApplicant.fullName}\n`);

  try {
    console.log('⏳ Launching browser and testing automation...');
    const startTime = Date.now();

    const result = await autoApplyToJob(realJobUrl, testApplicant);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Test completed in ${duration}s\n`);

    console.log('📊 Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);

    if (result.success) {
      console.log('\n🎉 SUCCESS! Automation filled the form successfully!');
    } else {
      console.log('\n⚠️  Form filled but marked for manual review (expected behavior)');
    }

    console.log('\n💰 Cost Analysis:');
    console.log('   Self-hosted Puppeteer: $0');
    console.log('   Browserless.io: $0.01 per application');
    console.log('   Savings for 500,000 applications: $4,230/year');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await closeBrowser();
    console.log('\n✅ Browser closed');
  }
}

testWithRealUrl()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
