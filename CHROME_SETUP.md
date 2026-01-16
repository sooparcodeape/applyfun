# Chrome Dependencies Setup

## Problem

The automation and Rain scraper are failing with this error:
```
error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file: No such file or directory
```

This happens because Chrome requires system libraries that aren't installed by default.

## Solution

Run the setup script **once** to install all required Chrome dependencies:

```bash
cd /home/ubuntu/crypto-job-auto-apply
sudo bash setup-chrome.sh
```

This will install:
- libglib2.0-0 (required)
- libnss3, libnspr4 (security libraries)
- libatk, libcups, libdrm (UI libraries)
- And 10+ other dependencies

## After Setup

Once the setup completes, these features will work:
- ✅ Job automation (auto-apply)
- ✅ Rain scraper (Ashby jobs)
- ✅ All Puppeteer-based scrapers

## Verification

Test that Chrome works:
```bash
cd /home/ubuntu/crypto-job-auto-apply
npx tsx -e "
import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  console.log('✅ Chrome launched successfully!');
  await browser.close();
})();
"
```

If you see "✅ Chrome launched successfully!", the setup worked!

## Troubleshooting

If the setup script fails, manually install the dependencies:
```bash
sudo apt-get update
sudo apt-get install -y libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libxshmfence1
```
