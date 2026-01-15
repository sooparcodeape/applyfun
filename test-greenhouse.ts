/**
 * Test automation with Greenhouse ATS platform
 */

import { autoApplyToJob, closeBrowser } from './server/job-automation';
import type { JobApplicationData } from './server/job-automation';

async function testGreenhouse() {
  console.log('🧪 Testing automation with Greenhouse ATS platform\n');

  const testApplicant: JobApplicationData = {
    fullName: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedinUrl: 'https://linkedin.com/in/johnsmith',
    githubUrl: 'https://github.com/johnsmith',
    portfolioUrl: 'https://johnsmith.dev',
    coverLetter: `Dear Hiring Manager,

I am excited to apply for this blockchain engineering position. With 5 years of experience in Web3 development and a strong background in distributed systems, I believe I would be a great fit for your team.

My experience includes:
- Building smart contracts on Ethereum and Solana
- Developing DeFi protocols with over $10M TVL
- Leading engineering teams in fast-paced startup environments

I am passionate about decentralized technologies and would love to contribute to your mission.

Best regards,
John Smith`,
    skills: ['Solidity', 'Rust', 'Go', 'React', 'TypeScript', 'Web3.js'],
    experience: '5 years of blockchain development',
  };

  // Real Greenhouse job posting from Blockchain.com
  const greenhouseUrl = 'https://job-boards.greenhouse.io/blockchain/jobs/7216427';
  
  console.log('📋 Test Configuration:');
  console.log(`   Platform: Greenhouse ATS`);
  console.log(`   Job URL: ${greenhouseUrl}`);
  console.log(`   Applicant: ${testApplicant.fullName}\n`);

  try {
    console.log('⏳ Testing Greenhouse form detection and filling...');
    const startTime = Date.now();

    const result = await autoApplyToJob(greenhouseUrl, testApplicant);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Test completed in ${duration}s\n`);

    console.log('📊 Greenhouse ATS Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);

    if (result.message.includes('field')) {
      const match = result.message.match(/(\d+) field/);
      const fieldsCount = match ? parseInt(match[1]) : 0;
      console.log(`   Fields Filled: ${fieldsCount}`);
      
      if (fieldsCount > 0) {
        console.log('\n✅ SUCCESS! Greenhouse form detection working!');
      } else {
        console.log('\n⚠️  No fields detected - may need selector adjustment');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Greenhouse test failed:', error.message);
  } finally {
    await closeBrowser();
  }
}

testGreenhouse()
  .then(() => {
    console.log('\n✅ Greenhouse test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
