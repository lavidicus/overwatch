#!/usr/bin/env node
/**
 * Yandex Reverse Image Search - Improved Extraction
 */

require('dotenv').config({ path: '/home/localadmin/.openclaw/workspace/skills/browser-automation/.env' });

const { Browserbase } = require('@browserbasehq/sdk');
const { chromium } = require('playwright');

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

class YandexImprovedSearch {
  constructor() {
    this.browserbase = new Browserbase({ apiKey: BROWSERBASE_API_KEY });
    this.baseUrl = 'https://yandex.com/images/';
  }

  async search(imagePath) {
    console.log(`🔍 Yandex reverse image search...`);

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
      await new Promise(r => setTimeout(r, 10000));
      
      // Take screenshot
      await page.screenshot({ path: '/tmp/yandex-improved.png' });
      
      // Get full page content for analysis
      const content = await page.content();
      const html = await page.evaluate(() => document.body.innerHTML);
      
      // Extract all text from page
      const textContent = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return text.substring(0, 5000);
      });
      
      // Try to find person names or descriptions
      const matches = await page.evaluate(() => {
        const results = [];
        
        // Look for common Yandex result patterns
        const selectors = [
          '[class*="match"]',
          '[class*="result"]',
          '[data-testid*="match"]',
          '.cbir-result',
          '[class*="title"]',
          '[class*="name"]',
          '[class*="description"]',
          '[class*="caption"]'
        ];
        
        selectors.forEach(sel => {
          const elements = document.querySelectorAll(sel);
          elements.forEach(el => {
            const text = el.innerText?.trim();
            const href = el.href || el.closest('a')?.href;
            if (text && text.length > 5 && text.length < 200) {
              results.push({ text, href, selector: sel });
            }
          });
        });
        
        return results.slice(0, 15);
      });
      
      console.log('\n' + '='.repeat(60));
      console.log('🔍 Yandex Results (Improved Extraction)');
      console.log('='.repeat(60));
      
      if (matches.length === 0) {
        console.log('⚠️ No structured results found');
        console.log('📸 Full page screenshot: /tmp/yandex-improved.png');
      } else {
        console.log(`\nFound ${matches.length} potential matches:\n`);
        matches.forEach((m, i) => {
          console.log(`${i + 1}. ${m.text.substring(0, 100)}`);
          if (m.href) console.log(`   URL: ${m.href}`);
          console.log('');
        });
      }
      
      // Also try to extract from page text
      console.log('\n📄 Page text preview:');
      console.log(textContent.substring(0, 2000));
      
      return { success: true, matches, screenshot: '/tmp/yandex-improved.png' };
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    } finally {
      if (session) await this.browserbase.sessions.stop(session.id);
      if (browser) await browser.close();
    }
  }
}

// Test
if (require.main === module) {
  const search = new YandexImprovedSearch();
  const imagePath = process.argv[2] || '/home/localadmin/.openclaw/media/inbound/c4334cb1-b670-465d-adf4-a23bf08be580.png';
  
  search.search(imagePath).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = YandexImprovedSearch;
