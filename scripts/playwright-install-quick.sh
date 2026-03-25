#!/bin/bash
# Quick install script for Playwright Chromium dependencies

echo "🔧 Installing Playwright Chromium dependencies..."

# Use sudo with password piped
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 2>&1 | tail -10

echo "✅ Done! Now test with:"
echo "   node ~/.openclaw/workspace/scripts/x-playwright.js search 'Iran Israel'"
