/**
 * Test automation with Lever ATS platform
 */

import { autoApplyToJob, closeBrowser } from './server/job-automation';
import type { JobApplicationData } from './server/job-automation';

async function testLever() {
  console.log('🧪 Testing automation with Lever ATS platform\n');

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

Best regards,
John Smith`,
    skills: ['Solidity', 'Rust', 'Go', 'React', 'TypeScript', 'Web3.js'],
    experience: '5 years of blockchain development',
  };

  // Real Lever job posting from Crypto.com
  const leverUrl = 'https://jobs.lever.co/crypto/b78de1a1-607d-4400-830c-771dba7b5ce2';
  
  console.log('📋 Test Configuration:');
  console.log(`   Platform: Lever ATS`);
  console.log(`   Job URL: ${leverUrl}`);
  console.log(`   Applicant: ${testApplicant.fullName}\n`);

  try {
    console.log('⏳ Testing Lever form detection and filling...');
    const startTime = Date.now();

    const result = await autoApplyToJob(leverUrl, testApplicant);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Test completed in ${duration}s\n`);

    console.log('📊 Lever ATS Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);

    if (result.message.includes('field')) {
      const match = result.message.match(/(\d+) field/);
      const fieldsCount = match ? parseInt(match[1]) : 0;
      console.log(`   Fields Filled: ${fieldsCount}`);
      
      if (fieldsCount > 0) {
        console.log('\n✅ SUCCESS! Lever form detection working!');
      } else {
        console.log('\n⚠️  No fields detected - may need selector adjustment');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Lever test failed:', error.message);
  } finally {
    await closeBrowser();
  }
}

testLever()
  .then(() => {
    console.log('\n✅ Lever test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
