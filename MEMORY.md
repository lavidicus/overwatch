# MEMORY.md - Long-Term Memory

_Curated learnings, decisions, and context. Updated periodically from daily files._

## 🔒 PERMANENT CONSTRAINTS

- **Sam (ocg host)** — Name is "Sam", never change
  - Source: User instruction from Lavid (2026-03-04 18:28 UTC)
  - Status: Locked into MEMORY.md ✅

- **Token Threshold Configuration** — Always maintain reserveTokens: 40000 for 131k context window
  - Source: User instruction from Jeremy (2026-03-16 20:31 UTC)
  - Context: Parsing errors at pos 232 caused by context overflow
  - Configuration: reserveTokens: 40000 triggers compaction at ~91k tokens
  - Status: ✅ Documented as permanent constraint

- **Context Window Alert Threshold** — Alert user at 90% capacity
  - Source: User instruction from Jeremy (2026-03-16 20:53 UTC)
  - Configuration: Alert when context exceeds 118k tokens (90% of 131k)
  - Status: ✅ Active monitoring

## 🛑 Context Overflow / Parsing Errors (2026-03-15 06:56-06:59 UTC)

**Issue:** `Failed to parse input at pos 1950` - repeated parsing errors

**Root Cause:** Context window (131k tokens) filling up with tool outputs, metadata, and documentation. Parser hits limit and fails.

**Symptoms:**
- Parsing errors at specific character positions
- Occurs after multiple tool calls and long conversations
- Affects session status, tool outputs, etc.

**Fix:** Start fresh session to clear accumulated context and metadata.

**User Instruction:** "Keep auto fixing your errors. Or tell me exactly why it reported an error so I can redirect your work."

**Status:** ⚠️ Requires session restart to fully resolve

**Next:** Recommend `/reset` to clear context and start fresh

## 🛑 CRITICAL: read tool path resolution issue (2026-03-15 06:23 UTC)

**Issue:** The `read` tool fails with "No such file or directory" errors even when files exist and are accessible via `exec` commands.

**Root Cause:** Tool has path resolution issues with certain file paths, despite files being present and accessible through shell commands.

**Symptoms:**
- `read` tool returns ENOENT errors
- `exec` commands (cat, head, ls) work fine on same files
- Files exist and are readable via shell

**Fix Applied:**
- ✅ **Use `exec` tool instead** for all file operations
- ✅ Commands: `cat`, `head -N`, `tail -N`, `wc -l`, `stat`
- ✅ More reliable in this environment

**Files affected:**
- `/home/localadmin/.openclaw/workspace/build/plex/library/*.txt`
- Any workspace files

**Status:** ✅ Documented and working around

**Next:** Never use `read` tool for file access; always use `exec` with shell commands.

---

## 🔐 SSH Access - hal-maint (2026-03-05 03:37-03:39 UTC)

**Added to Sam (ocg host):**

### usm1 (Confirmed ✅)
- **User:** hal-maint@usm1 (shown as `root@usm1` in authorized_keys)
- **Location:** ~/.ssh/authorized_keys
- **Purpose:** Maintenance access from usm1 host
- **Status:** ✅ Verified and documented

### usm2 (Confirmed ✅)
- **User:** hal-maint@usm2
- **Status:** ✅ Verified - SSH connection successful
- **Note:** newer kernel (6.17.9-1 vs 6.5.13-5 on usm1)

**Existing SSH Keys:**
- `id_ed25519_olla` - Ollama provider
- `id_rsa` - Standard SSH key

**Security Note:** Keep SSH access minimal and monitored. Regular audit recommended.

## 🛑 CRITICAL: usm1 Kernel Version Constraint

**Date:** 2026-03-05 03:42 UTC  
**Host:** usm1.9xc.local (172.16.254.231)  
**Current Kernel:** 6.5.13-5-pve

**CONSTRAINT:** ⚠️ **NEVER UPDATE KERNEL ON usm1**

**Reason:** NVIDIA VGPU drivers break with kernels newer than 6.5.x

**Impact:** VGPU passthrough functionality will be lost if kernel is updated

**Mitigation:**
- Pin kernel to 6.5.x series on usm1
- Exclude usm1 from automatic kernel updates
- Document in configuration management
- Monitor for security patches that might require kernel updates

**Related:** usm2 runs 6.17.9-1-pve without NVIDIA VGPU requirements

