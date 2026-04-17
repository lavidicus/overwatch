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
- ⚠️ llama-server `-np 1` causes fallback — switch to `-np 2`
- ⚠️ node2-metrics-aggregate-daily cron in error state
- ⚠️ Antfarm workflows directory may be missing
- ⚠️ clawhub CLI flags changed — don't rely on `--updates`

## Cron Jobs (8 active)
- Daily Self-Improvement Review (14:00 UTC → now 03:58 UTC)
- Memory Monitor (08:00 UTC)
- Daily Node2 Cost Report (12:00 UTC)
- Morning News Brief (12:00 UTC)
- Monthly Invoice (1st @ 09:00 UTC)
- Daily Systems Status Report (daily)
- Node2 Metrics Scraper (every 5m — ERROR)
- Node2 Metrics Aggregate (daily)
- GPU Persistence Check (weekly)

## Usage
- Load on every session
- Add patterns after 3x usage in 7 days
- Demote unused entries after 30 days
- Never exceed 100 lines (compact automatically)
