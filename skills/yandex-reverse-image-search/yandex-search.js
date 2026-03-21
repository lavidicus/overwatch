#!/usr/bin/env node
/**
 * Yandex Reverse Image Search - Direct Playwright Implementation
 * Uses Playwright's Chromium (already installed) for browser automation
 */

const playwright = require('/home/localadmin/.openclaw/workspace/mission-control/node_modules/playwright');
const { chromium } = playwright;
const fs = require('fs');
const path = require('path');

class YandexReverseSearch {
  constructor() {
    this.baseUrl = 'https://yandex.com/images/';
  }

  async search(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }

    console.log(`🔍 Starting Yandex reverse image search...`);
    console.log(`📁 Image: ${imagePath}`);

    let browser;
    try {
      // Launch Chromium (uses Playwright's bundled Chromium)
      browser = await chromium.launch({
        headless: true
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();

      // Step 1: Navigate to Yandex Images
      console.log('🌐 Opening Yandex Images...');
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });

      // Step 2: Click the camera icon (search by image)
      console.log('📷 Clicking camera icon...');
      await page.waitForSelector('input[type="file"]', { state: 'visible' }).catch(async () => {
        // Try to find and click camera icon first
        const cameraIcon = await page.$('[data-testid="camera-icon"]') || 
                          await page.$('[aria-label*="image"]') ||
                          await page.$('[aria-label*="camera"]');
        if (cameraIcon) {
          await cameraIcon.click();
          await page.waitForTimeout(1000);
        }
      });

      // Step 3: Upload the image
      console.log('📤 Uploading image...');
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(imagePath);
        console.log('✅ Image uploaded');
      } else {
        // Try alternative: set input value directly
        await page.evaluate((path) => {
          const input = document.querySelector('input[type="file"]');
          if (input) {
            const file = new File([new ArrayBuffer(0)], 'temp.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
          }
        }, imagePath);
      }

      // Step 4: Wait for results to load
      console.log('⏳ Waiting for results...');
      await page.waitForTimeout(8000);

      // Step 5: Extract results
      console.log('📊 Extracting results...');
      const results = await page.evaluate(() => {
        const matches = [];
        
        // Try multiple selectors for results
        const selectors = [
          '[data-testid="match-item"]',
          '.search-match',
          '.results-item',
          '[class*="match"]',
          '[class*="result"]'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const title = el.querySelector('[class*="title"]')?.textContent || 
                         el.querySelector('[class*="name"]')?.textContent ||
                         el.textContent?.substring(0, 100) || 'Untitled';
            const url = el.querySelector('a')?.href || el.querySelector('img')?.src || 'Unknown';
            const img = el.querySelector('img')?.src || 'No image';
            
            matches.push({
              title: title.trim(),
              url: url,
              imageUrl: img
            });
          });
          if (matches.length > 0) break;
        }

        // If no structured matches, get similar images
        if (matches.length === 0) {
          const similarImages = Array.from(document.querySelectorAll('img[src*="preview"]')).slice(0, 10).map(img => ({
            title: 'Similar Image',
            url: img.src,
            imageUrl: img.src
          }));
          return similarImages;
        }

        return matches.slice(0, 10); // Limit to top 10 results
      });

      // Format output
      console.log('');
      console.log('='.repeat(60));
      console.log('🔍 Yandex Reverse Image Search Results');
      console.log('='.repeat(60));
      
      if (results.length === 0) {
        console.log('⚠️ No matching images found on Yandex.');
      } else {
        console.log(`✅ Found ${results.length} matches:\n`);
        results.forEach((match, i) => {
          console.log(`${i + 1}. **${match.title}**`);
          console.log(`   URL: ${match.url}`);
          console.log(`   Image: ${match.imageUrl}\n`);
        });
      }

      return {
        success: true,
        count: results.length,
        results: results
      };

    } catch (error) {
      console.error('❌ Error during search:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        console.log('🔒 Browser closed');
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node yandex-search.js <image-path>');
    console.log('');
    console.log('Example:');
    console.log('  node yandex-search.js /path/to/image.jpg');
    process.exit(1);
  }

  const search = new YandexReverseSearch();
  
  search.search(args[0])
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Search failed:', error.message);
      process.exit(1);
    });
}

module.exports = YandexReverseSearch;
