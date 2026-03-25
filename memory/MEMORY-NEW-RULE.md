# Memory Management - New Rule

**Effective:** 2026-03-21  
**Status:** ✅ Active

## The Problem
MEMORY.md was growing to 21k+ chars, causing truncation at 20k bootstrap limit. Old content got pushed out.

## The Solution

### 1. Split Memory Storage
- **MEMORY.md** (20k max): Curated, permanent constraints
- **memory/*.md**: Raw daily logs, unbounded
- **memory/MEMORY_INDEX.md**: Cross-references between the two

### 2. Session Loading
Every session now loads:
1. **MEMORY.md** (curated long-term memory)
2. **memory/2026-MM-DD.md** (today's session)
3. **Last 7 days** from memory/ (recent context)
4. **memory/MEMORY_INDEX.md** (cross-references)
5. **memory_search()** for historical queries

### 3. Auto-Archive
- When MEMORY.md approaches 17k bytes → trim old entries
- Move old entries to `memory/archives/`
- Update MEMORY_INDEX.md with references

### 4. Monitoring
- **Cron job**: Daily at 8 AM UTC
- **Warning**: 16k bytes (80% of 20k)
- **Alert**: Manual review if >18k bytes

## Files Created

| File | Purpose |
|------|---------|
| `memory/STRATEGY.md` | Memory management strategy |
| `memory/MEMORY_INDEX.md` | Cross-reference index |
| `scripts/load-memory.sh` | Memory loading script |
| `scripts/monitor-memory.sh` | Size monitoring (cron) |

## Current Status

- **MEMORY.md**: 13,444 bytes (67% of 20k)
- **memory/*.md**: 100+ files, ~884KB
- **Cron job**: Active, runs daily at 8 AM UTC

## Usage

### When User Asks About Memory
- **"What happened on X?"** → Read `memory/YYYY-MM-DD.md`
- **"Remember X"** → `memory_search("X")` → relevant snippets
- **"Prior context"** → Load recent memory files + search

### When Memory Gets Full
- Trim old entries from MEMORY.md
- Move to `memory/archives/`
- Update MEMORY_INDEX.md with references
- Keep MEMORY.md under 20k

## Next Steps

1. ✅ Memory management strategy defined
2. ✅ Index file created
3. ✅ Monitoring cron job added
4. 🔄 Update session bootstrap to use memory/ loading
5. 🔄 Test memory_search for historical queries
6. 🔄 Monitor and adjust as needed
