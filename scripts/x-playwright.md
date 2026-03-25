# X (Twitter) Tool with Playwright

**Purpose:** Browse X.com using Playwright with your credentials

**Credentials:**
- **Username:** @Bjoyrn_
- **Email:** bjoyrn@grr.la
- **Stored in:** `~/.openclaw/workspace/credentials/x.json`

## Setup

**1. Install Playwright system dependencies:**
```bash
cd /home/localadmin/.npm-global/lib/node_modules/openclaw/node_modules
npx playwright install-deps chromium
```

**2. Playwright is already installed at:**
- `/home/localadmin/.npm-global/lib/node_modules/openclaw/node_modules/playwright-core`
- Chromium browser: `/home/localadmin/.cache/ms-playwright/`

## Usage

**From command line:**
```bash
# Search X
node scripts/x-playwright.js search "OpenClaw latest"

# View profile
node scripts/x-playwright.js profile @openclaw

# Browse X
node scripts/x-playwright.js browse "https://x.com/search?q=Iran%20Israel"
```

**From chat:**
- "Browse X for OpenClaw news"
- "Check X for @openclaw profile"
- "Show X Iran Israel updates"

**Browser Tool:**
- Playwright is available in OpenClaw
- Just install system dependencies first
- Then use: `browser start` and `browser navigate`

## Script Location

**Playwright Browser Script:**
`~/.openclaw/workspace/scripts/x-playwright.js`

**X Tool Script:**
`~/.openclaw/workspace/scripts/x-tool.sh`
