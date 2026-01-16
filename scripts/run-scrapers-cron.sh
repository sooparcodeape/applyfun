#!/bin/bash

# Cron job script to run all job scrapers daily at 3 AM UTC
# This script is designed to be run by cron

set -e

# Change to project directory
cd /home/ubuntu/crypto-job-auto-apply

# Log file
LOG_FILE="/home/ubuntu/crypto-job-auto-apply/logs/scraper-cron.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Log start time
echo "=== Scraper started at $(date) ===" >> "$LOG_FILE"

# Run scrapers using npx tsx
npx tsx -e "
import { runAllScrapers } from './server/scrapers/all-scrapers.js';

async function main() {
  try {
    console.log('Starting scheduled scraper run...');
    const results = await runAllScrapers();
    console.log('Scraper completed successfully');
    console.log('Results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Scraper failed:', error);
    process.exit(1);
  }
}

main();
" >> "$LOG_FILE" 2>&1

# Log end time
echo "=== Scraper completed at $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
