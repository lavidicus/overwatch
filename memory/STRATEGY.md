# Memory Loading Strategy

## Current State
- **MEMORY.md**: 13,444 bytes (67% of 20k limit) - Contains curated, long-term memories
- **memory/*.md**: 100+ files, ~884KB total - Contains raw daily logs

## Problem
MEMORY.md gets truncated at 20k chars. Old content gets pushed to the bottom and lost.

## Solution: Split Responsibilities

### MEMORY.md (Curated - Keep Under 20k)
- Permanent constraints (token limits, host names)
- Critical decisions and lessons learned
- Configuration locks (Olla, Gateway, RCLAW)
- Recent history (last 7-10 days)

### memory/ (Raw - Unbounded)
- Daily session logs
- Detailed incident records
- Command outputs
- Full conversation transcripts

## Loading Strategy

### New Session Bootstrap
1. Load **MEMORY.md** (curated, always relevant)
2. Load **memory/2026-MM-DD.md** (today's context)
3. Load **last N daily files** from memory/ (recent context)
4. Use **memory search** for historical queries

### Memory Search
When user asks about prior context:
- Run `memory_search()` on all memory/*.md files
- Pull only relevant snippets with `memory_get()`
- Don't load whole files unless explicitly requested

## Implementation

### 1. Memory Index File
Create `memory/MEMORY_INDEX.md` that cross-references:
- Key decisions in MEMORY.md
- Links to detailed daily files
- Topics covered in memory/ folder

### 2. Session Load Script
On session startup:
```bash
# Always load
read MEMORY.md
read memory/2026-MM-DD.md

# Load recent context
read memory/2026-MM-DD-1.md
read memory/2026-MM-DD-2.md
...
read memory/2026-MM-DD-7.md

# Memory search for history
memory_search(query) → get relevant snippets
```

### 3. Auto-Archive Old Entries
Every 7 days:
- Review MEMORY.md entries
- Move old entries to `memory/archives/`
- Update MEMORY.md with summary references

### 4. Prevent Bloat
- Don't log routine commands to MEMORY.md
- Use memory/ for daily logs
- Only curate significant events to MEMORY.md
- Trim MEMORY.md when approaching 17k bytes

## Migration Plan

### Phase 1: Clean MEMORY.md
- ✅ Remove historical sections (done)
- Keep: Permanent constraints, recent history (last 7 days)
- Move: Old incidents, resolved issues, completed projects

### Phase 2: Create Memory Index
- Cross-reference MEMORY.md with memory/ files
- Add topic links and summaries

### Phase 3: Update Bootstrap
- Modify session load to include memory/ search
- Ensure recent context is always available

### Phase 4: Monitor
- Cron job at 8 AM daily checks size
- Alert if > 16k bytes
- Manual review if > 18k bytes
