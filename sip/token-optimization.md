# Token Optimization Playbook

## Current high-burn areas (26 Feb 2026)
- `agent:main:signal:direct` session: ~180k tokens (172k input / 1.3k output). Long investigative turns with full context injections.
- `agent:main:main` heartbeat lane: ~78k tokens (mostly workspace bootstrap + large diffs).

## Quick wins (in flight)
1. **Heartbeat prompt tightening** – instruct agent to reply `No blockers — <UTC>` instead of `HEARTBEAT_OK`, reducing retries and wasted turns.
2. **HEARTBEAT.md checklist** – tiny list drives deterministic, short outputs (<240 chars).
3. **Reply brevity rule** – prefer bullets, avoid redundant summaries; surface diffs/commands only when materially useful.

## Next actions
- [ ] Capture 24h token report automatically (`scripts/token_report.py`) and drop into SIP log weekly.
- [ ] Trim system prompt injections (AGENTS/SOUL) by removing redundant prose and moving long docs to referenced files.
- [ ] Enforce compact diffs/logs: pipe through `tail`/`head`, attach files when >200 lines.
- [ ] Consider staging context summarization: before long tasks, summarize prior output into `<context>.md` and feed that instead of full transcripts.
- [ ] Explore `ollama/nemotron-3-nano:30b` for planning phases, escalate to GPT-5.x only for final write-ups.

Keep this file updated with measurable changes (token deltas, before/after snapshots) so we can prove savings over time.
