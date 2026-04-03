# Memory Encryption at Rest

**Type:** Security Architecture  
**Created:** 2026-04-03  
**Status:** Active  
**Tags:** #security #encryption #memory #age #openclaw

---

## Summary

Encrypt-at-rest system for OpenClaw memory files using `age` (X25519 + ChaCha20-Poly1305). Memory files exist as plaintext only during active sessions; at rest they are encrypted and plaintext is securely shredded.

## Why This Exists

OpenClaw memory files accumulate sensitive data over time:
- API keys and tokens mentioned in troubleshooting logs
- Personal decisions and preferences
- Infrastructure details (IPs, hostnames, SSH keys)
- Credentials referenced in daily notes

An attacker with filesystem access (stolen disk, compromised backup, repo exposure) could grep these files for secrets.

## How It Works

### State Diagram

```
┌─────────────┐     memory-decrypt.sh     ┌──────────────┐
│   LOCKED    │ ──────────────────────────▶│   UNLOCKED   │
│  .enc/*.age │                           │  *.md files  │
│  (no .md)   │◀──────────────────────────│  + .enc stale│
└─────────────┘     memory-encrypt.sh     └──────────────┘
                    (shreds plaintext)           │
                           ▲                     │
                           │    watchdog touches │
                    memory-lock.sh              │
                    (cron, 30min idle)     .memory-unlocked
```

### Session Lifecycle

1. **Session start** → `memory-decrypt.sh` runs (AGENTS.md step 0)
   - `.enc/*.age` → plaintext `*.md`
   - Creates `.memory-unlocked` lock file
   - OpenClaw reads memory normally

2. **During session** → normal operation
   - OpenClaw reads/writes `MEMORY.md` and `memory/*.md`
   - Memory search indexes plaintext
   - Watchdog touches `.memory-unlocked` every 5 min (prevents auto-lock)

3. **Session end** → `memory-encrypt.sh` runs (manual or auto)
   - Plaintext `*.md` → `.enc/*.age` (with roundtrip verification)
   - `shred -u` on all plaintext
   - Removes `.memory-unlocked`

4. **Idle timeout** → `memory-lock.sh` cron (every 30 min)
   - Checks session activity via session store mtime
   - If idle >30 min: auto-encrypt + shred

## Key Concepts

### Age Encryption

