#!/usr/bin/env node
/**
 * Yandex Reverse Image Search - Enhanced with actual image URLs
 */

require('dotenv').config({ path: '/home/localadmin/.openclaw/workspace/skills/browser-automation/.env' });

const { Browserbase } = require('@browserbasehq/sdk');
const { chromium } = require('playwright');

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

class YandexDetailedSearch {
  constructor() {
    this.browserbase = new Browserbase({ apiKey: BROWSERBASE_API_KEY });
    this.baseUrl = 'https://yandex.com/images/';
  }

  async search(imagePath) {
    console.log(`🔍 Yandex reverse image search with image URLs...`);

    let session;
    let browser;

    try {
      session = await this.browserbase.sessions.create({ projectId: BROWSERBASE_PROJECT_ID });
      
      browser = await chromium.connectOverCDP(
        `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${session.id}`
      );
      
      const page = await browser.newPage();
      
      // Navigate
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      await new Promise(r => setTimeout(r, 2000));
      
      // Upload
      await page.setInputFiles('input[type="file"]', imagePath);
      await new Promise(r => setTimeout(r, 12000));
      
      // Take screenshot
      await page.screenshot({ path: '/tmp/yandex-detailed.png' });
      
      // Extract actual image URLs and metadata
      const images = await page.evaluate(() => {
        const results = [];
        
        // Look for Yandex image result containers
        const selectors = [
          '[data-testid="match-item"]',
          '[class*="match"]',
          '[class*="result"]',
          '.cbir-result',
          '[class*="similar"]'
        ];
        
        selectors.forEach(sel => {
          const elements = document.querySelectorAll(sel);
          elements.forEach(el => {
            const img = el.querySelector('img');
            const link = el.querySelector('a');
            
            if (img || link) {
              results.push({
                imageUrl: img?.src || 'N/A',
                title: img?.alt || el.querySelector('[class*="title"]')?.textContent?.trim() || 'No title',
                url: link?.href || 'N/A',
                width: img?.width || 'N/A',
                height: img?.height || 'N/A'
              });
            }
          });
        });
        
        // Also get direct similar images URLs
        const similarImages = Array.from(document.querySelectorAll('img[src*="avatars.mds.yandex.net"]'))
          .slice(0, 15)
          .map(img => ({
            imageUrl: img.src,
            title: 'Similar Image',
            url: img.closest('a')?.href || 'N/A'
          }));
        
        return [...results, ...similarImages].slice(0, 15);
      });
      
      console.log('\n' + '='.repeat(70));
      console.log('🖼️ Yandex Similar Images - Direct URLs');
      console.log('='.repeat(70));
      
      if (images.length === 0) {
        console.log('⚠️ No similar images found');
      } else {
        images.forEach((img, i) => {
          console.log(`\n${i + 1}. ${img.title}`);
          console.log(`   🖼️ Image: ${img.imageUrl}`);
          if (img.url && img.url !== 'N/A') {
            console.log(`   🔗 Source: ${img.url}`);
          }
          if (img.width !== 'N/A') {
            console.log(`   📐 Size: ${img.width} x ${img.height}`);
          }
        });
      }
      
      console.log('\n' + '='.repeat(70));
      console.log(`Found ${images.length} similar images`);
      console.log('📸 Full screenshot: /tmp/yandex-detailed.png');
      
      return { images, count: images.length };
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    } finally {
      if (session) await this.browserbase.sessions.stop(session.id);
      if (browser) await browser.close();
    }
  }
}

// Test with specific image
if (require.main === module) {
  const search = new YandexDetailedSearch();
  const imagePath = process.argv[2] || '/home/localadmin/.openclaw/media/inbound/095159b1-5053-4f64-bb86-3b26fb599625.png';
  
  search.search(imagePath).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = YandexDetailedSearch;
