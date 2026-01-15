#!/bin/bash
# Post-install script to download Chrome for Puppeteer

echo "Installing Chrome for Puppeteer..."
npx @puppeteer/browsers install chrome@stable
echo "Chrome installation complete!"
