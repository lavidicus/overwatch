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
