# remi OpenClaw Gateway Restart - Updated

**Date:** 2026-03-31 04:10 UTC  
**Host:** remi (remi@remi)

## Fix Applied

1. ✅ Moved extension from `matrix.disabled/` to `matrix/`
2. ✅ Created symlink: `~/.openclaw/extensions/matrix/node_modules -> ~/.npm-global/lib/node_modules/openclaw/node_modules`

## Current Status

Extension is now active and symlinked to the correct node_modules. However, running `node index.ts` directly still fails because the extension expects to be loaded by the main OpenClaw process.

## Next Step

The extension is designed to be loaded by OpenClaw's main process. Need to find how remi started OpenClaw initially (likely `openclaw` CLI command) and restart that.

## OpenClaw CLI Location

```bash
~/.npm-global/bin/openclaw -> ../lib/node_modules/openclaw/openclaw.mjs
```

**Recommended:** User should run `openclaw` command on remi to restart the gateway with the newly enabled Matrix extension.
