import { storagePut } from "./server/storage";
import fs from "fs";

async function uploadResume() {
  const file = fs.readFileSync("/home/ubuntu/upload/Resume_Harsh-1.pdf");
  const result = await storagePut("resumes/Resume_Harsh-1.pdf", file, "application/pdf");
  console.log("Resume uploaded successfully!");
  console.log("URL:", result.url);
  console.log("Key:", result.key);
}

uploadResume();
