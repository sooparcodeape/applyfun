#!/bin/bash

# Setup script to install Chrome system dependencies
# Run this once with: sudo bash setup-chrome.sh

set -e

echo "=== Installing Chrome System Dependencies ==="
echo ""

# Update package list
echo "Updating package list..."
apt-get update -qq

# Install required libraries for Chrome
echo "Installing Chrome dependencies..."
apt-get install -y \
  libglib2.0-0 \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  libatspi2.0-0 \
  libxshmfence1

echo ""
echo "=== Chrome Dependencies Installed Successfully ==="
echo ""
echo "You can now run:"
echo "  - Job automation (auto-apply)"
echo "  - Rain scraper (Ashby)"
echo "  - All other Puppeteer-based scrapers"
echo ""
