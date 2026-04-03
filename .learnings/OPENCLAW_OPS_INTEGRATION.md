# 🚀 OpenClaw-OPS Integration (2026-04-03)

**Source:** Cathryn Lavery's `openclaw-ops` repo  
**Status:** ✅ Ready for integration (scripts available)  
**Priority:** High (addresses common post-update breakages)

---

## What It Is

**OpenClaw-OPS** is an operations layer for OpenClaw that:
- Monitors gateway health (auto-restart if down)
- Repairs common post-update breakages
- Detects config drift after version bumps
- Scans for credential leaks and security gaps
- Audits skills before installation
- Provides watchdog with escalation tiers

**Repository:** https://github.com/cathrynlavery/openclaw-ops

---

## High-Impact Scripts

### 1. `heal.sh` — One-Shot Auto-Fix
**Fixes:**
- Gateway down (port conflict, auth removal)
- Exec approval allowlist shadowing
- Cron job auto-disable after errors
- Session file bloat (>10MB)
- Dead sessions (0 tokens, empty content)
- Auth token blocks (OAuth → API key)

**Use Case:** Run after OpenClaw updates to auto-repair

---

### 2. `watchdog.sh` — Always-On Guardian
**Features:**
- **Tier 1:** HTTP ping every 5 min
- **Tier 2:** Auto-restart gateway if down
- **Tier 3:** Escalate after 3 failures (macOS notification)
- Survives reboots (LaunchAgent on macOS, cron on Linux)

**Use Case:** Replace manual health checks with always-on monitoring

---

### 3. `check-update.sh` — Version Change Detection
**Features:**
- Detects OpenClaw version changes
- Reports config fields that broke
- Auto-fixes common issues (`--fix` flag)
- Logs incidents to `~/.openclaw/logs/heal-incidents.jsonl`

**Use Case:** Understand what broke after updates

---

### 4. `security-scan.sh` — Credential & Config Audit
**Features:**
- Scans for leaked secrets (redacted output)
- Scores config hardening (0-100)
- Detects unauthorized skill file changes (SHA-256 drift)
- Checks file permissions for credential exposure

**Use Case:** Proactive security monitoring

---

### 5. `skill-audit.sh` — Pre-Install Validation
**Features:**
- Static analysis before installation
- Detects hardcoded secrets
- Flags suspicious network calls
- Identifies prompt injection risks
- Checks third-party skill reputation

**Use Case:** Safe skill installation from ClawHub

---

## Integration Strategy

### Phase 1: Script Integration (Immediate)
**Action:** Clone to skills directory
```bash
git clone https://github.com/cathrynlavery/openclaw-ops.git ~/.openclaw/skills/openclaw-ops
```

**Benefits:**
- One-click heal after updates
- Manual watchdog installation
- Security scans on demand

---

### Phase 2: MCP Wrappers (Medium)
**Create MCP scripts for:**
- `heal_mcp.py` → call `heal.sh` via subprocess
- `watchdog_mcp.py` → start/stop watchdog, check status
- `check_update_mcp.py` → detect version changes
- `security_mcp.py` → run security scan
- `skill_audit_mcp.py` → audit skills before install

**Benefits:**
- Call from OpenClaw tools (no shell needed)
- Integrate with MCP servers
- Auto-run on scheduled triggers

---

### Phase 3: Cron Automation (High)
**Integrate with existing cron jobs:**
- **Daily 8 AM:** Run `heal.sh` after health check
- **Every 5 min:** Install watchdog (replace manual cron)
- **Weekly Sunday:** Run `check-update.sh` + `security-scan.sh`
- **On skill install:** Auto-run `skill-audit.sh`

**Benefits:**
- Proactive maintenance
- Post-update auto-repair
- Security monitoring without manual intervention

---

### Phase 4: Self-Improvement Integration (Ongoing)
**Add to daily review:**
1. Run `heal.sh` if errors detected
2. Check watchdog status
3. Compare config SHA-256 vs last known good
4. Log incidents to `.learnings/ERRORS.md`
5. Promote patterns to `MEMORY.md`

