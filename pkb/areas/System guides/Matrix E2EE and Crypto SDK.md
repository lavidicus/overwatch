# Matrix E2EE and Crypto SDK — Knowledge Base

> **Last Updated:** 2026-03-24  
> **Server:** comms.9xc.io (Synapse 1.148.0, Ubuntu 24.04)  
> **Client:** OpenClaw Gateway (OPENCLAW_GW device)  
> **User:** @sam:comms.9xc.io

---

## Architecture Overview

```
Element Desktop (Lavid)          OpenClaw Gateway (Sam)
    ┌──────────────┐               ┌──────────────────┐
    │ Element App   │               │ openclaw-gateway  │
    │ matrix-js-sdk │               │ matrix-js-sdk     │
    │ Rust Crypto   │  ◄─ E2EE ─►  │ Rust Crypto WASM  │
    │ (WASM/Native) │               │ + Native .node    │
    └──────┬───────┘               └──────┬───────────┘
           │                               │
           ▼                               ▼
    ┌──────────────────────────────────────────┐
    │   Synapse Homeserver (comms.9xc.io)      │
    │   - SQLite DB                            │
    │   - Media store: /var/lib/matrix-synapse  │
    │   - Listening: 127.0.0.1:8008 (nginx)    │
    │   - IP: 10.50.15.201 (private network)   │
    └──────────────────────────────────────────┘
```

### E2EE Key Hierarchy

```
Master Key (identity)
  ├── Self-Signing Key → signs own devices (OPENCLAW_GW)
  └── User-Signing Key → signs other users' master keys

Megolm Session Keys (per-room, rotating)
  ├── Outbound: created by sender, shared via Olm
  └── Inbound: received from other users via to-device messages

Olm Sessions (per-device-pair)
  └── Used to securely exchange Megolm keys
```

### Key Trust Chain

For user A to share Megolm keys with user B's device:
1. User B must have **cross-signing keys published** on the server
2. User B's **device must be signed** by B's self-signing key
3. User A must have **verified User B** (signed B's master key with A's user-signing key)
4. OR the room must allow sharing to unverified devices

---

## Server Configuration

### Synapse (comms.9xc.io)

| Setting | Value |
|---------|-------|
| Homeserver | comms.9xc.io |
| Version | 1.148.0 (upgradable to 1.149.1) |
| Database | SQLite3 at `/var/lib/matrix-synapse/homeserver.db` |
| Media store | `/var/lib/matrix-synapse/media` |
| Max upload | 100MB |
| Listener | `127.0.0.1:8008` (behind nginx, x_forwarded: true) |
| Registration | Disabled (shared secret only) |
| Trusted key server | matrix.org |
| Authenticated media | **Required** (Synapse 1.148+ default) |

### SSH Access
```bash
ssh localadmin@comms  # Ubuntu 24.04, Synapse host
# DB is world-readable but writes need sudo (matrix-synapse user)
# Registration secret in /etc/matrix-synapse/homeserver.yaml
```

### Admin Users
| User | Admin |
|------|-------|
| @lavid:comms.9xc.io | ✅ |
| @jason:comms.9xc.io | ✅ |
| @rclaw:comms.9xc.io | ✅ |
| @randy:comms.9xc.io | ✅ |
| @sam:comms.9xc.io | ✅ (promoted 2026-03-24) |

---

## OpenClaw Matrix Configuration

### openclaw.json — Matrix Channel
```json
{
  "channels": {
    "matrix": {
      "enabled": true,
      "homeserver": "https://comms.9xc.io",
      "userId": "@sam:comms.9xc.io",
      "password": "<redacted>",
      "encryption": true,
      "dm": {
        "policy": "allowlist",
        "allowFrom": ["@eve:comms.9xc.io", "@maria:comms.9xc.io", "@lavid:comms.9xc.io"]
      },
      "groupPolicy": "open",
      "autoJoin": "true",
      "allowPrivateNetwork": true,
      "accessToken": "<redacted>"
    }
  }
}
```

### Critical Settings
- **`allowPrivateNetwork: true`** — Required because comms.9xc.io resolves to 10.50.15.201 (private IP via `/etc/hosts`). Without this, SSRF protection blocks all Matrix API calls.
- **`encryption: true`** — Enables E2EE. Requires working crypto module.
- **`dm.policy: "allowlist"`** — Must use nested format (`dm.policy` not flat `dmPolicy`).

### Crypto Store Location
```
/home/localadmin/.openclaw/matrix/accounts/default/
  comms.9xc.io__sam_comms.9xc.io/
    b27abe73b089f5d1/
      crypto-idb-snapshot.json   # IndexedDB crypto state
      bot-storage.json
      inbound-dedupe.json
      startup-verification.json
      storage-meta.json
```

---

## Native Crypto Module

### The Problem (2026.3.23-x)

OpenClaw bundles the Matrix SDK as ES modules (`"type": "module"` in package.json). The `@matrix-org/matrix-sdk-crypto-nodejs` native module loader uses `__dirname` to find the `.node` binary, but `__dirname` is undefined in ES modules.

