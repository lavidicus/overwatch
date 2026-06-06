# Corrections Log — OpenClaw

> Last 50 corrections. Promoted patterns move to memory.md.

## 2026-04-10

### 14:00 — Daily self-improvement review (2026-04-10)
- **Correction:** "Daily memory file for 2026-04-09 is missing"
- **Context:** Session started on April 10, but memory/2026-04-09.md doesn't exist
- **Count:** 1
- **Action:** Should auto-create daily memory file at session start if it doesn't exist

### 14:00 — gog-bridge service status
- **Correction:** "gog-bridge service not found"
- **Context:** Systemctl status gog-bridge.service returns "could not be found"
- **Count:** 1
- **Action:** gog-bridge service not installed or not running — need to install or verify configuration

### 14:00 — Antfarm CLI path
- **Correction:** "node ~/.openclaw/workspace/antfarm/dist/cli/cli.js not found"
- **Context:** Antfarm workflows directory missing from workspace
- **Count:** 1
- **Action:** Antfarm workflows may need to be reinstalled via clawhub

## 2026-04-15

### 03:58 — Node1 → Node2 migration cleanup
- **Correction:** Self-improving memory.md still referenced olla/RTX 3090; updated to node2/P6000
- **Context:** Infrastructure migrated to node2 on 2026-04-15
- **Count:** 1
- **Action:** Updated memory.md with correct node2 references

## 2026-04-16

### 14:00 — llama-server single-slot bottleneck
- **Correction:** llama-server with `-np 1` blocks all requests during long generations, causing OpenClaw fallback to claude-opus
- **Context:** Jeremy reported node2/llamacpp falling back; root cause was single slot + 8192 max_tokens generation
- **Count:** 1
- **Action:** Propose `-np 2` as default; document in TOOLS.md and llm-selector skill

### 14:00 — node2-metrics-aggregate-daily cron error
- **Correction:** Cron job 45b0ffee is in `error` state
- **Context:** Daily metrics aggregation failing silently
- **Count:** 1
- **Action:** Investigate logs and fix; may need SSH target or script update

## 2026-04-11

### 14:00 — Daily self-improvement review (2026-04-11)
- **Correction:** "clawhub CLI options differ from expected"
- **Context:** Attempted `clawhub list --updates` failed; CLI doesn't accept `--updates`
- **Count:** 1
- **Action:** Update self-improving docs to use `clawhub list` then `clawhub sync` or consult `clawhub --help` for update commands

## Recent Promotions
- usm1 removed (2026-04-04)
- usm2 → `olla` (2026-04-04)
- MEMORY.md size constraint (19KB max)
- OpenClaw-OPS integration (6 scripts, watchdog cron)
- Daily memory file auto-creation needed (2026-04-10)

## Log Format
- **Timestamp** — ISO 8601
- **Correction** — What user said
- **Context** — What triggered it
- **Count** — Occurrences (for promotion)
- **Action** — Where stored

## 2026-04-18

### 14:00 — Daily memory file runaway duplication
- **Correction:** memory/2026-04-18.md had 33 duplicate `# 2026-04-18` sections (1043 lines → 180 after dedup)
- **Context:** Multiple sessions/cron runs appending identical blocks without checking for existing content
- **Count:** 1 (but affects both Apr 17 and 18 files)
- **Action:** Before appending to daily memory, grep for section header to avoid duplication. Fixed both files.

### 2026-04-19 02:01 — Compaction model mismatch wastes resources
- **Correction:** "It was changing models for compaction and then having to switch back, then reload context. What a waste."
- **Context:** Compaction model was set to `github-copilot/claude-opus-4.6` while session model was `node2/llamacpp`. Every compaction spun up a separate Opus call, then switched back — extra API cost + context reload overhead.
- **Count:** 1
- **Action:** Removed compaction.model override. Compaction now uses session model (node2/llamacpp). Added to self-improvement pattern list for resource-waste detection.

### 14:00 — Memory file duplication STILL occurring
- **Correction:** memory/2026-04-18.md has 4 duplicate headers, 2026-04-19.md has 2 duplicate headers
- **Context:** Despite identifying this issue on Apr 18, no guard has been implemented
- **Count:** 3 (Apr 17, 18, 19)
- **Action:** Need a dedup wrapper script or pre-append check — this is now a promoted pattern

### 14:00 — Library Sync Check cron in error state
- **Correction:** Cron job 458f7867 (Library Sync Check) is in `error` state
- **Context:** TV series sync transfer may have completed or failed
- **Count:** 1
- **Action:** Investigate and fix or remove if sync is complete

### 14:00 — llama-server.service changes status unclear
- **Correction:** The Apr 18 memory file had 30+ copies of "IN PROGRESS" status for llama-server changes but later entries show it was applied
- **Context:** Session appended "IN PROGRESS" repeatedly without updating status to "DONE"
- **Count:** 1
- **Action:** When tracking async tasks in memory, update status in-place rather than appending new entries

## 2026-04-24

### 14:00 — Daily Systems Status Report cron in error state
- **Correction:** Cron job `3d829b8f` (Daily Systems Status Report) is in `error` state
- **Context:** Runs Mon-Fri at 18:00 America/Central. Last run 15h ago errored. No recent sessions found for this cron.
- **Count:** 1 (first occurrence)
- **Action:** Investigate cron logs or recreate the cron job. May be failing due to model/agent config drift.

