# MEMORY.md - Long-Term Memory

_Curated learnings, decisions, and context. Updated periodically from daily files._

## 🔒 PERMANENT CONSTRAINTS

- **Sam (ocg host)** — Name is "Sam", never change
  - Source: User instruction from Lavid (2026-03-04 18:28 UTC)
  - Status: Locked into MEMORY.md ✅

- **Eve (dc host)** — Name is "Eve", never change
  - Source: User instruction from Lavid (2026-03-04 18:29 UTC)
  - Status: Locked into MEMORY.md ✅

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

**Addressing Format:**
- When Lavid addresses me: `[name], [command]`
- Example: `"Eve, Please say hi"` → I respond to the command
- Example: `"Sam, check the logs"` → Sam responds to the command

**Group Chat Behavior:**
- Both bots see all group messages (they're both participants)
- Each bot checks if addressed by name before responding
- If not addressed, stay silent unless genuinely helpful to contribute
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

- **Eve (dc):** 🤖, ops butler AI (sysadmin/engineering/PM/EA)
  - Host: Linux runtime `dc`
  - Model: `ollama/qwen3.5-9B:latest`
  - Workspace: `/home/localadmin/.openclaw/workspace`
  - Gateway: Port 18789, local mode, loopback binding

- **Shared Workspace:** `/home/localadmin/.openclaw/workspace`
- **Channel:** Signal group "Workgroup Bots"
- **Tag Team Mode:** Active ✅

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

## Context Overflow Crisis - March 4, 2026 (15:21-18:28 UTC)

### Incident Summary

**Root Cause:** Context overflow error loop (16:11-18:27 UTC)

**Key Findings:**
1. **Config changes not applied without restart:** Context size increased to 262k tokens, reserveTokens changed to 50,000, but services not restarted - changes inactive
2. **Accumulated message history:** Session history grew to 910KB, tool calls and metadata piled up
3. **Gateway restart critical:** Only full gateway restart (stop+start) resolved the overflow state
4. **Session cleanup alone insufficient:** Deleting session file didn't fix the issue - gateway state was the blocker

### Resolution

**Gateway Restart (18:27 UTC):**
- Command: `openclaw gateway stop && sleep 2 && openclaw gateway start`
- Result: ✅ Context cleared to 23% capacity (29k/131k tokens)
- Result: ✅ Queue cleared (depth 2 → 0)
- Result: ✅ Agent fully operational

### Lessons

- ⚠️ **Config changes require service restart** - Changes to context size, model, etc. don't take effect without gateway restart
- ⚠️ **Session cleanup is not enough** - Deleting session files doesn't clear gateway internal state
- ⚠️ **Full restart needed:** `stop + sleep + start` is more reliable than `restart` command
- ✅ **Proactive monitoring:** Consider implementing context growth monitoring and automatic alerts at 80% capacity

---

## Recent History

- **2026-03-07 04:35:** PKB vault created (`workspace/pkb/`) — Obsidian personal knowledge base for mental models and cross-domain connections
- **2026-03-04 16:44:** Updated llama-server config on olla with vision support and flash attention
- **2026-03-04 12:26:** Logged ITIL-ISSUE-HEARTBEAT-NEWS-BRIEFING - missed 6AM CST news briefing
- **2026-03-03 19:50:** Repository renamed to `sam` → https://github.com/lavidicus/sam
- **2026-03-03 19:33:** Config cleanup - removed OpenAI dependencies, simplified Signal config
- **2026-03-03 19:00:** ✅ Resolved Gateway Restart P2 (ITIL-ISSUE-GATEWAY-RESTART-AVAILABILITY)
- **2026-03-03 18:52:** Tag team setup complete (Sam+Eve), MEMORY.md created, git tracking initialized
- **2026-03-03 15:10:** System healthy, daily backup successful
- **2026-03-03 13:15-15:10:** Fixed vLLM provider warnings (removed bad config)
- **2026-03-03 13:08:** News briefing - Iran conflict escalating
- **2026-03-03 07:02:** System healthy after overnight sleep
- **2026-03-01:** Triple Memory System installed
- **2026-03-01:** Context Window Fix documented and configured
- **2026-02-28:** ITIL Issue Management workflow created
- **2026-02-28:** Initial OpenClaw setup and configuration

---

*Created: 2026-03-03 | Tag Team Setup: 2026-03-03 (Sam+Eve) | P2 Resolved: 2026-03-03 19:00 UTC*