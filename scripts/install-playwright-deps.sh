#!/bin/bash
set -e

echo "🔧 Installing Playwright Chromium dependencies..."

# Update package lists
sudo apt-get update -qq

# Install dependencies
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  libnspr4 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  libatspi2.0-0

echo "✅ Dependencies installed!"
echo "🚀 Now run: node ~/.openclaw/workspace/scripts/x-playwright.js search 'query'"
