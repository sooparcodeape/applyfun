import { autoApplyToJob } from "./server/job-automation";

async function testLeverWithResume() {
  console.log("Testing Lever automation with resume upload...\n");
  console.log("Chrome path:", "/home/ubuntu/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome");
  
  // Set timeout
  const timeout = setTimeout(() => {
    console.error("Test timeout after 2 minutes");
    process.exit(1);
  }, 120000);

  const applicantData = {
    fullName: "Harsh Patel",
    email: "harsh@example.com",
    phone: "+1234567890",
    location: "San Francisco, CA",
    currentCompany: "Tech Corp",
    linkedinUrl: "https://linkedin.com/in/harsh",
    githubUrl: "https://github.com/harsh",
    resumeUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663252503662/G7Bah27Bb9yyPz9EaUBZuy/resumes/Resume_Harsh-1.pdf",
    resumeFileKey: "resumes/Resume_Harsh-1.pdf",
    coverLetter: "I am excited to apply for this position...",
    yearsOfExperience: "3-5 years",
  };

  const jobUrl = "https://jobs.lever.co/crypto/b78de1a1-607d-4400-830c-771dba7b5ce2/apply";

  try {
    const result = await autoApplyToJob(jobUrl, applicantData);
    console.log("\n=== Test Result ===");
    console.log(JSON.stringify(result, null, 2));
    clearTimeout(timeout);
  } catch (error) {
    console.error("Test failed:", error);
    clearTimeout(timeout);
  }
}

testLeverWithResume().then(() => process.exit(0)).catch(() => process.exit(1));