**Benefits:**
- Continuous improvement
- Auto-detect breakage patterns
- Learn from post-update issues

---

## Recommended Promotions to `MEMORY.md`

### 🔒 PERMANENT CONSTRAINTS (Add New Section)

**OpenClaw-OPS Integration**
- **Gateway Watchdog** — Auto-restart if down, escalate after 3 failures
  - Source: `scripts/watchdog.sh` (cathrynlavery/openclaw-ops)
  - Implementation: Tiered escalation (HTTP ping → restart → notification)
  - Status: ⏳ Pending installation (scripts available)
  
- **Exec Approval Repair** — Fix empty allowlist shadowing `*` wildcard
  - Source: `scripts/heal.sh` (cathrynlavery/openclaw-ops)
  - Problem: Named agent entries with empty allowlists block agents
  - Fix: Auto-detect and correct allowlist configuration
  - Status: ⏳ Pending integration
  
- **Config Drift Detection** — Track version changes + config field resets
  - Source: `scripts/check-update.sh` (cathrynlavery/openclaw-ops)
  - Features: Auto-fix common issues, log incidents
  - Status: ⏳ Pending integration
  
- **Security Scan** — Credential exposure + config hardening score
  - Source: `scripts/security-scan.sh` (cathrynlavery/openclaw-ops)
  - Output: Redacted secrets, 0-100 score, file paths
  - Status: ⏳ Pending integration
  
- **Skill Audit** — Pre-install validation (secrets, network calls, injection)
  - Source: `scripts/skill-audit.sh` (cathrynlavery/openclaw-ops)
  - Benefit: Safe third-party skill installation
  - Status: ⏳ Pending integration

---

## Implementation Plan

### Immediate (Today)
1. ✅ Clone repo to `~/.openclaw/skills/openclaw-ops`
2. ✅ Test `heal.sh` on current system
3. ✅ Document findings in `.learnings/`

### Short-Term (This Week)
1. ⏳ Create MCP wrappers for 5 core scripts
2. ⏳ Integrate with existing cron jobs
3. ⏳ Add to daily self-improvement review
4. ⏳ Promote to `MEMORY.md`

### Long-Term (Ongoing)
1. ⏳ Monitor breakage patterns
2. ⏳ Auto-apply fixes when detected
3. ⏳ Share improvements with community
4. ⏳ Contribute back to `openclaw-ops` repo

---

## Comparison: Hermes vs. OpenClaw-OPS

| Feature | Hermes | OpenClaw-OPS | Combined |
|---------|--------|--------------|----------|
| **Performance** | Tool pre-loading, parallel processing | N/A | ✅ Fast + stable |
| **Context** | Session summarization (87.8% reduction) | N/A | ✅ Low tokens + stable |
| **MCP** | Filesystem, Database, API | Scripts via MCP | ✅ Direct + scripts |
| **Cron** | Health, backup, rotation | Watchdog, auto-heal | ✅ Proactive + reactive |
| **Security** | Credential pattern detection | Config hardening + audit | ✅ Comprehensive |
| **Updates** | N/A | Config drift detection + auto-fix | ✅ Smart updates |
| **Ops** | Basic monitoring | Gateway health + repair | ✅ Full ops suite |

**Key Insight:** Hermes focuses on **performance and context**, while OpenClaw-OPS focuses on **stability and repair**. Together they create a robust, self-healing system.

---

## Next Steps

1. **Clone repo:** `git clone https://github.com/cathrynlavery/openclaw-ops.git ~/.openclaw/skills/openclaw-ops`
2. **Test heal.sh:** Run `bash scripts/heal.sh`
3. **Create MCP wrappers:** Add to `~/.openclaw/workspace/.hermes_workspace/`
4. **Integrate with cron:** Add to daily self-improvement review
5. **Promote to MEMORY.md:** Add as permanent constraints

**Expected Outcome:** Post-update breakages auto-repaired, watchdog prevents gateway downtime, security scans catch credential leaks early.

---

**Status:** All scripts available, ready for integration into self-improvement program  
**Integration Date:** 2026-04-03  
**Priority:** High (complements Hermes improvements)
