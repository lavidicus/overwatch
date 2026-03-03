## [PLAYBOOK-20260303-001] Tag Team Setup - Sam & Eve

**Date**: 2026-03-03
**Author**: Sam (ocg) + Eve (dc)
**Status**: active
**Complexity**: medium
**Time**: 2-3 hours

---

## Overview

This playbook documents the setup of a tag team AI assistant configuration with two instances running on different hosts (Sam on `ocg`, Eve on `dc`), sharing a common workspace and synchronized via GitHub.

**When to use**: Setting up a new multi-agent system, replicating the tag team architecture, or onboarding a new host.

---

## Prerequisites

- [ ] Two hosts configured (e.g., `ocg` and `dc`)
- [ ] OpenClaw installed on both hosts
- [ ] GitHub account with access to create repositories
- [ ] GitHub personal access token with repo permissions
- [ ] SSH keys configured (recommended) or token access
- [ ] Network connectivity between hosts for git operations

---

## Step-by-Step Instructions

### Step 1: Create GitHub Repositories

Create separate repositories for each agent:

```bash
# Create repo for Sam (ocg)
gh repo create lavidicus/sam --public --description "Sam's OpenClaw workspace"

# Create repo for Eve (dc)
gh repo create lavidicus/eve --public --description "Eve's OpenClaw workspace"
```

**Expected Output:**
```
Created repository lavidicus/sam on GitHub
Created repository lavidicus/eve on GitHub
```

---

### Step 2: Initialize Git on Both Hosts

#### On Sam's host (ocg):

```bash
cd /home/localadmin/.openclaw/workspace
git init
git remote add origin https://lavidicus:<TOKEN>@github.com/lavidicus/sam.git
git add .
git commit -m "Initial tag team setup: workspace baseline"
git push -u origin main
```

#### On Eve's host (dc):

```bash
cd /home/localadmin/.openclaw/workspace
git init
git remote add origin https://lavidicus:<TOKEN>@github.com/lavidicus/eve.git
git add .
git commit -m "Initial tag team setup: workspace baseline"
git push -u origin main
```

**Expected Output:**
```
Branch 'main' set up to track 'origin/main'.
Everything up-to-date
```

---

### Step 3: Create Shared Memory File (MEMORY.md)

Create a canonical long-term memory file on both hosts:

```bash
cd /home/localadmin/.openclaw/workspace
cat > MEMORY.md << 'EOF'
# MEMORY.md - Long-Term Memory

## Identity & Setup (Tag Team)

- **Sam (ocg)**: 🧑‍💼, ops butler AI
  - Host: Linux Proxmox LXC container `ocg`
  - Model: `olla/qwen3.5:latest`
  - Workspace: `/home/localadmin/.openclaw/workspace`

- **Eve (dc)**: 🤖, ops butler AI
  - Host: Linux runtime `dc`
  - Model: `ollama/qwen3.5-9B:latest`
  - Workspace: `/home/localadmin/.openclaw/workspace`
  - Gateway: Port 18789, local mode

- **Shared Workspace**: `/home/localadmin/.openclaw/workspace`
- **Channel**: Signal group "Workgroup Bots"
- **Tag Team Mode**: Active ✅

## Operating Principles (Shared)

- **Text > Brain** — If it's not written down, it doesn't survive restarts
- **Execute before asking** — Try to figure it out, then ask if stuck
- **Earn trust through competence** — Bold internally, cautious externally
- **Don't exfiltrate private data** — Ever. Period.
- **Orchestrate first** — Plan → Execute → Verify → Summarize
- **Be genuinely helpful** — Not performatively helpful
- **Have opinions** — Not a search engine with extra steps
- **Remember we're guests** — Respect privacy and boundaries

## Recent History

- **<date>** - <event>

---

*Created: YYYY-MM-DD | Tag Team Setup: YYYY-MM-DD*
EOF
```

**Commit and push to both repos:**

```bash
git add MEMORY.md
git commit -m "Add shared MEMORY.md for tag team"
git push origin main
```

---

### Step 4: Set Up Self-Improvement Program (SIP)

Create `.learnings/` directory on both hosts:

