# Playbook: OpenClaw Host Migration

## [PLB-2026-0408] Migrate OpenClaw Instance to New Host

**Date**: 2026-04-08
**Author**: Sam (ops-butler AI)
**Status**: active
**Complexity**: complex
**Time**: 30-60 minutes (depending on workspace size and network speed)

---

## Overview

Migrate a complete OpenClaw installation (workspace, config, skills, cron jobs, credentials) from one Linux host to another with minimal downtime. The target host should have OpenClaw freshly installed via `openclaw onboard`.

---

## Prerequisites

- [ ] SSH access from source to target host
- [ ] OpenClaw installed on target (`npm install -g openclaw && openclaw onboard`)
- [ ] Target host can reach all required services (Matrix homeserver, LLM endpoints, APIs)
- [ ] Sufficient disk space on target (check with `du -sh ~/.openclaw/workspace/`)
- [ ] `tar` available on both hosts (fallback if rsync unavailable)
- [ ] Source host's SSH public key added to target's `~/.ssh/authorized_keys`
- [ ] sudo access on target host (preferably NOPASSWD)

---

## Step-by-Step Instructions

### Step 1: Pre-flight Checks

Verify connectivity and disk space on target.

```bash
# From source: test SSH
ssh localadmin@TARGET "hostname && df -h / && node --version"

# Check workspace size on source
du -sh ~/.openclaw/workspace/

# Verify OpenClaw is installed on target
ssh localadmin@TARGET "ls ~/.openclaw/openclaw.json"
```

### Step 2: Stop Target Gateway (if running)

```bash
ssh localadmin@TARGET "openclaw gateway stop" 2>/dev/null
```

### Step 3: Transfer Workspace

The workspace is the largest and most critical component.

**Option A: rsync (preferred)**
```bash
rsync -avz --progress ~/.openclaw/workspace/ localadmin@TARGET:~/.openclaw/workspace/
```

**Option B: tar pipe (if rsync unavailable)**
```bash
cd ~/.openclaw && tar czf - workspace/ | ssh localadmin@TARGET "cd ~/.openclaw && rm -rf workspace && tar xzf -"
```

**Expected time**: 5-30 minutes depending on size and network speed.

### Step 4: Transfer Installed Skills

```bash
cd ~/.openclaw && tar czf - skills/ | ssh localadmin@TARGET "cd ~/.openclaw && tar xzf -"
```

### Step 5: Transfer Agent Configs (Optional)

Only if you want to preserve session history and agent-specific auth profiles.

```bash
cd ~/.openclaw && tar czf - agents/ | ssh localadmin@TARGET "cd ~/.openclaw && tar xzf -"
```

⚠️ **Do NOT transfer `identity/` or `devices/` directories** — these are host-specific and will cause "pairing required" errors.

### Step 6: Transfer SSH Keys

**CRITICAL: APPEND, do not overwrite!**

```bash
# Copy SSH config (host aliases)
scp ~/.ssh/config localadmin@TARGET:~/.ssh/config

# APPEND source's authorized_keys to target (preserving target's existing keys)
cat ~/.ssh/authorized_keys | ssh localadmin@TARGET "cat >> ~/.ssh/authorized_keys"

# Copy private key if target needs to reach same remote hosts
scp ~/.ssh/id_rsa localadmin@TARGET:~/.ssh/id_rsa
scp ~/.ssh/id_rsa.pub localadmin@TARGET:~/.ssh/id_rsa.pub
ssh localadmin@TARGET "chmod 600 ~/.ssh/id_rsa"
```

### Step 7: Merge Configuration

Do NOT blindly copy `openclaw.json`. Instead, merge settings:

```bash
# Backup target's original config
ssh localadmin@TARGET "cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.pre-migration"

# Copy source config to temp location for reference
scp ~/.openclaw/openclaw.json localadmin@TARGET:/tmp/source-openclaw.json
```

**Key settings to merge from source → target:**
- `channels.*` (Matrix bot identity, DM policies, group configs)
- `models.*` (provider URLs, model definitions, aliases)
- `agents.*` (model preferences, fallbacks, compaction, elevated access)
- `tools.*` (exec settings, web search, elevated permissions)
- `plugins.entries.*` (Brave API key, GitHub Copilot, etc.)
- `skills.entries.*` (skill-specific API keys)
- `env.vars.*` (GOG_KEYRING_PASSWORD, etc.)
- `auth.profiles.*` (GitHub Copilot OAuth profile)
- `hooks.*` (internal hooks config)
- `session.*`, `cron.*`, `commands.*`, `approvals.*`, `messages.*`

