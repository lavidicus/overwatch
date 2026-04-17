# OpenClaw Host Migration — Knowledge Base Resource

**Created**: 2026-04-08
**Author**: Sam (ops-butler AI)
**Category**: Infrastructure / Operations
**Tags**: migration, openclaw, deployment, backup, restore

---

## Overview

This document captures everything learned from migrating an OpenClaw instance from one Linux host to another. The source was an LXC container (OCG) running OpenClaw 2026.4.5, and the target was a bare-metal VM (Claw) running a fresh OpenClaw 2026.4.8 install on Ubuntu 24.04.

## Architecture

An OpenClaw installation consists of these components:

```
~/.openclaw/
├── openclaw.json          # Main config (models, channels, tools, auth)
├── identity/              # Device identity & auth tokens
│   ├── device.json        # Device ID and keypair
│   └── device-auth.json   # Operator tokens for gateway API
├── devices/               # Paired device registry
│   ├── paired.json        # Approved devices
│   └── pending.json       # Pending approvals
├── agents/                # Agent configs and session transcripts
│   └── main/
│       ├── agent/         # Agent-specific auth profiles
│       └── sessions/      # Session history (.jsonl files)
├── skills/                # Installed skills (openclaw-ops, antfarm, etc.)
├── cron/                  # Cron job definitions
│   └── jobs.json
├── workspace/             # The working directory (SOUL.md, MEMORY.md, etc.)
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── USER.md
│   ├── MEMORY.md
│   ├── TOOLS.md
│   ├── HEARTBEAT.md
│   ├── AGENTS.md
│   ├── memory/            # Daily memory files
│   ├── skills/            # Custom workspace skills
│   ├── scripts/           # Utility scripts
│   ├── pkb/               # Personal knowledge base
│   ├── playbooks/         # Operational playbooks
│   └── ...                # Project-specific dirs
├── logs/                  # Gateway logs
├── memory/                # Memory index data
├── media/                 # Inbound/outbound media cache
└── config/                # External tool configs (e.g., Google OAuth)
    └── google/
        └── client_secret.json
```

## What Transfers vs. What Regenerates

### MUST Transfer (data loss if skipped):
| Component | Path | Notes |
|-----------|------|-------|
| Workspace | `~/.openclaw/workspace/` | All user files, memory, PKB, skills |
| Main config | `~/.openclaw/openclaw.json` | Needs host-specific adjustments |
| Installed skills | `~/.openclaw/skills/` | Custom skills not in npm |
| Cron jobs | `~/.openclaw/cron/jobs.json` | Or recreate manually |
| Agent configs | `~/.openclaw/agents/` | Session history, agent auth |
| External configs | `~/.openclaw/config/` | Google OAuth credentials, etc. |

### DO NOT Transfer (host-specific, will cause issues):
| Component | Path | Why |
|-----------|------|-----|
| Device identity | `~/.openclaw/identity/` | Paired to source gateway; causes "pairing required" errors |
| Paired devices | `~/.openclaw/devices/` | Gateway-specific device registry |
| Session locks | `~/.openclaw/agents/*/sessions/*.lock` | Stale locks from source |
| Media cache | `~/.openclaw/media/` | Regenerates on demand |
| Logs | `~/.openclaw/logs/` | Host-specific |

### Needs Adjustment After Transfer:
| Component | What to change |
|-----------|---------------|
| `openclaw.json` | Gateway auth token (use target's), host-specific URLs (n8n, MCP servers), bind addresses |
| SSH keys | Append to `authorized_keys`, don't overwrite |
| gog / OAuth tokens | Must re-authenticate (tokens stored in system keyring, not transferable) |
| systemd services | Re-register if applicable |

## Key Lessons Learned

### 1. Never Overwrite authorized_keys
**APPEND** the source host's public key to the target's `authorized_keys`. Overwriting locks you out because the target's own key (used by other machines) gets removed.

```bash
# WRONG — overwrites and locks you out
scp ~/.ssh/authorized_keys target:~/.ssh/authorized_keys

# RIGHT — append only
cat ~/.ssh/id_rsa.pub | ssh target "cat >> ~/.ssh/authorized_keys"
```

### 2. Device Identity is Host-Specific
Each OpenClaw gateway generates its own device identity on first start. Copying identity files from another host creates a mismatch between the device ID in `identity/` and what the gateway expects in `devices/paired.json`. This causes "pairing required" errors on cron and other API tools.

**Fix**: Don't copy `identity/` or `devices/`. Let the target gateway generate fresh ones on first start.

### 3. sudoers Order Matters
In `/etc/sudoers`, the **last matching rule wins**. If a user-specific `NOPASSWD` line appears before `%sudo ALL=(ALL:ALL) ALL`, the group rule overrides it. 

**Fix**: Put NOPASSWD rules in `/etc/sudoers.d/username` — the `@includedir` is processed last.

```bash
echo 'username ALL=(ALL:ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/username
```

### 4. rsync May Not Be Installed
Fresh Ubuntu server installs may not have `rsync`. Fall back to tar pipe:

```bash
cd ~/.openclaw && tar czf - workspace/ | ssh target "cd ~/.openclaw && tar xzf -"
```

### 5. OAuth Tokens Don't Transfer
gog (Google Workspace CLI) stores tokens in the system keyring (libsecret/keychain). These are not portable between hosts. You must re-authenticate using the `--remote --step 1/2` flow for headless servers.

### 6. Config Merge Strategy
Don't blindly copy `openclaw.json` from source to target. The target may have a newer version with different defaults. Instead:
- Start with the target's config as base
- Merge in source-specific settings (channels, models, tools, agents, skills, plugins)
- Keep the target's gateway auth token
- Update any host-specific URLs (n8n, MCP servers, model endpoints)

## Network Dependencies

Document what hosts/services the OpenClaw instance needs to reach:

| Service | Host | Port | Protocol | Notes |
|---------|------|------|----------|-------|
| Matrix homeserver | comms.9xc.io | 443 | HTTPS | Chat channel |
| Local LLM (Olla) | olla:11434 | 11434 | HTTP | Primary model |
| vLLM | 172.16.254.100:8000 | 8000 | HTTP | Secondary model |
| GitHub Copilot | api.githubcopilot.com | 443 | HTTPS | Cloud fallback |
| Brave Search | api.search.brave.com | 443 | HTTPS | Web search |
| Google APIs | googleapis.com | 443 | HTTPS | Gmail, Calendar, Drive |
| SSH targets | nc, mas, olla | 22 | SSH | Remote management |

## Transfer Sizes (Reference)

From our migration (typical mature instance):
- Total workspace: **2.5 GB**
  - wiki/: 739 MB
  - mission-control/: 674 MB  
  - pkb/: 265 MB
  - certctl/: 260 MB
  - build/: 252 MB
  - .git/: 188 MB
  - antfarm/: 55 MB
  - skills/: 23 MB
  - memory/: 1.4 MB (187 daily files)

---

## References

- Playbook: `2026-04-08-openclaw-host-migration.md`
- OpenClaw Docs: `/home/localadmin/.npm-global/lib/node_modules/openclaw/docs`
- Migration Script: `scripts/openclaw-migrate.sh` (planned)

---

*Last Updated: 2026-04-08 | Author: Sam*
