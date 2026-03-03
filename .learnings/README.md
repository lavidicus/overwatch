# Self-Improvement Program (SIP)

This directory tracks learnings, errors, and feature requests for continuous improvement.

## 📁 Structure

- `LEARNINGS.md` - Corrections, knowledge gaps, best practices
- `ERRORS.md` - Command failures, exceptions, unexpected behaviors
- `FEATURE_REQUESTS.md` - User-requested capabilities and missing features

## 🎯 When to Log

### Log to LEARNINGS.md when:
- User corrects you ("No, that's wrong...")
- You discover outdated knowledge
- You find a better approach
- You learn project-specific conventions

### Log to ERRORS.md when:
- A command returns non-zero exit code
- You get an exception or stack trace
- Something behaves unexpectedly
- An external API fails

### Log to FEATURE_REQUESTS.md when:
- User asks for a new capability
- You realize something is missing
- There's a workflow gap

## 📝 ID Format

`TYPE-YYYYMMDD-XXX` where:
- TYPE: `LRN`, `ERR`, or `FEAT`
- YYYYMMDD: Current date
- XXX: Sequential number (001, 002) or random (A7B)

## 🔄 Promoting Learnings

When a learning is broadly applicable, promote it to workspace files:

| Learning Type | Promote To | Example |
|---------------|------------|---------|
| Behavioral patterns | `SOUL.md` | "Be concise, avoid disclaimers" |
| Tool gotchas | `TOOLS.md` | "Git push needs auth configured first" |
| Workflow improvements | `AGENTS.md` | "Spawn sub-agents for long tasks" |
| Long-term decisions | `MEMORY.md` | Architecture decisions, key insights |

## 📊 Review Checklist

Before starting a major task:
1. Check `grep -h "Status.*: pending" .learnings/*.md | wc -l` for pending items
2. Review high-priority items: `grep -B5 "Priority.*: high" .learnings/*.md`
3. Look for related entries: `grep -l "Area.*: infra" .learnings/*.md`

## 🤝 Tag Team Integration

Sam (ocg) and Eve (dc) both maintain this workspace. Changes are synced via:
- Sam: https://github.com/lavidicus/sam
- Eve: https://github.com/lavidicus/eve

---

*Generated: 2026-03-03 | Tag Team: Sam + Eve*