```bash
cd /home/localadmin/.openclaw/workspace
mkdir -p .learnings

# Create LEARNINGS.md
cat > .learnings/LEARNINGS.md << 'EOF'
# Learning Log

## Format

## [LRN-YYYYMMDD-XXX] category

**Logged**: ISO-8601 timestamp
**Priority**: low | medium | high | critical
**Status**: pending | in_progress | resolved | wont_fix | promoted
**Area**: frontend | backend | infra | tests | docs | config

### Summary
One-line description of what was learned

### Details
Full context: what happened, what was wrong, what's correct

### Suggested Action
Specific fix or improvement to make

### Metadata
- Source: conversation | error | user_feedback
- Related Files: path/to/file.ext
- Tags: tag1, tag2
- See Also: LRN-20250110-001 (if related)
- Pattern-Key: optional pattern identifier
- Recurrence-Count: 1 (optional)
- First-Seen: 2025-01-15 (optional)
- Last-Seen: 2025-01-15 (optional)

### Resolution (if resolved)
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Promoted**: SOUL.md, TOOLS.md, etc.

---
EOF

# Create ERRORS.md
cat > .learnings/ERRORS.md << 'EOF'
# Error Log

## Format

## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending | in_progress | resolved | wont_fix
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
```
Actual error message or output
```

### Context
- Command/operation attempted
- Input or parameters used
- Environment details if relevant

### Suggested Fix
If identifiable, what might resolve this

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001 (if recurring)

### Resolution (if resolved)
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done

---
EOF

# Create FEATURE_REQUESTS.md
cat > .learnings/FEATURE_REQUESTS.md << 'EOF'
# Feature Requests

## Format

## [FEAT-YYYYMMDD-XXX] capability_name

**Logged**: ISO-8601 timestamp
**Priority**: medium
**Status**: pending | in_progress | resolved | wont_fix
**Area**: frontend | backend | infra | tests | docs | config

### Requested Capability
What the user wanted to do

### User Context
Why they needed it, what problem they're solving

### Complexity Estimate
simple | medium | complex

### Suggested Implementation
How this could be built, what it might extend

### Metadata
- Frequency: first_time | recurring
- Related Features: existing_feature_name

### Resolution (if resolved)
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done

---
EOF

# Create README.md for .learnings
cat > .learnings/README.md << 'EOF'
# Self-Improvement Program (SIP)

Log learnings, errors, and feature requests for continuous improvement.

## Format

- **LEARNINGS.md**: Corrections, knowledge gaps, best practices
- **ERRORS.md**: Command failures, exceptions
- **FEATURE_REQUESTS.md**: User-requested capabilities

## ID Format

`TYPE-YYYYMMDD-XXX` where TYPE is `LRN`, `ERR`, or `FEAT`

## Promoting Learnings

When a learning is broadly applicable:
- **SOUL.md**: Behavioral patterns
- **TOOLS.md**: Tool gotchas
- **AGENTS.md**: Workflow improvements
- **MEMORY.md**: Long-term decisions

---

*Created: 2026-03-03 | Tag Team: Sam + Eve*
EOF

# Commit and push
git add .learnings/
git commit -m "Add Self-Improvement Program (SIP) structure"
git push origin main
```

---

### Step 5: Create Playbooks Directory

```bash
cd /home/localadmin/.openclaw/workspace
mkdir -p playbooks

# Create playbooks README
cat > playbooks/README.md << 'EOF'
# Playbooks - Operation Manuals

Step-by-step instruction manuals for recurring tasks and setups.

## Structure

```
playbooks/
├── README.md
├── TEMPLATE.md
└── <date>-<playbook-name>.md
```

## When to Create

- Complex task that might be repeated
- Setup that needs to be reproduced
- Institutional knowledge capture
- Multi-step operations

---

*Created: 2026-03-03 | Tag Team: Sam + Eve*
EOF

# Commit and push
git add playbooks/
git commit -m "Add Playbooks directory structure"
git push origin main
```

---

### Step 6: Verify Setup

#### Check GitHub Repos:

```bash
# On Sam's host
git remote -v
# Should show: lavidicus/sam

# On Eve's host
git remote -v
# Should show: lavidicus/eve
```

#### Verify Files Synced:

```bash
# List committed files on both hosts
git log --oneline
```

#### Test Tag Team Communication:

Send a test message to the group chat to verify both agents can communicate.

---

## Verification

**Success Criteria:**

- [ ] Both GitHub repositories created and accessible
- [ ] Git initialized on both hosts with correct remotes
- [ ] MEMORY.md created and synced to both repos
- [ ] `.learnings/` directory created on both hosts
- [ ] `playbooks/` directory created on both hosts
- [ ] All commits pushed to respective GitHub repos
- [ ] Both agents can read/write to their repos

**Verification Commands:**

```bash
# Check remote configuration
git remote -v

# Check branch status
git branch -a

# Check commit history
git log --oneline

# List workspace files
ls -la
```

---

## Troubleshooting

### Issue: Git authentication fails

**Symptom:**
```
Authentication failed for lavidicus/eve.git
```

**Fix:**
1. Verify token has write permissions to the repo
2. Use SSH instead of HTTPS (recommended)
3. Check token hasn't expired

```bash
# Test SSH connection
ssh -T git@github.com

# Set up SSH remote
git remote set-url origin git@github.com:lavidicus/eve.git
```

---

### Issue: Remote URL is wrong

**Symptom:**
Remote points to wrong repository (e.g., Sam's pointing to Eve's repo)

**Fix:**
```bash
git remote set-url origin https://lavidicus:<TOKEN>@github.com/lavidicus/<correct-repo>.git
git push -u origin main
```

---

### Issue: Files not syncing between hosts

**Symptom:**
MEMORY.md or other files differ between hosts

**Fix:**
1. Check both hosts have same commit history
2. Pull from respective repos to get latest
3. Push any local changes
4. Verify no merge conflicts

```bash
# On both hosts
git pull origin main
git status
```

---

## References

- Related Playbook: None yet
- OpenClaw Docs: https://docs.openclaw.ai
- GitHub Help: https://docs.github.com

---

*Last Updated: 2026-03-03 | Authors: Sam + Eve*