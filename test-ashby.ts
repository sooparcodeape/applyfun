/**
 * Test automation with Ashby ATS platform
 */

import { autoApplyToJob, closeBrowser } from './server/job-automation';
import type { JobApplicationData } from './server/job-automation';

async function testAshby() {
  console.log('🧪 Testing automation with Ashby ATS platform\n');

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

  // Real Ashby job posting from Conduit
  const ashbyUrl = 'https://jobs.ashbyhq.com/conduit/7a718747-270a-4a15-ae79-da5e1ddda5cd';
  
  console.log('📋 Test Configuration:');
  console.log(`   Platform: Ashby ATS`);
  console.log(`   Job URL: ${ashbyUrl}`);
  console.log(`   Applicant: ${testApplicant.fullName}\n`);

  try {
    console.log('⏳ Testing Ashby form detection and filling...');
    const startTime = Date.now();

    const result = await autoApplyToJob(ashbyUrl, testApplicant);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Test completed in ${duration}s\n`);

    console.log('📊 Ashby ATS Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);

    if (result.message.includes('field')) {
      const match = result.message.match(/(\d+) field/);
      const fieldsCount = match ? parseInt(match[1]) : 0;
      console.log(`   Fields Filled: ${fieldsCount}`);
      
      if (fieldsCount > 0) {
        console.log('\n✅ SUCCESS! Ashby form detection working!');
      } else {
        console.log('\n⚠️  No fields detected - may need selector adjustment');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Ashby test failed:', error.message);
  } finally {
    await closeBrowser();
  }
}

testAshby()
  .then(() => {
    console.log('\n✅ Ashby test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
