# Daily Self-Improvement Review — 2026-04-24 (Friday)

## Summary
System operationally healthy. 11 cron jobs (1 error). Known issues persist without user approval. Memory hygiene is excellent.

## 🔧 Setup Improvements Recommended

1. **llama-server `-np 2`** — The single-slot bottleneck has been known for 8 days. Proposing: update ExecStart to `-np 2 --cache-ram 4096` (split VRAM between 2 slots). This would allow concurrent requests without Opus fallback.
2. **Reinstall antfarm** — `clawhub install antfarm-workflows` to restore `~/.openclaw/workspace/antfarm/` directory.
3. **Fix Daily Systems Status Report cron** — Job `3d829b8f` in error state. Either debug and fix or recreate.
4. **ClawHub login** — Run `clawhub login` to enable skill update checking.

## 📝 Learnings Captured
- `clawhub sync --dry-run` requires login (new learning)
- `llama-server -np 1` still confirmed as bottleneck via live ssh check (promoted)
- Memory file duplication issue appears resolved (no duplicates in Apr 22-24 files)
- node2-metrics-aggregate-daily fixed since Apr 19

## ⚠️ Issues Found
- Daily Systems Status Report cron (3d829b8f) — error state
- llama-server `-np 1` — 8 days unresolved
- Antfarm directory missing — 39 days unresolved
- No `clawhub login` — can't check for skill updates

## ✅ Things Working Well
- 10/11 cron jobs healthy
- node2 GPUs healthy (idle, temps normal)
- llama-server serving requests (~29 tok/s, ~4ms prompt eval/token)
- MEMORY.md clean, no stale references
- Daily memory files well-maintained
- No duplication issues this cycle

## 🎯 Suggested Next Actions for Jeremy
1. **Approve llama-server `-np 2` update** — single biggest performance fix available
2. **Run `clawhub install antfarm-workflows`** — restores workflow capability
3. **Fix or remove broken Systems Status Report cron** — 1 error to clean up
4. **Run `clawhub login`** — enable update checking for skills

---
— Sam 🧑‍💼
