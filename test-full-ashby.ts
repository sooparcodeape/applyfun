import { autoApplyToJob } from './server/job-automation';

console.log('🧪 Testing FULL Ashby Form with Radio Buttons');
console.log('==============================================');

const testData = {
  fullName: 'Harsh Kumar',
  firstName: 'Harsh',
  lastName: 'Kumar',
  email: 'harsh@example.com',
  phone: '+1-415-555-0123',
  location: 'San Francisco, CA',
  linkedinUrl: 'https://linkedin.com/in/harshkumar',
  githubUrl: 'https://github.com/harshkumar',
  twitterUrl: 'https://twitter.com/harshkumar',
  portfolioUrl: 'https://harshkumar.dev',
  currentCompany: 'Coinbase',
  currentTitle: 'Senior Backend Engineer',
  yearsOfExperience: '5+ years',
  workAuthorization: 'US Citizen',
  university: 'Stanford University',
  sponsorshipRequired: false, // Radio button: No
  fintechExperience: true, // Radio button: Yes
  fintechExperienceDescription: 'I have 5 years of experience building payment systems and crypto trading platforms at Coinbase. Led the development of our stablecoin settlement system handling $1B+ daily volume.',
  willingToRelocate: false,
  howDidYouHear: 'LinkedIn',
  coverLetter: 'I am excited to apply for this role at Rain. My experience in fintech and crypto aligns perfectly with your mission.',
  resumeUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663252503662/G7Bah27Bb9yyPz9EaUBZuy/150288/resumes/Resume_Harsh-1.pdf-wa9ewc',
};

console.log('Job URL: https://jobs.ashbyhq.com/rain/482b165f-2ef9-41ff-8b88-87e7e6714dc8/application');
console.log('Applicant:', testData.fullName);
console.log('Profile: COMPLETE (all fields including radio buttons)');
console.log('🚀 Starting automated application...\n');

autoApplyToJob(
  'https://jobs.ashbyhq.com/rain/482b165f-2ef9-41ff-8b88-87e7e6714dc8/application',
  testData,
  1 // maxRetries
).then((result) => {
  console.log('\n✅ Application completed!');
  console.log('=========================================');
  console.log('Success:', result.success);
  console.log('Fields filled:', result.fieldsFilled);
  console.log('Resume uploaded:', result.resumeUploaded);
  console.log('ATS detected:', result.atsType);
  console.log('Message:', result.message);
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Application failed:', error);
  process.exit(1);
});
