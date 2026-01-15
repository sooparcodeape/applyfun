import { autoApplyToJob } from './server/job-automation';

async function testE2EAutomation() {
  console.log('🧪 End-to-End Automation Test\n');
  console.log('Testing: jobs.solana.com URL → Automation clicks Apply → Fills form\n');
  
  const testData = {
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    website: 'https://johndoe.com',
    resumeUrl: 'https://storage.example.com/resumes/john-doe.pdf',
    coverLetter: 'I am excited to apply for this position...',
    yearsOfExperience: '5',
    currentCompany: 'Tech Corp',
    currentTitle: 'Senior Engineer',
  };
  
  // Test with a real Solana job URL
  const testJobUrl = 'https://jobs.solana.com/companies/helius/jobs/65254078-senior-product-manager';
  
  console.log(`📋 Job URL: ${testJobUrl}`);
  console.log(`👤 Applicant: ${testData.fullName}\n`);
  
  try {
    console.log('⏳ Starting automation...\n');
    const result = await autoApplyToJob(testJobUrl, testData);
    
    console.log('\n✅ Automation completed!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Fields filled: ${result.fieldsFilledCount}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.status === 'success') {
      console.log('\n🎉 SUCCESS! Automation works end-to-end!');
    } else if (result.status === 'manual_review_required') {
      console.log('\n✅ Marked for manual review (expected for complex forms)');
    } else {
      console.log('\n⚠️  Automation failed, check logs above');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testE2EAutomation();
