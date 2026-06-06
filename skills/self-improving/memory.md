# HOT Memory — OpenClaw

> Curated learnings and patterns. Keep ≤100 lines.

## System Architecture
- **Gateway:** Running on `ocg` (OpenClaw main instance)
- **Model:** llama.cpp on `node2` (172.16.254.101, 2× Quadro P6000, 48GB VRAM)
- **usm1:** Removed 2026-04-04
- **olla:** Decommissioned; replaced by node2 (2026-04-15)
- **Memory limit:** 19KB max for MEMORY.md

## OpenClaw Configuration
- **Model:** node2/llamacpp (local) with fallback: github-copilot/claude-opus-4.6
- **Context:** Qwen3.5-35B-UN-A3B + MMProj vision on node2
- **Exec approvals:** Active for @lavid:comms.9xc.io
- **Cron:** watchdog.sh every 5 minutes

## File Management
- **Edit tool:** Requires exact text match, fallback to write tool
- **MEMORY.md:** Trimmed to 16KB (removed usm2 SSH, Signal groups, Identity/Setup)
- **PKB:** Updated with ollam/olla host info

## Lessons Learned
- ✅ usm1 removed from network (2026-04-04)
- ✅ olla decommissioned, replaced by node2 (2026-04-15)
- ✅ OpenClaw-OPS integrated (6 scripts, watchdog cron)
- ✅ Memory trimmed to 16KB
- ✅ hugpull + llm-selector skills created (2026-04-16)
- ✅ node2-metrics-aggregate-daily fixed (Apr 19)
- ⚠️ llama-server `-np 1` causes fallback — switch to `-np 2` (11 days unresolved, proposed fix documented)
- ⚠️ n8n service lost during OCG→claw migration — npx binary exists (v2.15.1), no systemd unit (confirmed Apr 26)
- ⚠️ gog-bridge service inactive — no service file, no binary found
- ⚠️ Antfarm workflows directory missing (41 days unresolved)
- ⚠️ clawhub login required for update checks
- ⚠️ TS SAS disk at 66% (15T/22T), node2 root at 74% (174G/249G) — monitor monthly, plan cleanup
- ⚠️ VM 100 (NODE1) still stopped on Proxmox

## Cron Jobs (10 total, 0 error)
- Daily Self-Improvement Review (14:00 UTC)
- Node2 Metrics Scraper (every 5m)
- Node2 P6000 Monitor (every 4h)
- rsync-movies-completion (every 5m)
- rsync-movies-8pm-cst (daily 02:00Z)
- daily-systems-status (every 1d)
- GPU Persistence Check (every 7d)
- Memory Monitor (08:00 UTC)
- Daily Node2 Cost Report (12:00 UTC)
- Morning News Brief (12:00 UTC)
- node2-metrics-aggregate-daily (every 1d — **FIXED** since Apr 19)
- Daily Systems Status Report (Mon-Fri 18:00 CST — **RECOVERED** Apr 25)
- Monthly Invoice (1st @ 09:00 UTC)
- Daily Self-Improvement Review (this cron — 14:00 UTC)
- Daily Self-Improvement Review (14:00 UTC)
- Node2 Metrics Scraper (every 5m)
- Node2 P6000 Monitor (every 4h)
- rsync-movies-completion (every 5m)
- rsync-movies-8pm-cst (daily 02:00Z)
- daily-systems-status (every 1d)
- GPU Persistence Check (every 7d)
- Memory Monitor (08:00 UTC)
- Daily Node2 Cost Report (12:00 UTC)
- Morning News Brief (12:00 UTC)
- node2-metrics-aggregate-daily (every 1d — **FIXED** since Apr 19)
- Daily Systems Status Report (Mon-Fri 18:00 CST — **RECOVERED** Apr 25)
- Monthly Invoice (1st @ 09:00 UTC)
- Daily Self-Improvement Review (this cron — 14:00 UTC)

## Usage
- Load on every session
- Add patterns after 3x usage in 7 days
- Demote unused entries after 30 days
- Never exceed 100 lines (compact automatically)
