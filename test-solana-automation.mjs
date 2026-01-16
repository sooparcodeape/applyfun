import { autoApplyToJob } from './server/job-automation.ts';

const testUrl = 'https://jobs.solana.com/companies/crossmint-2/jobs/65260579-finance-analyst-spain';

const applicantData = {
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  location: 'San Francisco, CA',
  resumeUrl: 'https://storage.manus.im/f/f8a3b2c1/Resume_Harsh-1.pdf',
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  githubUrl: 'https://github.com/johndoe',
};

console.log(`Testing Solana automation with URL: ${testUrl}\n`);

const result = await autoApplyToJob(testUrl, applicantData);

console.log('\n=== RESULT ===');
console.log(`Success: ${result.success}`);
console.log(`Message: ${result.message}`);
