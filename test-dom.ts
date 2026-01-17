import { autoApplyToJob } from './server/job-automation';

const TEST_JOB_URL = 'https://jobs.ashbyhq.com/rain/482b165f-2ef9-41ff-8b88-87e7e6714dc8/application';

const TEST_APPLICANT_DATA = {
  fullName: 'Harsh Test',
  email: 'harsh@example.com',
  phone: '+91-7454917051',
  location: 'San Francisco, CA',
  linkedinUrl: null,
  githubUrl: null,
  portfolioUrl: null,
  resumeUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663252503662/G7Bah27Bb9yyPz9EaUBZuy/150288/resumes/Resume_Harsh-1.pdf-wa9ewc',
  yearsOfExperience: null,
  currentCompany: null,
  currentTitle: null,
  workAuthorization: null,
  howDidYouHear: null,
  availableStartDate: null,
  willingToRelocate: false,
};

console.log('🧪 Testing DOM Traversal Field Detection');
console.log('=========================================\n');
console.log('Job URL:', TEST_JOB_URL);
console.log('Applicant:', TEST_APPLICANT_DATA.fullName);
console.log('\n🚀 Starting automated application...\n');

(async () => {
  try {
    const result = await autoApplyToJob(
      TEST_JOB_URL,
      TEST_APPLICANT_DATA,
      1 // application ID
    );
    
    console.log('\n✅ Application completed!');
    console.log('=========================================');
    console.log('Success:', result.success);
    console.log('Fields filled:', result.fieldsFilledCount);
    console.log('Resume uploaded:', result.resumeUploadSuccess);
    console.log('ATS detected:', result.atsType);
    console.log('Message:', result.message);
    
    if (result.error) {
      console.log('\n❌ Error:', result.error);
    }
    
    if (result.screenshotPath) {
      console.log('\n📸 Screenshot saved:', result.screenshotPath);
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
