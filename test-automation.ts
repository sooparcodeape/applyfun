import { processJobApplication } from './server/job-automation';

async function test() {
  console.log('Testing automation with Chrome dependencies installed...');
  
  // Use a simple job URL for testing
  const testJobUrl = 'https://cryptocurrencyjobs.co/engineering/hummingbot-foundation-full-stack-engineer/';
  
  try {
    const result = await processJobApplication(1, testJobUrl, {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      resumeUrl: 'https://example.com/resume.pdf',
      coverLetter: 'Test cover letter',
      linkedin: 'https://linkedin.com/in/testuser',
      portfolio: 'https://github.com/testuser',
      yearsOfExperience: '5',
    });
    
    console.log('\n=== Automation Result ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n=== Automation Failed ===');
    console.error(error);
  }
}

test();
