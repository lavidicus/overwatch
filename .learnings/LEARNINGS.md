# Learning Log

Log corrections, knowledge gaps, and best practices discovered during operations.

## Format

## [LRN-YYYYMMDD-XXX] category

**Logged**: ISO-8601 timestamp
**Priority**: low | medium | high | critical
**Status**: pending | in_progress | resolved | wont_fix | promoted
**Area**: frontend | backend | infra | tests | docs | config

### Summary
One-line description of what was learned

### Details
Full context: what happened, what was wrong, what's correct

### Suggested Action
Specific fix or improvement to make

### Metadata
- Source: conversation | error | user_feedback | simplify-and-harden
- Related Files: path/to/file.ext
- Tags: tag1, tag2
- See Also: LRN-20250110-001 (if related to existing entry)
- Pattern-Key: simplify.dead_code | harden.input_validation (optional)
- Recurrence-Count: 1 (optional)
- First-Seen: 2025-01-15 (optional)
- Last-Seen: 2025-01-15 (optional)

### Resolution (if resolved)
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Promoted**: SOUL.md, TOOLS.md, etc. (if applicable)

---
## [LRN-20260307-002] correction

**Logged**: 2026-03-07T21:14:28Z
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Confirmed Olla VM IP is 172.16.254.78, not .83/.85; target static should be 172.16.254.100/24.

### Details
User corrected earlier assumption of DHCP IP; actual current IP is .78 and must be reconfigured to .100/24.

### Suggested Action
Update playbook and reconfigure VM network to static 172.16.254.100/24.

### Metadata
- Source: user_feedback
- Related Files: ITIL/playbooks/olla-vm-rebuild.md
- Tags: ip, network, olla

---
## [LRN-20260421-001] best_practice

**Logged**: 2026-04-21T01:17:00Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
llama-server.service on node2 needs context and batch tuning for OpenClaw multi-agent workload with large contexts.

### Details
node2 runs llama.cpp via llama-server.service with `--ctx-size 262144` and `-np 1`. Both Sam (gateway) and Samuel (job) use `node2/llamacpp` as their default model. OpenClaw contexts routinely hit ~90K tokens due to system prompts, memory files, and session history, requiring the full 262K context size to avoid compaction.

Current config: `-b 2048 -ub 1024 --ctx-checkpoints 32 --cache-ram 8192`
- 32 checkpoints at ~63MB each = ~2GB VRAM overhead
- 2048 batch size limits prompt processing throughput
- `--slot-prompt-similarity` is already enabled and working (0.10 threshold, currently matching 0.998 similarity)

Each active slot holds ~90K tokens × 32 checkpoints ≈ 2GB in KV cache. With 24.5GB VRAM per GPU and model pinned at ~23GB, there's only ~1-2GB free per GPU for context. Concurrent requests from Sam + Samuel will compete for this remaining headroom.

### Suggested Action
When VRAM contention causes slowdowns, apply these optimizations to `llama-server.service`:
1. **Reduce checkpoints**: `--ctx-checkpoints 32 → 16` (saves ~1GB VRAM, minimal functional impact)
2. **Increase batch size**: `--batch-size 2048 → 4096` and `--ubatch-size 1024 → 2048` (faster prompt processing)
3. **Consider second llama-server instance** on GPU 0 with smaller model for Job/Samuel (cleanest long-term fix)

Do NOT reduce `--ctx-size` below 262144 — OpenClaw contexts will trigger compaction, losing memory continuity.

### Metadata
- Source: user_feedback
- Related Files: /etc/systemd/system/llama-server.service
- Tags: llama.cpp, node2, openclaw, concurrent, vr-am, multi-agent
- Pattern-Key: harden.llama-server-tuning
- Recurrence-Count: 1
- First-Seen: 2026-04-21
- Last-Seen: 2026-04-21

---
## [LRN-20260305-001] correction

**Logged**: 2026-03-05T17:34:20Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Preferred gateway restart command is `systemctl --user restart openclaw-gateway`.

### Details
User clarified this command works best for restarting the OpenClaw gateway and should be used instead of `openclaw gateway restart`.

### Suggested Action
Use `systemctl --user restart openclaw-gateway` for gateway restarts by default; keep stop/start as fallback.

### Metadata
- Source: user_feedback
- Related Files: ITIL/policies/OPENCLAW_CONFIG_POLICY.md
- Tags: openclaw, gateway, restart

---
