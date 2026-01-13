import { runAllScrapers } from "./server/scrapers/all-scrapers.js";

console.log("Testing all job scrapers...\n");

runAllScrapers()
  .then((results) => {
    console.log("\n✅ All scrapers completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Scraper test failed:", error);
    process.exit(1);
  });
