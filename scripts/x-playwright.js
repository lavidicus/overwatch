#!/usr/bin/env node
const playwright = require('/home/localadmin/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_FILE = path.join(__dirname, '../credentials/x.json');
const OUTPUT_DIR = '/tmp';
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));

async function browseX(action, target) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('🔑 Logging into X...');
    await page.goto('https://x.com/i/flow/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Type username slowly like a human
    console.log('📝 Entering username...');
    const usernameInput = await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 });
    await usernameInput.click();
    await page.waitForTimeout(500);
    await usernameInput.type(credentials.email, { delay: 80 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'x-step1.png') });

    // Click Next button
    console.log('➡️ Clicking Next...');
    await page.click('[role="button"]:has-text("Next")');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'x-step2.png') });

    // Check for unusual activity / email verification
    const verifyInput = await page.$('input[data-testid="ocfEnterTextTextInput"]');
    if (verifyInput) {
      console.log('📧 Unusual activity check — entering username...');
      await verifyInput.type(credentials.username.replace('@', ''), { delay: 80 });
      await page.click('[role="button"]:has-text("Next")');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'x-step2b.png') });
    }

    // Enter password
    console.log('🔐 Entering password...');
    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await passwordInput.click();
    await page.waitForTimeout(300);
    await passwordInput.type(credentials.password, { delay: 60 });
    await page.waitForTimeout(500);

    // Click Log in
    console.log('🚀 Clicking Log in...');
    await page.click('[role="button"]:has-text("Log in")');
    await page.waitForTimeout(5000);

    const postLoginUrl = page.url();
    console.log(`📍 Post-login: ${postLoginUrl}`);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'x-step3.png') });

    if (postLoginUrl.includes('/home') || !postLoginUrl.includes('/flow/')) {
      console.log('✅ Login successful!');
    } else {
      console.log('⚠️ Login may not have completed');
    }

    // Step 2: Navigate
    let targetUrl;
    if (action === 'search') {
      targetUrl = `https://x.com/search?q=${encodeURIComponent(target)}&src=typed_query&f=live`;
    } else if (action === 'profile') {
      targetUrl = `https://x.com/${target.replace('@', '')}`;
    } else if (action === 'home') {
      targetUrl = 'https://x.com/home';
    } else {
      targetUrl = target || 'https://x.com/home';
    }

    console.log(`🔍 Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Screenshot
    const screenshotPath = path.join(OUTPUT_DIR, `x-result-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Result screenshot: ${screenshotPath}`);

    // Extract tweets
    try {
      const tweets = await page.$$eval('[data-testid="tweetText"]', els =>
        els.slice(0, 10).map(el => el.textContent)
      );
      if (tweets.length > 0) {
        console.log(`\n📝 Found ${tweets.length} tweets:`);
        tweets.forEach((t, i) => console.log(`  ${i+1}. ${t.substring(0, 250)}`));
      } else {
        console.log('⚠️ No tweets found');
      }
    } catch (e) {
      console.log('⚠️ Could not extract tweets');
    }

    // Extract images
    try {
      const images = await page.$$eval('img[src*="pbs.twimg.com/media"]', els =>
        els.slice(0, 10).map(el => el.src)
      );
      if (images.length > 0) {
        console.log(`\n🖼️ Found ${images.length} images:`);
        images.forEach((url, i) => console.log(`  ${i+1}. ${url}`));
      }
    } catch (e) { /* no images */ }

    console.log(`\n📄 Title: ${await page.title()}`);
    console.log(`🔗 URL: ${page.url()}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'x-error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

const action = process.argv[2] || 'home';
const target = process.argv.slice(3).join(' ');
browseX(action, target);
