import { autoApplyToJob } from './server/job-automation.ts';

const testUrl = 'https://jobs.solana.com/companies/phantom/jobs/65258727-product-designer-wallet-platform';

const applicantData = {
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  location: 'San Francisco, CA',
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  githubUrl: 'https://github.com/johndoe',
};

console.log(`Testing Phantom job (Ashby redirect)...\n`);
console.log(`URL: ${testUrl}\n`);

const result = await autoApplyToJob(testUrl, applicantData);

console.log('\n=== RESULT ===');
console.log(`Success: ${result.success}`);
console.log(`Message: ${result.message}`);
