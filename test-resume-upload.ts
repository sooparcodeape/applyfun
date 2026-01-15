import { storagePut } from './server/storage';
import { autoApplyToJob } from './server/job-automation';
import * as fs from 'fs';
import * as path from 'path';

async function testResumeUpload() {
  console.log('🧪 Testing Resume Upload Functionality\n');
  
  try {
    // Step 1: Upload resume to S3
    console.log('📤 Step 1: Uploading resume to S3...');
    const resumePath = '/home/ubuntu/upload/Resume_Harsh-1.pdf';
    const resumeBuffer = fs.readFileSync(resumePath);
    
    const fileKey = `test-resumes/harsh-resume-${Date.now()}.pdf`;
    const { url: resumeUrl } = await storagePut(
      fileKey,
      resumeBuffer,
      'application/pdf'
    );
    
    console.log(`✅ Resume uploaded successfully!`);
    console.log(`   S3 URL: ${resumeUrl}\n`);
    
    // Step 2: Test automation with resume
    console.log('🤖 Step 2: Testing automation with resume upload...');
    console.log('   Using Lever job with file upload support\n');
    
    const jobUrl = 'https://jobs.lever.co/crypto/b78de1a1-607d-4400-830c-771dba7b5ce2';
    
    const testApplicant = {
      fullName: 'Harsh Patel',
      email: 'harsh@example.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      linkedinUrl: 'https://linkedin.com/in/harsh',
      githubUrl: 'https://github.com/harsh',
      coverLetter: 'I am excited to apply for this position...',
      resumeUrl: resumeUrl, // Include resume URL
    };
    
    console.log('⏳ Running automation (this may take 30-60 seconds)...\n');
    const result = await autoApplyToJob(jobUrl, testApplicant);
    
    // Step 3: Display results
    console.log('📊 Test Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.message.includes('Resume uploaded')) {
      console.log('\n✅ SUCCESS! Resume upload working correctly!');
    } else if (result.message.includes('fields')) {
      console.log('\n⚠️  Form fields filled, but check if resume was uploaded');
      console.log('   (Some job forms may not have file upload fields)');
    } else {
      console.log('\n❌ Resume upload may have failed');
    }
    
    console.log('\n📝 Resume Details:');
    console.log(`   File: Resume_Harsh-1.pdf`);
    console.log(`   S3 URL: ${resumeUrl}`);
    console.log(`   Size: ${(resumeBuffer.length / 1024).toFixed(2)} KB`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testResumeUpload();
