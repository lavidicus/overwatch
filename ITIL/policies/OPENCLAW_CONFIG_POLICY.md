# OpenClaw Configuration Management

## Overview
This document tracks configuration changes to OpenClaw gateway and agent settings.

## Configuration Files

### Primary Configuration
- **Path**: `/home/localadmin/.openclaw/openclaw.json`
- **Purpose**: Gateway and agent defaults
- **Version Control**: Git (pushed to workspace repo)
- **Owner**: ops-team

### Session-Specific Configuration
- **Path**: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Purpose**: Per-session metadata and state
- **Management**: Auto-managed by Gateway

## Key Configuration Areas

### Compaction Settings

**Location**: `agents.defaults.compaction`

| Setting | Value | Purpose |
|---------|-------|---------|
| `mode` | `safeguard` | Enable auto-compaction protection |
| `reserveTokens` | *default* | Headroom before compaction triggers |
| `keepRecentTokens` | *default* | Tokens to keep unsummarized |
| `memoryFlush.enabled` | `true` | Pre-compaction memory preservation |
| `memoryFlush.softThresholdTokens` | *default* | Buffer before compaction for flush |

**Formula**: Compaction triggers when `contextTokens > contextWindow - reserveTokens`

**Pre-Compaction Flush Flow**:
1. Context reaches soft threshold → Silent memory flush
2. Context reaches reserve threshold → Auto-compaction
3. Reserve tokens provide headroom for prompts/outputs

#### Change History

| Date | Change ID | Setting | Old Value | New Value | Reason |
|------|-----------|---------|-----------|-----------|--------|
| 2026-02-28 | CR-004 | `reserveTokens` | *not set* | `20000` | Prevent overflow at 100% capacity |
| 2026-02-28 | CR-005 | `memoryFlush` | *not set* | `enabled: true` | Preserve context before compaction |

### Model Configuration

**Location**: `agents.defaults.model`

| Setting | Value |
|---------|-------|
| `primary` | `github-copilot/gpt-4o` |
| `fallbacks` | `[]` |

### Heartbeat Model

**Location**: `agents.defaults.heartbeat.model`

| Setting | Value |
|---------|-------|
| `model` | `olla/qwen3.5:latest` |

### Ollama Provider Configuration

**Location**: `models.providers.olla`

| Setting | Value |
|---------|-------|
| `baseUrl` | `http://olla:11434` |
| `api` | `ollama` |

## Related Ollama Configuration

### llama.cpp Context-Shift Flag

**Setting**: `--context-shift`
**Location**: Ollama server startup config
**Purpose**: Improves token sliding window behavior
**Effect**: Keeps recent tokens more accessible, reduces "lost in the middle" problem

**Combined with compaction**:
- Compaction at reserve threshold: Reduces overall context size
- Context-shift: Optimizes which tokens remain accessible
- Result: Layered protection against context degradation

## Change Management Process

### For Configuration Changes

1. **Document**: Create change request in `ITIL/change-requests/`
2. **Implement**: Update config file
3. **Apply**: Restart affected services (gateway if needed)
4. **Verify**: Test and confirm expected behavior
5. **Track**: Update CHANGE_TICKETS.md
6. **Monitor**: Watch for issues over 24h

### Approval Levels

| Impact | Approval Required |
|--------|-------------------|
| Low (config-only, local) | Requestor + Self-review |
| Medium (user impact) | Change Manager |
| High/Critical (service impact) | CAB |

## Audit Trail

### Recent Changes

**CR-007** (2026-03-05): Session Transcript Repair (Tool Result Mismatch)
- Changed: Session transcript (inserted synthetic tool results for interrupted tool calls)
- Reason: Gateway restarts interrupted tool executions, leaving pending tool calls and breaking tool use
- Mitigation: Repair transcript + avoid in-session restarts when possible
- Status: Implemented (session repaired; monitoring)

**CR-006** (2026-03-05): Ollama API Fix for Tool Calling
- Changed: `models.providers.olla.api`
- From: `openai-completions`
- To: `ollama`
- Reason: Prevent tool-call diff errors when streaming
- Status: Implemented (restart pending)

**CR-004** (2026-02-28): Context Compaction Fix
- Changed: `agents.defaults.compaction.reserveTokens`
- From: Not set (caused 100% trigger)
- To: 20000 (triggers at 70%)
- Status: Complete, verified

**CR-003** (2026-02-28): Token Optimization
- Changed: Heartbeat prompt, response guidelines
- Impact: ~30% daily token reduction
- Status: Complete

**CR-001** (2026-02-28): Olla CMDB Entry
- Created: SRV-001 CI entry
- Added: Ollama server to CMDB
- Status: Complete

## Monitoring

### Regular Checks
- Weekly: Review `/status` for context patterns
- Monthly: Audit configuration drift
- Quarterly: Full configuration review

### Alerting
- Context usage > 80%: Investigate compaction behavior
- Compaction count increasing rapidly: Review token usage patterns
- Gateway restarts: Verify config loaded correctly
- Tool transcript errors ("missing tool result"): Check for pending tool calls; repair transcript or start a new session

---

**Owner**: ops-team
**Last Updated**: 2026-03-05 17:31 UTC
**Next Review**: 2026-06-05
