import { autoApplyToJob } from './server/job-automation';

async function test() {
  console.log('Testing automation with Chrome dependencies installed...');
  
  const testJobUrl = 'https://cryptocurrencyjobs.co/engineering/hummingbot-foundation-full-stack-engineer/';
  
  try {
    const result = await autoApplyToJob(testJobUrl, {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      resumeUrl: 'https://example.com/resume.pdf',
      coverLetter: 'I am very interested in this position.',
      linkedin: 'https://linkedin.com/in/johndoe',
      portfolio: 'https://github.com/johndoe',
      yearsOfExperience: '5',
    });
    
    console.log('\n=== Result ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('\n=== Failed ===');
    console.error(error.message || error);
  }
}

test();
