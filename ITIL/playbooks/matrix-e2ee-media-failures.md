# Playbook: Matrix E2EE Media Download Failures

> **Category:** Incident Response  
> **Priority:** P2 (service degraded — text works, images don't)  
> **SLA:** 4h response, 24h resolution  
> **Last Updated:** 2026-03-24  
> **PKB Reference:** `pkb/areas/System guides/Matrix E2EE and Crypto SDK.md`

---

## Symptoms

- Images sent via Matrix show `[matrix image attachment unavailable]`
- Text messages decrypt and display correctly
- Logs show `"matrix media download failed"` in `/tmp/openclaw/openclaw-$(date +%F).log`

---

## Triage (5 minutes)

### Step 1: Check logs for the actual error
```bash
# Get the error message
grep "media download failed" /tmp/openclaw/openclaw-$(date +%F).log | tail -5
```

If the log only shows `"matrix media download failed"` without details, add debug patch:
```bash
MONITOR=$(grep -rl "matrix media download failed" ~/.npm-global/lib/node_modules/openclaw/dist/monitor-*.js)
cp "$MONITOR" "${MONITOR}.bak"
sed -i 's/logger.warn("matrix media download failed"/console.error("MEDIA_DEBUG:", errorText); logger.warn("matrix media download failed"/' "$MONITOR"
# Restart gateway, reproduce, check: grep "MEDIA_DEBUG" /tmp/openclaw/openclaw-$(date +%F).log
# RESTORE after: cp "${MONITOR}.bak" "$MONITOR"
```

### Step 2: Identify error class

| Error Message | Go To |
|---------------|-------|
| `__dirname is not defined in ES module scope` | → Fix A |
| `Cannot find module './matrix-sdk-crypto...node'` | → Fix B |
| `Cannot find module '@matrix-org/matrix-sdk-crypto-nodejs-linux-x64-gnu'` | → Fix B |
| `null pointer passed to rust` | → Fix C |
| `DecryptionError` / `Can't find the room key` | → Fix D |
| `getSecretStorageKey callback returned falsey` | → Fix E |

---

## Fix A: __dirname Undefined (ES Module Bug)

**Root cause:** OpenClaw bundles crypto loader as ES module where `__dirname` doesn't exist.

```bash
# Find the crypto runtime file (hash in filename changes per version)
CRYPTO=$(ls ~/.npm-global/lib/node_modules/openclaw/dist/crypto-node.runtime-*.js)
NATIVE_DIR="$(ls -d ~/.npm-global/lib/node_modules/openclaw/node_modules/@matrix-org/matrix-sdk-crypto-nodejs)"

# Backup
cp "$CRYPTO" "${CRYPTO}.bak"

# Add __dirname at top of file
sed -i "1s|^|const __dirname = \"${NATIVE_DIR}\";\n|" "$CRYPTO"

# Change relative requires to absolute
sed -i 's|__require("./matrix-sdk-crypto|__require(__dirname + "/matrix-sdk-crypto|g' "$CRYPTO"

# Verify
head -1 "$CRYPTO"
grep "matrix-sdk-crypto.linux" "$CRYPTO" | head -2

# Restart gateway
openclaw gateway restart
```

**Verify:** `grep "MEDIA_DEBUG" /tmp/openclaw/openclaw-$(date +%F).log` should show no new errors.

---

## Fix B: Native Module Not Found

**Root cause:** Native `.node` binary exists but require() can't resolve it.

```bash
# Verify native binary exists
NATIVE=$(find ~/.npm-global/lib/node_modules/openclaw -name "matrix-sdk-crypto.linux-x64-gnu.node" | head -1)
echo "Found: $NATIVE"
ls -lh "$NATIVE"

# Test loading
node -e "const m = require('$NATIVE'); console.log('OK:', Object.keys(m).slice(0,3))"

# If Fix A was applied but path is wrong, update __dirname:
CRYPTO=$(ls ~/.npm-global/lib/node_modules/openclaw/dist/crypto-node.runtime-*.js)
NATIVE_DIR=$(dirname "$NATIVE")
sed -i "1s|const __dirname = .*|const __dirname = \"${NATIVE_DIR}\";|" "$CRYPTO"
```

If native binary is missing entirely:
```bash
cd ~/.npm-global/lib/node_modules/openclaw
npm install @matrix-org/matrix-sdk-crypto-nodejs --no-save
# Then re-apply Fix A
```

---

## Fix C: Rust Crypto Null Pointer Crash

**Root cause:** Crypto store corrupted or WASM module in bad state.

```bash
# Stop gateway
openclaw gateway stop

# Wipe crypto store (LOSES OLD E2EE HISTORY)
rm -rf ~/.openclaw/matrix/accounts/default/comms.9xc.io__sam_comms.9xc.io/*/crypto-idb-snapshot.json

# Delete device on server
TOKEN="<sam's access token>"
curl -X DELETE "https://comms.9xc.io/_matrix/client/v3/devices/OPENCLAW_GW" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"auth":{"type":"m.login.password","user":"sam","password":"<password>"}}'

# Fresh login for new access token
NEW_TOKEN=$(curl -s -X POST "https://comms.9xc.io/_matrix/client/v3/login" \
  -d '{"type":"m.login.password","identifier":{"type":"m.id.user","user":"sam"},"password":"<password>","device_id":"OPENCLAW_GW","initial_device_display_name":"OpenClaw Gateway"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")

# Update config with new token
# Edit ~/.openclaw/openclaw.json → channels.matrix.accessToken

# Restart and bootstrap
openclaw gateway start
openclaw matrix verify bootstrap --recovery-key "<key>" --force-reset-cross-signing

# Have Lavid re-verify Sam in Element (emoji verification)
# Lavid must restart Element after verification
```

---

## Fix D: Megolm Key Not Shared

**Root cause:** Sender's Element hasn't shared room keys with Sam's device.

### Diagnose
```bash
TOKEN="<token>"
ROOM="!FAbpZwCOCOttrRdWxM:comms.9xc.io"

# Compare session IDs — different sessions = key not shared
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://comms.9xc.io/_matrix/client/v3/rooms/${ROOM}/messages?dir=b&limit=10" \
  | python3 -c "
import json,sys
from datetime import datetime,timezone
for c in json.load(sys.stdin).get('chunk',[]):
    co=c.get('content',{})
    print(f'{datetime.fromtimestamp(c[\"origin_server_ts\"]/1000,timezone.utc):%H:%M} {c[\"sender\"]:30s} sid={co.get(\"session_id\",\"N/A\")[:30]} ct={len(co.get(\"ciphertext\",\"\"))}')"
```

### Fix
1. Check Sam is verified: `openclaw matrix verify status` → must show "Verified by owner: yes"
2. If not: `openclaw matrix verify bootstrap --recovery-key "<key>" --force-reset-cross-signing`
3. Other user must verify Sam in Element (Settings → People → @sam → Verify → emoji match)
4. **Other user must fully restart Element** (quit from system tray) to rotate megolm session
5. Send new image after restart

---

## Fix E: Secret Storage Key Missing

**Root cause:** Cross-signing bootstrap can't export keys because no recovery key provided.

```bash
# Bootstrap with recovery key
openclaw matrix verify bootstrap \
  --recovery-key "<recovery key from Element>" \
  --force-reset-cross-signing \
  --verbose

# Expected output:
# Bootstrap success: yes
# Cross-signing published: yes (master=yes, self=yes, user=yes)
# Backup active on this device: 1
```

Recovery key format: `EsTT Ged3 QwX7 zXv5 ...` (12 groups of 4 characters)

---

## Post-Update Checklist

Run after every `openclaw update`:

```bash
# 1. Fix crypto modules
~/.openclaw/workspace/scripts/fix-matrix-crypto.sh

# 2. Check if crypto-node.runtime was replaced
CRYPTO=$(ls ~/.npm-global/lib/node_modules/openclaw/dist/crypto-node.runtime-*.js)
head -1 "$CRYPTO"  # Should show __dirname line if patched

# 3. Re-apply __dirname patch if needed (see Fix A)

# 4. Restart and verify
openclaw gateway restart
openclaw matrix verify status
# Send test image
```

---

## Escalation

If none of the above fixes work:
1. Check OpenClaw GitHub issues: https://github.com/openclaw/openclaw/issues
2. Search for "matrix media download" or "__dirname crypto"
3. File bug report with: OpenClaw version, Synapse version, error from MEDIA_DEBUG patch, platform (linux-x64)