**Group Chat Behavior:**
- Both bots see all group messages (they're both participants)
- Each bot checks if addressed by name before responding. Allowed addressing tokens include: `@Sam`, `@sam`, `Sam,` and your Matrix ID `@lavid:comms.9xc.io`. If none of these tokens appear, the bot stays silent unless it has a high-confidence, low-risk contribution to make.
- React with emoji to acknowledge messages without cluttering chat

**Purpose:**
- Clear intent signaling - command follows name
- Distinguish between conversation and instructions
- Consistent with voice command patterns
- Prevent duplicate/confused responses in tag team mode

**Status:** Locked into MEMORY.md ✅

## Identity & Setup (Tag Team)

- **Sam (ocg):** 🧑‍💼, ops butler AI (sysadmin/engineering/PM/EA)
  - Host: Linux Proxmox LXC container `ocg`
  - Model: `olla/qwen3.5:latest`
  - Workspace: `/home/localadmin/.openclaw/workspace`

## Operating Principles (Shared)

- **Text > Brain** — If it's not written down, it doesn't survive restarts
- **Execute before asking** — Try to figure it out, then ask if stuck
- **Earn trust through competence** — Bold internally, cautious externally
- **Don't exfiltrate private data** — Ever. Period.
- **Orchestrate first** — Plan → Execute → Verify → Summarize
- **Be genuinely helpful** — Not performatively helpful
- **Have opinions** — Not a search engine with extra steps
- **Remember we're guests** — Respect privacy and boundaries

## Tools & Skills

- **Healthcheck skill** — Security hardening, firewall/SSH config, risk posture
- **Weather skill** — Forecasts via wttr.in
- **GitHub/gh CLI** — Issues, PRs, CI runs, code review
- **TTS (ElevenLabs sag)** — Voice storytelling for movie summaries, storytime
- **Triple Memory System** — LanceDB, Git-Notes memory, file search
- **Browser automation** — OpenClaw browser control
- **Node device control** — Cameras, screens, notifications
- **Sub-agent orchestration** — Spawn sessions, manage sub-agents
- **PKB Vault (Obsidian)** — Personal knowledge base for mental models, frameworks, cross-domain connections
  - **Location:** `workspace/pkb/`
  - **Purpose:** Knowledge synthesis layer ("think with" vs "retrieve")
  - **Structure:** daily/, areas/, resources/, inbox/, templates/, archives/
  - **Integration:** Symlinked to `memory/` for reference
  - **Created:** 2026-03-07
  - **Content:** 141+ guides (Linux, Windows, Proxmox, Networking, Database, AI/ML, Radio)
  - **Concept Notes:** System Admin KB, Docker, Storage, Virtualization, Network Security, Windows Admin
  - **ITIL Integration:** Cross-referenced with operational playbooks

## ITIL Issue Management (2026-02-28)

- Full workflow in `ITIL/` directory:
  - `ITIL/ITIL-ISSUE-MANAGEMENT.md` — System documentation
  - `ITIL/issues/` — Issue tracking files
  - `ITIL/issues/TEMPLATE.md` — Standard template
  - `ITIL/playbooks/` — Operational playbooks
  - `ITIL/reports/` — SLA reports, trend analysis
- Issue categories: Incident, Service Request, Problem, Change
- Priority levels P1-P4 with defined SLAs (15min-72hr response/resolution)
- Workflow stages: New → Triage → In Progress → Pending → Resolved → Closed
- GitHub integration via `/gh-issues` skill for engineering tickets

## Context Window Roll-Over Fix (2026-03-01)

**Issue:** Context window failed to roll when approaching 2M tokens; llama-server rejected prompts >65536 tokens.

**Root Cause:** Client-side accumulation - OpenClaw built prompts to 66k+ tokens before sending, exceeding server's `--ctx-size 65535`. SWA checkpoints cycling fine (1→8) but compaction didn't fire early enough.

**Fixes Applied:**
1. **Server:** Updated `llama-server.service` to `--ctx-size 131072` (2x buffer) — ready to deploy
2. **Client:** Updated `openclaw.json` `reserveTokens: 20000 → 40000` — compaction triggers at ~216k tokens
3. **Code:** Pending - add prompt builder guard (`if tokens > ctx_size * 0.9: trigger_compaction()`)

**Files:**
- `ITIL/ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md` — Full issue tracking
- `llama-server.service` — Updated config ready for deployment
- `DEPLOY-LLAMA-SERVER.md` — Deployment instructions

**Status:** Configured but not deployed (requires sudo)

**Next:** Deploy to both hosts (ocg + dc), test long conversation, submit code fix to OpenClaw repo.

## Triple Memory System (2026-03-01)

Installed a three-layer memory architecture for persistent context across sessions:

### Layer 1: LanceDB (Conversation Memory)
- **Status:** Configured in `openclaw.json`
- **Features:** Auto-recall, auto-capture
- **Requires:** OpenAI API key for vector embeddings (currently using OAuth)
- **When active:** Injects relevant memories before each response

### Layer 2: Git-Notes Memory
- **Location:** `skills/git-notes-memory/memory.py`
- **Storage:** `memory/git-notes/memory.md`
- **Features:** Structured decisions with tags and importance levels
- **Importance levels:** critical (c), high (h), normal (n), low (l)
- **Usage:** Store preferences, decisions, corrections

### Layer 3: File Search
- **Script:** `scripts/file-search.sh`
- **Searches:** All workspace .md, .json, .txt files
- **When to use:** Finding context in existing docs

**Documentation:** `TRIPLE_MEMORY_SETUP.md`

**Usage examples:**
- `python3 skills/git-notes-memory/memory.py remember "My preference" -i h -t tag1,tag2`
- `python3 skills/git-notes-memory/memory.py list`
- `./scripts/file-search.sh "query" 10`

## Resolved Issues (2026-03-03)

### P2: Gateway Restart Availability ✅
- **Issue:** Gateway restart causes agent unavailability
- **Symptom:** Tool calls failing with "missing tool result in session history; inserted synthetic error result"
- **Root Cause:** Session not auto-reconnecting after gateway restart
- **Resolution:** ✅ **RESOLVED** - Gateway restarts now work properly without manual intervention
- **Resolution Time:** 2026-03-03 19:00 UTC
- **ITIL ID:** ITIL-ISSUE-GATEWAY-RESTART-AVAILABILITY

### Signal Group Policy Warning
- **Issue:** Allowlist configured with no entries
- **Impact:** Affects group messages only
- **Status:** Optional fix (non-blocking)

## Lessons Learned

- ✅ **Gateway Restart P2 Fixed** - Restarts now work without manual intervention (2026-03-03 19:00 UTC)
- File edits via `edit` tool can fail silently (race condition?)
- Need automatic post-restart health checks
- Configuration changes should trigger proper service restarts
- Memory states can differ across hosts — need shared MEMORY.md
- Git tracking essential for cross-host sync

---

## Recent History

- **2026-03-19 14:26:** Matrix user created - @jason:comms.9xc.io (password: Demo1234!, admin)
  - Command: `register_new_matrix_user -c /etc/matrix-synapse/homeserver.yaml -u 'jason' -p 'Demo1234!' -a`
  - Server: Synapse on comms.9xc.local
- **2026-03-19 14:27:** Olla llama-server.service confirmed running
  - PID 106212, 13.0G RAM, processing Qwen3.5 model
  - Context window: 131k tokens, SWA checkpoints active
  - Performance: ~737 tokens/sec prompt eval, ~94 tokens/sec generation
- **2026-03-19 14:20:** Target Massage website build active
  - For David Martin, Jeremy's friend
  - Stack: Next.js 14, Tailwind, TypeScript, Framer Motion
  - Colors: red/black (#CC2222/#1A1A1A) to match actual business sign
  - Live at localhost:3456, tunnel: persons-bicycle-productivity-displaying.trycloudflare.com
  - Features: Sticky phone bar, review platform badges, benefit-focused copy, dual-tone CTA colors
  - Contact section: Google Maps embed, Call/Text booking buttons (318-613-8377 / 318-442-1100)
- **2026-03-16 20:38:** Context window metadata corruption (559k counter overflow) - FIXED via reset
- **2026-03-14 14:20:** Self-Improving Skills System COMPLETE - Full auto-improvement working ✅
- **2026-03-14 14:19:** First auto-improvement cycle successful (+33.3% improvement)
- **2026-03-14 14:14:** System built - 6 core modules created
- **2026-03-14 14:04:** Project started - cognee-skills inspiration
- **2026-03-13 20:35:** CertForge Dockerized PKI complete - web management portal built
- **2026-03-13 19:55:** Context window 65k hardcoded limit - FIXED (SDK patched to 262k)
- **2026-03-13 06:00:** Morning news briefing - Iran-Israel conflict, 4 US service members killed
- **2026-03-10 03:51:** Context Window ReserveTokens fix applied (20000 → 40000)
- **2026-03-08 06:19:** Context Window 65k hardcoded limit - FIXED (SDK patched)
- **2026-03-08 12:47:** Proxmox cluster health check - 3 nodes, fully quorate ✅
- **2026-03-07 04:35:** PKB vault created (`workspace/pkb/`) - Obsidian personal knowledge base
- **2026-03-04 16:44:** Updated llama-server config on olla with vision support
- **2026-03-04 12:26:** Logged ITIL-ISSUE-HEARTBEAT-NEWS-BRIEFING - missed 6AM CST news briefing
- **2026-03-03 19:50:** Repository renamed to `sam` → https://github.com/lavidicus/sam
- **2026-03-03 19:33:** Config cleanup - removed OpenAI dependencies
- **2026-03-03 19:00:** ✅ Resolved Gateway Restart P2
- **2026-03-03 18:52:** Tag team setup complete (Sam+Eve)
- **2026-03-01:** Triple Memory System installed
- **2026-02-28:** ITIL Issue Management workflow created
- **2026-02-28:** Initial OpenClaw setup and configuration

---

*Created: 2026-03-03 | Tag Team Setup: 2026-03-03 (Sam+Eve) | P2 Resolved: 2026-03-03 19:00 UTC | CertForge Dockerized: 2026-03-13 20:35 UTC | Self-Improving Skills: 2026-03-14 14:20 UTC | read tool issue: 2026-03-15 06:23 UTC | Metadata corruption: 2026-03-16 15:36 UTC*