[Age](https://age-encryption.org/) is a modern file encryption tool by Filippo Valsorda (Go crypto team at Google). It replaces GPG for file encryption with:

- **No configuration** — no modes, no padding, no IV management
- **X25519 key agreement** — Curve25519 Diffie-Hellman
- **ChaCha20-Poly1305 AEAD** — authenticated encryption
- **~200 bytes overhead** per file
- **Deterministic format** — `age-encryption.org/v1` header

### Roundtrip Verification

Before shredding any plaintext file:
1. Encrypt plaintext → `.age` file
2. Decrypt `.age` file → temp file
3. `diff` temp file against original
4. Only if identical: `shred -u` original
5. If different: abort, log error, leave plaintext intact

This prevents data loss from disk errors, interrupted writes, or key issues.

### Shred vs rm

`shred -u` overwrites file content with random data before unlinking. Standard `rm` only removes the directory entry — data remains on disk until overwritten by new files. On SSDs with wear leveling, `shred` is less effective but still better than `rm` for defense in depth.

### Lock File Semantics

`.memory-unlocked` serves three purposes:
1. **Idempotency** — prevents double-decrypt
2. **Idle detection** — mtime used by `memory-lock.sh` to measure inactivity
3. **Watchdog signal** — watchdog touches it on healthy ticks to signal active use

## File Layout

```
~/.openclaw/
├── keys/
│   ├── memory.key          # Age private key (chmod 600)
│   └── memory.pub          # Age public key (chmod 600)
├── workspace/
│   ├── MEMORY.md           # Plaintext (exists only when unlocked)
│   ├── memory/             # Daily files (plaintext when unlocked)
│   │   ├── 2026-03-03.md
│   │   └── ...
│   ├── .enc/               # Encrypted copies (always present)
│   │   ├── MEMORY.md.age
│   │   └── memory/
│   │       ├── 2026-03-03.md.age
│   │       └── ...
│   └── .memory-unlocked    # Lock file (exists when unlocked)
├── logs/
│   └── memory-crypto.log   # Encrypt/decrypt audit trail
└── skills/openclaw-ops/scripts/
    ├── memory-decrypt.sh
    ├── memory-encrypt.sh
    ├── memory-lock.sh
    └── memory-status.sh
```

## Operational Procedures

### Check Status
```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-status.sh
```

### Manual Lock
```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-encrypt.sh
```

### Manual Unlock
```bash
bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh
```

### Key Rotation
See: [[memory-file-encryption]] playbook (ITIL/playbooks/memory-file-encryption.md)

### Backup Keys
```bash
# Copy to secure external location
cp ~/.openclaw/keys/memory.key /secure/backup/location/
# Or use age to encrypt the key itself with a passphrase
age -p ~/.openclaw/keys/memory.key > /secure/backup/memory.key.age
```

## Interaction with OpenClaw

### What Works Normally
- ✅ MEMORY.md bootstrap injection (reads plaintext during session)
- ✅ `memory_search` tool (indexes plaintext during session)
- ✅ `memory_get` tool (reads plaintext during session)
- ✅ Compaction memory flush (writes to plaintext during session)
- ✅ File watcher re-indexing (watches plaintext during session)

### What Changes
- ⚠️ Memory search unavailable when locked (no plaintext to index)
- ⚠️ MEMORY.md not injected when locked (file doesn't exist)
- ⚠️ Session must run `memory-decrypt.sh` before memory is accessible
- ✅ **Watchdog safety net** auto-decrypts within 5 min if gateway is running but memory is locked

### Watchdog Safety Net (Failsafe)

The decrypt step in AGENTS.md can fail (model skips it, exec approval blocks it, script errors). To prevent amnesia:

1. Watchdog runs every 5 min via cron
2. On each tick, checks: is `.memory-unlocked` missing AND `.enc/` exists?
3. If yes AND gateway is healthy → auto-runs `memory-decrypt.sh`
4. Logs: `SAFETY NET: Memory locked while gateway running — auto-decrypting`

**Failure scenarios covered:**
- Auto-lock fired right before a new session
- Agent skipped step 0 in AGENTS.md
- Gateway restarted, session init didn't trigger decrypt
- `/new` or `/reset` skipped decrypt
- Exec approval blocked the script

**Worst-case recovery:** 5 minutes (next watchdog tick)  
**Manual recovery:** `bash ~/.openclaw/skills/openclaw-ops/scripts/memory-decrypt.sh` then `/reset`

### Why Not FUSE / Full-Disk Encryption

- **FUSE (gocryptfs/encfs):** Requires `SYS_ADMIN` capability in LXC container, adds mount/unmount complexity, and the filesystem is always mounted during active use anyway
- **LUKS:** Overkill for protecting specific files; would encrypt entire disk including non-sensitive data
- **This approach:** Surgical — only memory files are encrypted, minimal overhead, no kernel dependencies

## Connections

- [[openclaw-ops]] — Parent integration project
- [[context-window-optimization]] — Memory files affect context window size
- [[memory-file-encryption]] — ITIL playbook with step-by-step procedures
- [[triple-memory-system]] — Memory architecture that this encrypts

## Limitations

1. **Key on same filesystem** — if attacker has shell access during active session, they can read the key and decrypt
2. **SSD wear leveling** — `shred` may not overwrite all physical copies on SSD
3. **Swap/tmpfs** — decrypted content may exist in swap partition
4. **Process memory** — OpenClaw holds plaintext in RAM during session
5. **No key escrow** — lost key = lost memory (back up your key!)

## Future Enhancements

- [ ] Hardware key support (YubiKey via age plugin)
- [ ] Remote key storage (Vault, AWS KMS)
- [ ] Encrypted swap partition
- [ ] Memory file integrity monitoring (detect unauthorized modifications)
- [ ] Automated key rotation schedule (90-day cycle)

---

*See also: ITIL/playbooks/memory-file-encryption.md for operational procedures*