### Error Chain
```
1. __dirname is not defined in ES module scope
   → crypto-node.runtime can't find native binary
   → falls back to require('@matrix-org/matrix-sdk-crypto-nodejs-linux-x64-gnu')
   → module not found (not installed as separate package)
   → encrypted media download fails silently
   → "matrix media download failed" in logs
```

### File Locations
| File | Path |
|------|------|
| Crypto loader | `dist/crypto-node.runtime-*.js` |
| CJS wrapper | `dist/chunk-DORXReHP.js` |
| Native binary | `node_modules/@matrix-org/matrix-sdk-crypto-nodejs/matrix-sdk-crypto.linux-x64-gnu.node` (22MB) |
| WASM fallback | `node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/matrix_sdk_crypto_wasm_bg.wasm` |
| WASM symlink | `dist/pkg/matrix_sdk_crypto_wasm_bg.wasm` |

### The Fix (applied 2026-03-24)

**File:** `dist/crypto-node.runtime-*.js`

1. **Add `__dirname` definition** (line 1):
```javascript
const __dirname = "/home/localadmin/.npm-global/lib/node_modules/openclaw/node_modules/@matrix-org/matrix-sdk-crypto-nodejs";
```

2. **Change relative requires to absolute** (all instances):
```javascript
// BEFORE (broken):
__require("./matrix-sdk-crypto.linux-x64-gnu.node")

// AFTER (working):
__require(__dirname + "/matrix-sdk-crypto.linux-x64-gnu.node")
```

### Post-Update Script

After every OpenClaw update, run:
```bash
~/.openclaw/workspace/scripts/fix-matrix-crypto.sh
```
Then manually verify/re-apply the `__dirname` patch if the crypto-node.runtime file was replaced.

---

## Cross-Signing Setup

### Bootstrap Command
```bash
openclaw matrix verify bootstrap \
  --recovery-key "EsTT Ged3 QwX7 ..." \
  --force-reset-cross-signing \
  --verbose
```

### Verify Status
```bash
openclaw matrix verify status
# Should show:
# Verified by owner: yes
# Cross-signing verified: yes
# Signed by owner: yes
# Cross-signing published: yes (master=yes, self=yes, user=yes)
# Backup active on this device: 1
```

### Verify Device (with recovery key)
```bash
openclaw matrix verify device "<recovery-key>"
```

### User-to-User Verification
After Sam's cross-signing is published, the other user (e.g., Lavid) must:
1. Open Element → DM room → click on @sam:comms.9xc.io
2. Click "Verify" → emoji comparison
3. Confirm emojis match
4. **Restart Element** to force megolm session rotation with new trust

---

## Troubleshooting Flowchart

```
Image not received?
│
├── Check logs: grep "media download" /tmp/openclaw/openclaw-$(date +%F).log
│   │
│   ├── "matrix media download failed"
│   │   │
│   │   ├── grep "MEDIA_DEBUG" or patch monitor to get actual error
│   │   │   │
│   │   │   ├── "__dirname is not defined" → Re-apply crypto-node.runtime patch
│   │   │   ├── "Cannot find module" → Check native .node binary path
│   │   │   ├── "null pointer passed to rust" → Crypto store corrupted, wipe & re-bootstrap
│   │   │   └── "DecryptionError" → Megolm key not shared, verify devices
│   │   │
│   │   └── No MEDIA_DEBUG → Add debug patch:
│   │       sed -i 's/logger.warn("matrix media download failed"/
│   │         console.error("MEDIA_DEBUG:", errorText);
│   │         logger.warn("matrix media download failed"/' monitor-*.js
│   │
│   ├── "cross-signing reset failed: getSecretStorageKey callback returned falsey"
│   │   → Need recovery key: openclaw matrix verify bootstrap --recovery-key "..."
│   │
│   └── No media errors at all
│       → Image wasn't sent as m.image, or room isn't E2EE
│
├── Check cross-signing: openclaw matrix verify status
│   │
│   ├── "Verified by owner: no" → Run bootstrap with recovery key
│   ├── "Cross-signing published: no" → Run bootstrap --force-reset-cross-signing
│   └── "Backup: missing" → Run bootstrap to create room key backup
│
├── Check megolm key sharing:
│   │ Query server for recent messages and compare session IDs
│   │ curl -H "Authorization: Bearer $TOKEN" \
│   │   "https://comms.9xc.io/_matrix/client/v3/rooms/$ROOM/messages?dir=b&limit=10"
│   │
│   ├── Sam's text and Lavid's images use DIFFERENT session IDs
│   │   → Lavid's Element not sharing keys with Sam
│   │   → Verify Sam from Element (emoji verification)
│   │   → Restart Element to rotate megolm session
│   │
│   └── Same session ID but still fails
│       → Crypto module loading issue (check __dirname patch)
│
└── Check SSRF: allowPrivateNetwork must be true
    → comms.9xc.io resolves to 10.50.15.201 (private IP)
```

---

