# ITIL-ISSUE-MODEL-DEFAULT-MISMATCH

**Issue ID:** ITIL-ISSUE-MODEL-DEFAULT-MISMATCH  
**Created:** 2026-03-05 18:11 UTC  
**Priority:** P3 (Medium)  
**Category:** Incident  
**Status:** New

## Summary
Session started with a non-default model (github-copilot/gpt-5.2-codex) despite default being set to `olla/qwen3.5:latest`.

## Problem Description
After /new or /reset, the runtime model was gpt-5.2-codex instead of the configured default (olla/qwen3.5:latest). This contradicted an explicit user request to use the default model.

## Impact
- Incorrect model used for the session
- User expectation violated

## Timeline
- **Detected:** 2026-03-05 18:10 UTC
- **Acknowledged:** 2026-03-05 18:11 UTC
- **Current Stage:** New

## Investigation
- Attempted to set the model via `session_status` override to `olla/qwen3.5:latest`
- Tool returned: `Model "olla/qwen3.5:latest" is not allowed.`

## Resolution
Pending.

## Follow-up
- **Root Cause:** Likely model allowlist/permission mismatch or session override not refreshed after restart.
- **Prevention:** Ensure allowed model list includes `olla/qwen3.5:latest` and session defaults are applied on new sessions.
- **Known Workaround:** Use an allowed model or update allowlist/config.

## SLA Tracking
- **Target Response:** 2026-03-05 19:11 UTC
- **Target Resolution:** 2026-03-06 18:11 UTC
- **Status:** On Track

---
**Owner:** @Sam  
**Tags:** model, default, session, incident
