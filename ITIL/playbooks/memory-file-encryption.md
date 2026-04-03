# Playbook: Memory File Encryption at Rest

**Category:** Security  
**Priority:** P2  
**Created:** 2026-04-03  
**Author:** Sam (ocg)  
**Status:** ✅ Implemented  

---

## Overview

OpenClaw memory files (`MEMORY.md` and `memory/*.md`) contain sensitive context — credentials, personal decisions, API keys, and operational details. This playbook documents the encrypt-at-rest system that protects these files when no active session is running.

## Architecture

```
IDLE STATE (no session):
  ~/.openclaw/workspace/MEMORY.md          → shredded (does not exist)
  ~/.openclaw/workspace/memory/*.md        → shredded (do not exist)
  ~/.openclaw/workspace/.enc/MEMORY.md.age → encrypted (age, X25519+ChaCha20-Poly1305)
  ~/.openclaw/workspace/.enc/memory/*.age  → encrypted

ACTIVE STATE (session running):
  ~/.openclaw/workspace/MEMORY.md          → plaintext (OpenClaw reads normally)
  ~/.openclaw/workspace/memory/*.md        → plaintext (memory_search indexes normally)
  ~/.openclaw/workspace/.enc/              → stale copy until next encrypt cycle
```

## Threat Model

**Protected against:**
- Attacker copies disk image → gets only ciphertext
- Attacker greps for `sk-`, `token`, `password` → nothing in plaintext at rest
- Attacker reads MEMORY.md → file doesn't exist when idle
- Git repo exposure → `.gitignore` excludes plaintext, only `.enc/` committed

**Not protected against:**
- Attacker with live shell during active session (plaintext in RAM + disk)
- Attacker who compromises the `age` key file (same filesystem)
- Swap/tmpfs containing decrypted content

## Components

### Scripts

All scripts live in `~/.openclaw/skills/openclaw-ops/scripts/`.

| Script | Purpose | When |
|--------|---------|------|
| `memory-decrypt.sh` | Decrypt `.enc/` → working paths | Session startup |
| `memory-encrypt.sh` | Encrypt working paths → `.enc/`, shred plaintext | Session end |
| `memory-lock.sh` | Auto-lock if idle >30 min | Cron (every 30 min) |
| `memory-status.sh` | Report lock state, key status, file counts | On demand |

### Key Management

| File | Purpose | Permissions |
|------|---------|-------------|
| `~/.openclaw/keys/memory.key` | Age private key (identity file) | 600 |
| `~/.openclaw/keys/memory.pub` | Age public key (recipient) | 600 |

**Public key:** `age1r4742gf36am72lqrx67lq75np56arvsyhzs4pm7jw9rppn2zn4asj0jwd9`

### Cron Jobs

| Schedule | Script | Log |
|----------|--------|-----|
| `*/5 * * * *` | `watchdog.sh` (touches lock file on healthy tick) | `~/.openclaw/logs/watchdog.log` |
| `*/30 * * * *` | `memory-lock.sh` (auto-encrypt if idle) | `~/.openclaw/logs/memory-crypto.log` |

### Integration Points

- **AGENTS.md:** Step 0 in "Every Session" runs `memory-decrypt.sh`
- **Watchdog:** Touches `.memory-unlocked` on healthy ticks to prevent premature auto-lock
- **Git:** `.gitignore` excludes `MEMORY.md`, `memory/*.md`, `.memory-unlocked`
- **monitor-memory.sh:** Skips truncation when memory is in encrypted state

## Procedures

### Manual Encrypt (Lock Memory)

```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-encrypt.sh
```

**What happens:**
1. Reads public key from `~/.openclaw/keys/memory.pub`
2. Encrypts `MEMORY.md` → `.enc/MEMORY.md.age`
3. Roundtrip verification: decrypt encrypted copy, diff against original
4. Only if verification passes: `shred -u` original
5. Repeats for all `memory/*.md` files
6. Removes `.memory-unlocked` lock file
7. Logs to `~/.openclaw/logs/memory-crypto.log`

### Manual Decrypt (Unlock Memory)

```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh
```

**What happens:**
1. Checks for `.enc/` directory and key file
2. Skips if `.memory-unlocked` already exists (idempotent)
3. Decrypts all `.age` files → plaintext working copies
4. Sets chmod 600 on all decrypted files
5. Creates `.memory-unlocked` timestamp file
6. Logs to `~/.openclaw/logs/memory-crypto.log`

### Check Status

```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-status.sh
```

**Output includes:**
- 🔓/🔒 Lock state
- Key file status and permissions
- Plaintext file count and sizes
- Encrypted file count and sizes
- Summary with warnings

### Key Rotation