## Common Issues & Fixes

### 1. "matrix media download failed" — __dirname undefined
**Symptom:** All encrypted images fail, text messages work fine  
**Cause:** ES module bundling breaks CommonJS `__dirname` in crypto loader  
**Fix:** Patch `dist/crypto-node.runtime-*.js` (see Native Crypto Module section)  
**Survives update:** ❌ Must re-apply after each OpenClaw update

### 2. Cross-signing bootstrap fails — "getSecretStorageKey callback returned falsey"
**Symptom:** Cross-signing keys created locally but never published to server  
**Cause:** No recovery key provided, can't decrypt secret storage  
**Fix:** `openclaw matrix verify bootstrap --recovery-key "..." --force-reset-cross-signing`

### 3. Element won't share megolm keys
**Symptom:** Text decrypts fine but images use a different session that fails  
**Cause:** User-to-user verification not completed  
**Fix:** Emoji verification in Element → full app restart to rotate megolm session

### 4. Config schema migration (flat → nested)
**Symptom:** Matrix connects but bot can't respond  
**Cause:** Old `dmPolicy`/`allowFrom` keys need nested `dm.policy`/`dm.allowFrom`  
**Fix:** Update config to nested format

### 5. SSRF blocks private homeserver
**Symptom:** All Matrix API calls fail  
**Cause:** `comms.9xc.io` resolves to private IP, SSRF protection blocks it  
**Fix:** `"allowPrivateNetwork": true` in channel config

### 6. Stale access token after device wipe
**Symptom:** Matrix API returns M_UNKNOWN_TOKEN  
**Cause:** Wiping devices invalidates cached token  
**Fix:** Manual password login via API, add fresh `accessToken` to config

### 7. WASM module missing
**Symptom:** Gateway fails to start or crypto silently broken  
**Cause:** `npm install` wipes manually-added crypto packages  
**Fix:** Run `scripts/fix-matrix-crypto.sh`

---

## Maintenance Checklist

### After OpenClaw Update
- [ ] Run `scripts/fix-matrix-crypto.sh`
- [ ] Check if `dist/crypto-node.runtime-*.js` was replaced (filename hash may change)
- [ ] Re-apply `__dirname` patch if needed
- [ ] Restart gateway
- [ ] Test with `openclaw matrix verify status`
- [ ] Send test image to verify media works

### Periodic Health Check
- [ ] `openclaw matrix verify status` → all green
- [ ] Check for cross-signing errors in `/tmp/openclaw/openclaw-$(date +%F).log`
- [ ] Verify backup is active and trusted
- [ ] Check Synapse version for security updates

### Nuclear Reset Procedure
If everything is broken:
1. Stop gateway
2. Delete crypto store: `rm -rf ~/.openclaw/matrix/accounts/default/comms.9xc.io__sam_comms.9xc.io/*/`
3. Delete device on server via admin API
4. Fresh login (password in config, or manual API login for new `accessToken`)
5. Bootstrap cross-signing with recovery key
6. Have all Element users re-verify Sam
7. Restart Element clients to rotate megolm sessions

---

## Reference Commands

```bash
# Admin API (requires Sam's token)
TOKEN="syt_..."

# List users
curl -H "Authorization: Bearer $TOKEN" "https://comms.9xc.io/_synapse/admin/v2/users?limit=10"

# List user's devices
curl -H "Authorization: Bearer $TOKEN" "https://comms.9xc.io/_synapse/admin/v2/users/@USER:comms.9xc.io/devices"

# Query cross-signing keys
curl -X POST "https://comms.9xc.io/_matrix/client/v3/keys/query" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"device_keys": {"@sam:comms.9xc.io": []}}'

# Test authenticated media download
curl -H "Authorization: Bearer $TOKEN" "https://comms.9xc.io/_matrix/client/v1/media/config"

# Register user (admin only, via shared secret)
register_new_matrix_user -c /etc/matrix-synapse/homeserver.yaml -u USER -p PASS -a http://localhost:8008

# Promote user to admin (via existing admin token)
curl -X PUT "https://comms.9xc.io/_synapse/admin/v2/users/@USER:comms.9xc.io" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"admin": true}'
```

---

## Incident History

| Date | Issue | Resolution | Duration |
|------|-------|-----------|----------|
| 2026-03-24 | __dirname undefined in crypto-node.runtime (ES module) | Patched __dirname + absolute require paths | ~2h |
| 2026-03-24 | Cross-signing not published | Bootstrap with recovery key + --force-reset | 30min |
| 2026-03-24 | Element not sharing megolm keys | Emoji verification + Element restart | 15min |
| 2026-03-24 | Config schema (flat→nested dm policy) | Updated config format | Fixed earlier |
| 2026-03-24 | SSRF blocking private homeserver | allowPrivateNetwork: true | Fixed earlier |
| 2026-03-16 | matrix-sdk-crypto-nodejs missing after update | npm install in correct location | 30min |
| 2026-03-16 | Stale access token after device wipe | Manual API login, fresh accessToken | 20min |
