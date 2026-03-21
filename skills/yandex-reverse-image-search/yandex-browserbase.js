#!/usr/bin/env node
/**
 * Yandex Reverse Image Search - Browserbase Implementation
 * Uses Browserbase remote browser (no local Chrome needed)
 */

require('dotenv').config({ path: '/home/localadmin/.openclaw/workspace/skills/browser-automation/.env' });

const { Browserbase } = require('@browserbasehq/sdk');
const { chromium } = require('playwright');

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
  console.error('❌ Browserbase credentials not found!');
  console.error('Expected: BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID in .env');
  process.exit(1);
}

class YandexBrowserbaseSearch {
  constructor() {
    this.browserbase = new Browserbase({
      apiKey: BROWSERBASE_API_KEY
    });
    this.baseUrl = 'https://yandex.com/images/';
  }

  async search(imagePath) {
    if (!require('fs').existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }

    console.log(`🔍 Starting Yandex reverse image search via Browserbase...`);
    console.log(`📁 Image: ${imagePath}`);
    console.log(`🌐 Browserbase Project: ${BROWSERBASE_PROJECT_ID}`);

    let session;
    let browser;

    try {
      // Step 1: Create Browserbase session
      console.log('🚀 Creating Browserbase session...');
      session = await this.browserbase.sessions.create({
        projectId: BROWSERBASE_PROJECT_ID
      });
      console.log(`✅ Session created: ${session.id}`);

      // Step 2: Connect Playwright to Browserbase
      console.log('🔗 Connecting Playwright to Browserbase...');
      const browserContext = await chromium.connectOverCDP(
        `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${session.id}`
      );
      
      browser = browserContext;

      // Step 3: Create page
      const page = await browserContext.newPage();

      // Step 4: Navigate to Yandex Images
      console.log('🌐 Opening Yandex Images...');
      await page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      // Step 5: Take screenshot to verify
      await page.screenshot({ 
        path: '/tmp/yandex-start.png',
        fullPage: true
      });
      console.log('📸 Screenshot saved to /tmp/yandex-start.png');

      // Step 6: Find and upload image
      console.log('📷 Looking for image upload...');
      
      // Try to find file input
      try {
        await page.waitForSelector('input[type="file"]', { timeout: 5000 });
        const fileInput = await page.$('input[type="file"]');
        
        if (fileInput) {
          await fileInput.uploadFile(imagePath);
          console.log('✅ Image uploaded via file input');
        } else {
          console.log('⚠️ No file input found, trying click method...');
          // Try clicking camera icon
          const cameraSelectors = [
            '[data-testid="camera-icon"]',
            '[aria-label*="search by image"]',
            '[aria-label*="camera"]',
            'button[aria-label*="image"]',
            'svg*icon',
            '.camera-icon'
          ];
          
          for (const selector of cameraSelectors) {
            const element = await page.$(selector);
            if (element) {
              await element.click();
              await new Promise(r => setTimeout(r, 1500));
              
              // Now try to upload
              const newFileInput = await page.$('input[type="file"]');
              if (newFileInput) {
                await newFileInput.uploadFile(imagePath);
                console.log('✅ Image uploaded after clicking camera');
                break;
              }
            }
          }
        }
      } catch (uploadError) {
        console.error('⚠️ Upload failed:', uploadError.message);
        console.log('📤 Trying direct upload with setInputFiles...');
        // Use Playwright's setInputFiles
        try {
          await page.setInputFiles('input[type="file"]', imagePath);
          console.log('✅ Image uploaded via setInputFiles');
        } catch (e) {
          console.error('❙ setInputFiles failed:', e.message);
          throw e;
        }
      }

      // Step 7: Wait for results
      console.log('⏳ Waiting for Yandex to process...');
      await new Promise(r => setTimeout(r, 10000));

      // Step 8: Take results screenshot
      await page.screenshot({ 
        path: '/tmp/yandex-results.png',
        fullPage: true
      });
      console.log('📸 Results screenshot saved to /tmp/yandex-results.png');

      // Step 9: Extract results
      console.log('📊 Extracting results...');
      const results = await page.evaluate(() => {
        const matches = [];
        
        // Look for match items
        const matchSelectors = [
          '[data-testid="match-item"]',
          '[class*="match"]',
          '[class*="result"]',
          '.search-match'
        ];

        for (const selector of matchSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const title = el.querySelector('[class*="title"]')?.textContent?.trim() || 
                         el.querySelector('[class*="name"]')?.textContent?.trim() ||
                         el.textContent?.trim().substring(0, 80) || 'Untitled';
            const url = el.querySelector('a')?.href || 'Unknown';
            const img = el.querySelector('img')?.src || 'No image';
            
            if (!matches.some(m => m.url === url)) {
              matches.push({ title, url, imageUrl: img });
            }
          });
          if (matches.length >= 3) break;
        }

        // Get similar images if no structured matches
        if (matches.length === 0) {
          const imgs = Array.from(document.querySelectorAll('img[src]'))
            .slice(0, 10)
            .map(img => ({
              title: 'Similar Image',
              url: img.src,
              imageUrl: img.src
            }));
          return imgs;
        }

        return matches.slice(0, 10);
      });

      // Format output
      console.log('\n' + '='.repeat(60));
      console.log('🔍 Yandex Reverse Image Search Results (Browserbase)');
      console.log('='.repeat(60));
      
      if (results.length === 0) {
        console.log('⚠️ No matching images found on Yandex.');
        console.log('📸 Check /tmp/yandex-results.png for the page state');
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
        results: results,
        screenshot: '/tmp/yandex-results.png'
      };

    } catch (error) {
      console.error('❌ Error during search:', error.message);
      
      // Save error screenshot
      try {
        if (browser) {
          const pages = await browser.pages();
          if (pages.length > 0) {
            await pages[0].screenshot({ path: '/tmp/yandex-error.png' });
            console.log('📸 Error screenshot saved to /tmp/yandex-error.png');
          }
        }
      } catch (e) {
        // Ignore screenshot errors
      }
      
      throw error;
    } finally {
      // Clean up
      if (session) {
        try {
          await this.browserbase.sessions.stop(session.id);
          console.log('🔒 Browserbase session stopped');
        } catch (e) {
          // Session may already be stopped
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore
        }
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node yandex-browserbase.js <image-path>');
    console.log('');
    console.log('Example:');
    console.log('  node yandex-browserbase.js /path/to/image.jpg');
    process.exit(1);
  }

  const search = new YandexBrowserbaseSearch();
  
  search.search(args[0])
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Search failed:', error.message);
      process.exit(1);
    });
}

module.exports = YandexBrowserbaseSearch;
