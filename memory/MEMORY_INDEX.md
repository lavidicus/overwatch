# Memory Index

**Created:** 2026-03-21  
**Purpose:** Cross-reference MEMORY.md with memory/ daily files

## Permanent Constraints (MEMORY.md)
- **Sam name** → Locked into MEMORY.md ✅
- **Token threshold** → reserveTokens: 40000 (131k context)
- **Alert threshold** → 90% capacity (118k tokens)
- **Config locks** → Olla, Gateway (ocg), RCLAW

## Recent History (MEMORY.md)
- **2026-03-21 05:25-07:31** - Git push saga, config fixes, RCLAW recovery
- **2026-03-20** - Self-improving skills, PKB vault
- **2026-03-19** - Matrix user @jason, Olla health check
- **2026-03-16** - Context window metadata corruption
- **2026-03-15** - Read tool path resolution issue
- **2026-03-14** - Self-improving skills system complete

## Daily Files (memory/)
| Date | Size | Content |
|------|------|---------|
| 2026-03-21 | ~1k | Current session - config fixes, RCLAW |
| 2026-03-20 | ~14k | Git push saga, PKB vault, self-improving |
| 2026-03-19 | ~15k | Matrix user, Olla health, massage.net |
| 2026-03-16 | ~14k | Metadata corruption, context overflow |
| 2026-03-15 | ~13k | Read tool issue, parsing errors |
| 2026-03-14 | ~11k | Self-improving system, skills |
| 2026-03-13 | ~21k | CertForge PKI, 65k limit fix |
| 2026-03-10 | ~7k | ReserveTokens fix |
| 2026-03-08 | ~13k | Proxmox health, 65k limit fix |
| 2026-03-07 | ~1k | PKB vault created |

## Key Topics & References

### Configuration
- **Olla (gateway)**: `http://olla:11434/v1`, 262k context, ollama API
- **Gateway (ocg)**: localhost, 256k client, reserveTokens: 40000
- **RCLAW (Mac)**: `http://127.0.0.1:11434`, 131k context, ollama API

### Issues Resolved
- P2: Gateway Restart Availability ✅ (2026-03-03)
- Context Window Roll-Over Fix ✅ (2026-03-01)
- Triple Memory System ✅ (2026-03-01)
- Read Tool Path Resolution ✅ (2026-03-15)
- Context Window Metadata Corruption ✅ (2026-03-16)
- RCLAW API Mode Fix ✅ (2026-03-21)

### Tools & Skills
- **healthcheck** - Security hardening
- **weather** - Forecasts via wttr.in
- **gh-issues** - GitHub operations
- **self-improving** - Auto-fix errors
- **memory** - Search daily files

## Memory Search Queries
When user asks about:
- **"Remember X"** → `memory_search("X")` → get snippets
- **"What happened on X"** → Read `memory/YYYY-MM-DD.md`
- **"Prior context"** → `memory_search()` → relevant snippets

## Archive Strategy
- Monthly: Move old entries to `memory/archives/`
- Quarterly: Consolidate into summary files
- Keep MEMORY.md under 20k by trimming old entries
