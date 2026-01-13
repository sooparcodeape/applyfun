import { saveWeb3CareerJobs } from "./server/scrapers/web3career.js";

console.log("Testing Web3Career scraper...\n");

saveWeb3CareerJobs()
  .then((result) => {
    console.log("\n✅ Scraper test complete!");
    console.log(`Success: ${result.success}`);
    console.log(`Jobs saved: ${result.count}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Scraper test failed:", error);
    process.exit(1);
  });