```bash
# Generate new keypair
age-keygen -o ~/.openclaw/keys/memory-new.key
grep "public key" ~/.openclaw/keys/memory-new.key | awk '{print $4}' > ~/.openclaw/keys/memory-new.pub

# Decrypt with old key
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh

# Swap keys
mv ~/.openclaw/keys/memory.key ~/.openclaw/keys/memory-old.key
mv ~/.openclaw/keys/memory.pub ~/.openclaw/keys/memory-old.pub
mv ~/.openclaw/keys/memory-new.key ~/.openclaw/keys/memory.key
mv ~/.openclaw/keys/memory-new.pub ~/.openclaw/keys/memory.pub
chmod 600 ~/.openclaw/keys/memory.key ~/.openclaw/keys/memory.pub

# Re-encrypt with new key
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-encrypt.sh

# Verify, then remove old key
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh
shred -u ~/.openclaw/keys/memory-old.key
rm ~/.openclaw/keys/memory-old.pub
```

## Troubleshooting

### Memory files missing after reboot

**Cause:** Auto-lock fired while no session was active. This is expected behavior.

**Fix:**
```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh
```

### Encrypt script exits with error

**Cause:** Roundtrip verification failed — encrypted file doesn't match original.

**Fix:** Check disk space, key file integrity. The script never shreds plaintext if verification fails. Your data is safe.

### Memory search returns no results

**Cause:** Memory files are locked (encrypted). OpenClaw can't index ciphertext.

**Fix:** Unlock memory first:
```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh
openclaw memory index --force
```

### Auto-lock fires during active session

**Cause:** Watchdog isn't touching the lock file, or session store hasn't been updated in 30+ minutes.

**Fix:** The watchdog touches `.memory-unlocked` on every healthy tick (5 min). If the gateway is down, auto-lock is the correct behavior — encrypted files are safer when the gateway isn't running.

### Key file lost or corrupted

**Impact:** All encrypted memory files are unrecoverable.

**Prevention:**
- Back up `~/.openclaw/keys/memory.key` to a secure external location
- Store public key separately for verification
- Snapshot VM before key rotation

### OpenClaw bootstrap shows truncated/missing MEMORY.md

**Cause:** Memory is locked. The session startup should auto-decrypt via AGENTS.md step 0.

**Fix:** Verify AGENTS.md contains the decrypt instruction:
```
0. Run `bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh`
```

## Safety Features

1. **Roundtrip verification** — encrypt → decrypt → diff before any shred
2. **Lock file** — prevents double-decrypt or encrypt during active session
3. **Watchdog integration** — keeps lock file fresh during active use
4. **`shred -u`** — secure deletion (overwrite + unlink), not just `rm`
5. **Idempotent** — safe to run decrypt/encrypt multiple times
6. **Logging** — all operations logged to `~/.openclaw/logs/memory-crypto.log`
7. **Watchdog safety net** — auto-decrypts if gateway is running but memory is locked

## Watchdog Safety Net

The watchdog (runs every 5 min via cron) includes an auto-decrypt failsafe:

1. On each tick, checks if `.memory-unlocked` exists
2. If missing AND `.enc/` directory exists AND gateway is healthy:
   - Automatically runs `memory-decrypt.sh`
   - Logs `SAFETY NET: Memory locked while gateway running — auto-decrypting`
3. This catches scenarios where:
   - Auto-lock fired right before a new session started
   - Agent failed to run decrypt on session startup (model skipped step 0)
   - Gateway restarted and AGENTS.md step was skipped
   - Manual `/new` or `/reset` didn't trigger decrypt
   - Exec approval blocked the decrypt script

**Worst-case recovery time:** 5 minutes (next watchdog tick)

**Manual override (instant):**
```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh
```
Then `/reset` or `/new` in chat to reload the session with memory.

**Verification:** The safety net was tested by encrypting all memory, then running a watchdog tick:
```
[2026-04-03 03:47:28] SAFETY NET: Memory locked while gateway running — auto-decrypting
[2026-04-03 03:47:28] Decrypted MEMORY.md (19752 bytes)
[2026-04-03 03:47:28] Decrypted 167 files from memory/
[2026-04-03 03:47:28] SAFETY NET: Memory decrypted successfully
```

## Encryption Details

- **Algorithm:** X25519 key agreement + ChaCha20-Poly1305 AEAD (age default)
- **Key type:** X25519 (Curve25519)
- **Overhead:** ~200 bytes per file (age header + wrapped key)
- **Tool:** `age` v1.1.1 (FiloSottile/age)
- **No IV/nonce management needed** — age handles this internally

## Related

- `ITIL/playbooks/openclaw-gateway-failures.md` — gateway troubleshooting
- `ITIL/playbooks/context-window-optimization.md` — context management
- `pkb/resources/memory-encryption.md` — PKB knowledge article
- `openclaw-ops-integration.md` — full OpenClaw-OPS integration docs

---

*Last updated: 2026-04-03 03:47 UTC*
