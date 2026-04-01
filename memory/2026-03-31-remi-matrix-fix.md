# Matrix Encryption SDK Issue - remi Host

**Date:** 2026-03-31 04:06 UTC  
**Host:** remi (remi@remi)  
**Issue:** Matrix E2EE comms failing - SDK not loading properly

## Root Cause

Matrix plugin extension was installed but sitting in `matrix.disabled/` directory instead of `matrix/`. This prevented OpenClaw from loading the Matrix channel plugin, causing:
- Encrypted messages not being read
- Media (images) failing silently
- No Matrix activity in logs

## Fix Applied

```bash
# On remi host:
cd ~/.openclaw/extensions
mv matrix.disabled matrix
```

The Matrix extension is now active at `~/.openclaw/extensions/matrix/`

## Verification Needed

1. Restart OpenClaw on remi
2. Check Matrix connection status
3. Test encrypted message receipt
4. Verify media decryption works

## Files Referenced

- `~/.openclaw/workspace/pkb/areas/System guides/Matrix E2EE and Crypto SDK.md` - Full troubleshooting guide
- `~/.openclaw/openclaw.json` - Matrix config on remi (enabled: true, encryption: true)
- `~/.openclaw/matrix/accounts/default/comms.9xc.io__remi_comms.9xc.io/` - Crypto store data

## Next Steps

User needs to restart OpenClaw on remi host to activate the Matrix plugin.
