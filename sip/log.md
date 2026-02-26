# SIP Log

## 2026-02-26 – Token spend optimization sprint
- **Idea:** Launch a continuous token-reduction program (SIP) focusing on prompt hygiene, model routing, and heartbeat/cron efficiency.
- **Why:** Lower OpenAI + Ollama usage costs while keeping responses high quality.
- **Plan:**
  1. Audit top token sinks (sessions.json stats, model logs) and rank by daily spend.
  2. Ship quick wins: trim system prompt cruft, enforce compact replies for heartbeats, limit reasoning verbosity, dedupe repeated diffs/logs.
  3. Longer term: add auto-summarized context windows, use lower-cost local models for prep work, schedule periodic cleanup of session history.
- **Status:** proposed
- **Notes:** First actions: pull 24h token report, identify >10k token runs, and draft per-surface guidance (Signal vs README vs SIP docs) to keep output lean.

## 2026-02-26 – Heartbeat delivery mismatch (Signal)
- **Idea/Issue:** Heartbeat runs show as delivered in logs (OpenClaw TUI) but no actual message arrives in Signal chat.
- **Why:** Need reliable heartbeat visibility; log-only delivery defeats the purpose.
- **Plan:** Investigate channel routing (Signal CLI profile, pairing status, heartbeat target) and capture root cause + fix. Track as an issue in change-management workbook once template exists.
- **Status:** in-progress
- **Notes:** Repro: manual heartbeat run 18:34Z appears in TUI but not on device. Logs show `delivered reply` despite missing message. Direct `openclaw message send` test succeeded instantly, so channel + account are fine. Suspect heartbeats returning only `HEARTBEAT_OK`, which OpenClaw drops per ack rules. Next step: adjust heartbeat prompt/ack settings so “no update” messages still send (or ensure heartbeats include actual summaries).

## 2026-02-26 – OpenAI fallback + heartbeat target
- **Idea:** Ensure OAuth-backed GPT-5.1 rolls over to prepaid API key models, and align heartbeat delivery with Signal.
- **Why:** Prevent outages when the OAuth quota caps out, and make heartbeat outputs show up where we actually monitor them.
- **Plan:** Reorder `agents.defaults.model` so primary=`openai-codex/gpt-5.1-codex` with `openai/gpt-5.1-codex` first in fallbacks, then update heartbeat `target` to `signal` and restart gateway.
- **Status:** done (config updated + gateway healthy)
- **Notes:** Follow-up: document this in future change-management template once finalized.

## 2026-02-26 – Change & issue management framework
- **Idea:** Stand up a lightweight change-management + issue-tracking loop (ticket template, approval + verification steps, commit linkage).
- **Why:** Gives every config or process tweak traceability, makes rollback safer, and prioritizes fixes/improvements.
- **Plan:** Draft process doc (likely `sip/change-management.md`), define templates for change requests + issues, integrate with commits (require ticket IDs) and SIP reviews.
- **Status:** in-progress
- **Notes:** Forgot to log some model/provider updates and failed to surface Anthropic credit errors leading to silent OpenAI fallback. Action items: retroactively ticket model/provider changes and add monitoring so auth failures trigger immediate alerts. Candidate tooling: markdown tickets in `sip/issues/` or GitHub Issues. Pilot with sandbox-policy + heartbeat improvements once template is ready.

## 2026-02-26 – Establish SIP process
- **Idea:** Create a dedicated self-improvement program to capture optimization ideas and track follow-through.
- **Why:** Keeps a running backlog of improvements so we’re always iterating on speed, safety, and usefulness.
- **Plan:** Stand up `sip/` with README + log template, then treat it like a mini roadmap (review during heartbeats, update as items land).
- **Status:** done
- **Notes:** Directory + docs created; next step is to seed concrete improvement ideas (e.g., automate config backups, codify heartbeat review prompts, sandbox settings for local LLMs).
