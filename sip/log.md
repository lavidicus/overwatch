# SIP Log

## 2026-02-26 – Change & issue management framework
- **Idea:** Stand up a lightweight change-management + issue-tracking loop (ticket template, approval + verification steps, commit linkage).
- **Why:** Gives every config or process tweak traceability, makes rollback safer, and prioritizes fixes/improvements.
- **Plan:** Draft process doc (likely `sip/change-management.md`), define templates for change requests + issues, integrate with commits (require ticket IDs) and SIP reviews.
- **Status:** proposed
- **Notes:** Candidate tooling: markdown tickets in `sip/issues/` (fast) or GitHub Issues (better notifications). Pilot with sandbox-policy + heartbeat improvements once template is ready.

## 2026-02-26 – Establish SIP process
- **Idea:** Create a dedicated self-improvement program to capture optimization ideas and track follow-through.
- **Why:** Keeps a running backlog of improvements so we’re always iterating on speed, safety, and usefulness.
- **Plan:** Stand up `sip/` with README + log template, then treat it like a mini roadmap (review during heartbeats, update as items land).
- **Status:** done
- **Notes:** Directory + docs created; next step is to seed concrete improvement ideas (e.g., automate config backups, codify heartbeat review prompts, sandbox settings for local LLMs).
