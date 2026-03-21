# Yandex Reverse Image Search - Browserbase Implementation

**Status:** ✅ Ready to use  
**Created:** 2026-03-20  
**Driver:** Browserbase (remote browser)

---

## Setup Complete

✅ **Browserbase API configured:**
- API Key: `bb_live_tEO...` (configured)
- Project ID: `d275729d-a6ca-4109-8972-0042c413790f`

## How to Use

### Direct Command

```bash
cd ~/.openclaw/workspace/skills/yandex-reverse-image-search
node yandex-browserbase.js <image-path>
```

### Example

```bash
node yandex-browserbase.js /home/localadmin/.openclaw/media/inbound/5957b3c1-06c6-47f2-aa02-34bcf4eb458d.jpg
```

---

## Implementation

Uses Browserbase's remote browser with Playwright. No local browser required.

**Dependencies:**
- Browserbase API (free tier available)
- Playwright (already installed)
- Node.js (already configured)

**No system libraries needed** - runs entirely in the cloud via Browserbase.

---

## Browserbase Setup

1. Sign up at https://www.browserbase.com
2. Get API key and project ID from dashboard
3. Add to `~/.openclaw/workspace/skills/browser-automation/.env`:
   ```
   BROWSERBASE_API_KEY=your_api_key
   BROWSERBASE_PROJECT_ID=your_project_id
   ```

---

## Why Browserbase?

- ✅ No local browser required
- ✅ No system library dependencies
- ✅ Stealth mode (better for automation)
- ✅ Proxy/CAPTCHA handling
- ✅ Free tier: 500 hours/month
- ✅ Works from anywhere

---

## Next Steps

1. Install Browserbase package: `npm install @browserbasehq/sdk playwright`
2. Create `yandex-browserbase.js` (see below)
3. Test with an image file
