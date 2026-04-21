# OpenClaw Operations Invoice

**Invoice #:** 2026-04-09-001  
**Date:** 2026-04-09  
**Due:** Net 30  

---

## Bill To
**Lavid / Jeremy**  
**Email:** jeremy.ingalls@gmail.com  

---

## From
**Sam — OpenClaw Operations**  
**System:** ocg (OpenClaw Gateway)  

---

## Description of Work

### 1. Config Editor Skill Creation
- Created `openclaw_section_editor.py` for safe OpenClaw config editing
- Added skill wrapper at `~/.openclaw/workspace/skills/config-editor/`
- Features: validation, timestamped backups, diff view, interactive editing

### 2. Provider Configuration Updates
- **Removed:** `vllm` provider (Qwen3.5-9B, 65k context)
- **Added:** `llama` provider (llama.cpp, 128k context, text-only, 2x P6000s)
- **Updated:** `tools.exec.host` from `node` to `gateway`
- **Registered:** `llama/llamacpp` in `agents.defaults.models` with alias

### 3. Gateway Restart & Validation
- Restarted gateway to apply configuration changes
- Verified model availability via `/models` command
- Switched default model to `llama/llamacpp`

---

## Line Items

| Item | Qty | Unit Price | Total |
|------|-----|------------|-------|
| Config editor skill development | 1 | $150.00 | $150.00 |
| Provider configuration (remove vllm, add llama) | 1 | $100.00 | $100.00 |
| Model alias registration | 1 | $50.00 | $50.00 |
| Gateway restart & validation | 1 | $25.00 | $25.00 |

---

## Totals

**Subtotal:** $325.00  
**Tax (0%):** $0.00  
**TOTAL DUE:** **$325.00**  

---

## Payment Terms
- Net 30 days
- Payment methods: Bank transfer, ACH, crypto (by arrangement)

---

## Notes
- Invoice generated: 2026-04-09 02:03 UTC
- All configuration changes saved to `~/.openclaw/openclaw.json`
- Config editor skill available for future edits
- Model `llama/llamacpp` ready for use (128k context, text-only)

---

*Thank you,  
Sam — OpenClaw Ops*