### 14:00 — llama-server still uses `-np 1` (single-slot)
- **Correction:** llama-server.service on node2 still configured with `-np 1` flag despite being identified as a bottleneck on 2026-04-16
- **Context:** Server running as PID 659442, active 13h, serving requests fine but single-slot means concurrent requests queue up and cause fallback to Opus
- **Count:** 1 (still unresolved after 8 days)
- **Action:** Revisit with Jeremy to approve `-np 2` update and verify GPU memory can handle 2 slots

### 14:00 — Antfarm workflows directory missing
- **Correction:** `~/.openclaw/workspace/antfarm/dist/cli/cli.js` still missing. `clawhub install antfarm-workflows` needs to be re-run.
- **Context:** Skill `~/.openclaw/skills/antfarm-workflows/` exists (has SKILL.md) but the antfarm data directory is gone.
- **Count:** 2 (first noted Apr 10, still unresolved)
- **Action:** `clawhub install antfarm-workflows` to restore the antfarm directory.

### 14:00 — ClawHub login required for update check
- **Correction:** `clawhub sync --dry-run` fails with "Not logged in"
- **Context:** Can't check for skill updates without `clawhub login`.
- **Count:** 1
- **Action:** Run `clawhub login` when convenient to enable update checking.

### 2026-04-25 14:00 — n8n unreachable on gateway host
- **Correction:** n8n not responding on `http://ocg.9xc.local:5678` or `http://127.0.0.1:5678` — HTTP 000 (connection refused)
- **Context:** TOOLS.md references n8n extensively as a critical automation service. Service status cannot be verified via gateway SSH.
- **Count:** 1 (new)
- **Action:** Investigate n8n service on gateway host. May need `sudo systemctl restart n8n` or check if it moved ports.

### 14:00 — n8n cron job still counted as healthy despite unreachable service
- **Correction:** The cron job `00019542` (daily-systems-status) reports `ok` but n8n itself is unreachable
- **Context:** Cron job health ≠ service health. The cron runs but n8n workflows can't be accessed.
- **Count:** 1 (new)
- **Action:** When n8n is restored, verify webhooks are still registered after restart. Add n8n health check to heartbeat.

### 2026-04-26 14:00 — n8n never properly installed on gateway host
- **Correction:** n8n service file (`n8n.service`) does not exist on gateway host `claw`. The binary exists via npx (`~/.npm/_npx/.../n8n`, version 2.15.1) and config exists at `~/.n8n/`, confirming n8n was installed on a previous host ("ocg") but the systemd unit was lost during the OCG→claw migration.
- **Context:** TOOLS.md references n8n on `ocg.9xc.local:5678` as a critical automation service. The n8n-migrate project folder doesn't exist either. n8n-migrate was a project name, not a service install. Service is completely dead — no systemd unit, no running process.
- **Count:** 1 (first occurrence)
- **Action:** n8n needs to be properly installed: `npm install -g n8n` + create systemd unit. Or confirm with Jeremy if n8n is still needed on this host (it may have been running on a different machine). TOOLS.md references n8n extensively — this is a critical gap in automation infrastructure.

### 2026-04-26 14:00 — Daily Systems Status Report recovered (confirmed)
- **Correction:** Cron `3d829b8f` (Daily Systems Status Report) shows `ok` with `delivered: true` on last run. Recovery confirmed via run history.
- **Context:** Previously in error on Apr 24, recovered by Apr 25. Now verified with delivery confirmation.
- **Count:** 1 (re-confirmed)
- **Action:** Logged as stable. Monitor for recurrence.

### 2026-04-27 14:00 — llama-server still uses `-np 1` (11 days unresolved)
- **Correction:** llama-server.service on node2 still configured with `-np 1` flag despite being identified as a bottleneck on 2026-04-16
- **Context:** Server running as PID 659442, active since Apr 24. GPU memory pinned at ~97% (23883/24576 MiB), GPU util 0%, idle. Single-slot mode causes concurrent requests to queue and fallback to Opus.
- **Count:** 11
- **Action:** Proposed `-np 2` change. GPU has ~700 MiB free per card — should be enough for a second slot. Needs Jeremy's approval to update and restart llama-server.

### 2026-04-27 14:00 — Node2 disk at 74% (was 74% last check)
- **Correction:** Root disk on node2 is at 74% (174G/249G). TS SAS at 66% (15T/22T). Both stable but trending up.
- **Context:** No significant change from last check (74% vs 74%). Node2 root still needs cleanup plan. TS SAS disk plan needed before 80%.
- **Count:** 1 (still tracked)
- **Action:** Monitor monthly. Recommend log rotation and old model cleanup on node2. TS SAS needs quarterly review.

### 2026-04-27 14:00 — n8n service lost during migration confirmed
- **Correction:** n8n has no systemd unit file on gateway host. npx binary no longer in npx cache (stale). Only config and SQLite DB remain at `~/.n8n/`.
- **Context:** Confirmed n8n was installed via npm on old host "ocg". Migration to claw dropped the service. Data (SQLite DB) is intact but service is dead. gog-bridge also missing — no binary, no service file.
- **Count:** 1
- **Action:** Needs Jeremy's decision: restore n8n + gog-bridge on gateway, or confirm they're not needed here. If needed: `npm install -g n8n` + systemd unit + gog-bridge install. TS still shows 66% SAS, 74% node2 root — both need attention but not urgent.