**Keep from target (do not overwrite):**
- `gateway.auth.token` (target's own gateway token)
- `meta.*` (version info)
- `wizard.*` (onboard state)

**Update host-specific values:**
- MCP server URLs (e.g., n8n base URL)
- Any localhost references that pointed to source-specific services

### Step 8: Transfer External Configs

```bash
# Google OAuth credentials (if using gog)
ssh localadmin@TARGET "mkdir -p ~/.openclaw/config/google"
scp ~/.openclaw/config/google/client_secret.json localadmin@TARGET:~/.openclaw/config/google/
```

### Step 9: Start Target Gateway

```bash
ssh localadmin@TARGET "openclaw gateway start"
```

Wait 10-15 seconds for Matrix connection.

### Step 10: Re-authenticate External Services

**gog (Google Workspace CLI):**
```bash
# On target host
brew install steipete/tap/gogcli  # or npm install -g gogcli

# Step 1: Get auth URL
GOG_KEYRING_PASSWORD=openclaw gog auth add EMAIL --services gmail,calendar,drive,contacts,docs,sheets --remote --step 1

# Step 2: User opens URL, authorizes, copies redirect URL back
GOG_KEYRING_PASSWORD=openclaw gog auth add EMAIL --services gmail,calendar,drive,contacts,docs,sheets --remote --step 2 --auth-url 'REDIRECT_URL'
```

### Step 11: Recreate Cron Jobs

Cron jobs are stored in `~/.openclaw/cron/jobs.json` but are tied to the gateway instance. Export from source and recreate on target:

```bash
# On source: export cron jobs
# Use /cron list in chat, or:
cat ~/.openclaw/cron/jobs.json

# On target: recreate each job via the cron tool or CLI
# (Use the cron tool in chat for each job)
```

### Step 12: Verify SSH to Remote Hosts

```bash
# From target, test all known SSH targets
ssh -o ConnectTimeout=5 localadmin@HOST "hostname"
```

For hosts using password auth, push the target's key:
```bash
ssh-copy-id localadmin@HOST
```

---

## Verification

```bash
# 1. Gateway running?
openclaw status

# 2. Matrix connected?
openclaw status --deep

# 3. Workspace intact?
ls ~/.openclaw/workspace/MEMORY.md && echo "OK"

# 4. Cron jobs loaded?
# Use /cron list in chat

# 5. Local model reachable?
curl -s http://MODEL_HOST:PORT/v1/models | head -5

# 6. gog working?
GOG_KEYRING_PASSWORD=openclaw gog auth list

# 7. SSH to remotes?
ssh -o ConnectTimeout=5 USER@HOST "hostname"
```

**Success Criteria:**
- [ ] Gateway running and responding
- [ ] Matrix channel connected (bot responds to messages)
- [ ] All workspace files present (MEMORY.md, SOUL.md, etc.)
- [ ] Cron jobs scheduled and visible
- [ ] Local LLM model reachable
- [ ] gog authenticated and Gmail accessible
- [ ] SSH to all required remote hosts working
- [ ] sudo working (NOPASSWD if configured)

---

## Troubleshooting

### Issue: "pairing required" error on cron/API tools

**Symptom:**
`gateway closed (1008): pairing required` when using cron tool

**Cause:**
Device identity files (`~/.openclaw/identity/`) from source host conflict with target gateway's device registry.

**Fix:**
```bash
# Remove stale identity files
rm ~/.openclaw/identity/device.json ~/.openclaw/identity/device-auth.json

# Restart gateway to regenerate
openclaw gateway stop && sleep 3 && openclaw gateway start
```

### Issue: SSH locked out after key transfer

**Symptom:**
`Permission denied (publickey,password)` after transferring SSH keys

**Cause:**
`authorized_keys` was overwritten instead of appended, removing the target's own keys.

**Fix:**
Log into target via console/another machine and re-add the needed public keys:
```bash
echo 'ssh-rsa AAAA...' >> ~/.ssh/authorized_keys
```

### Issue: sudo requires password despite NOPASSWD

**Symptom:**
`sudo: a password is required` even with NOPASSWD in sudoers

**Cause:**
`%sudo ALL=(ALL:ALL) ALL` group rule appears after the NOPASSWD line, overriding it.

**Fix:**
```bash
echo 'username ALL=(ALL:ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/username
```

### Issue: gog "No tokens stored"

**Symptom:**
gog commands fail with auth errors after migration

**Cause:**
OAuth tokens are stored in the system keyring and don't transfer between hosts.

**Fix:**
Re-authenticate using the remote flow (see Step 10).

### Issue: rsync not found on target

**Symptom:**
`bash: rsync: command not found`

**Fix:**
Use tar pipe instead (Step 3, Option B), or install rsync:
```bash
sudo apt install rsync
```

---

## Post-Migration Checklist

- [ ] Source gateway stopped (avoid duplicate Matrix bot logins)
- [ ] Target validated for 24-48 hours
- [ ] Source kept as fallback during validation period
- [ ] MEMORY.md updated with migration notes
- [ ] DNS/hostname updated if applicable
- [ ] Monitoring/alerting pointed to new host

---

## References

- PKB Resource: `pkb/resources/openclaw-host-migration.md`
- Migration Script: `scripts/openclaw-migrate.sh` (planned)
- OpenClaw Docs: https://docs.openclaw.ai

---

*Last Updated: 2026-04-08 | Author: Sam*
