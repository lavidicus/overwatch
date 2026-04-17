# Learnings Log

> Captured learnings, corrections, and discoveries. Review before major tasks.

---

## 2026-04-10 — Daily Memory File Gap

**Context:** Session started on April 10, but memory/2026-04-09.md doesn't exist.

**Learning:** 
- Daily memory files should auto-create at session start if missing
- Current AGENTS.md says "read daily file if it exists" but doesn't create it
- Gap breaks continuity chain between sessions

**Action:** Add auto-create logic to session initialization workflow:
```bash
if [ ! -f memory/$(date +%Y-%m-%d).md ]; then
  echo "# Daily Notes — $(date +%Y-%m-%d) (UTC)" > memory/$(date +%Y-%m-%d).md
fi
```

**Status:** ⏳ Candidate for workflow improvement

---

## 2026-04-10 — gog-bridge Service Missing

**Context:** systemctl status gog-bridge.service returns "could not be found"

**Learning:** 
- gog-bridge was documented as running in TOOLS.md
- Service may have been removed during OCG → claw migration
- Endpoint curl to 18790 returns connection refused

**Action:** Verify gog-bridge installation:
```bash
# Check if installed
ls ~/.openclaw/skills/gog/

# Check npm packages
npm list -g | grep gog

# Reinstall if needed
npm install -g openclaw-skill-gog
```

**Status:** ⏳ Candidate for investigation

---

## 2026-04-10 — Antfarm Workflows Directory Missing

**Context:** node ~/.openclaw/workspace/antfarm/dist/cli/cli.js returns MODULE_NOT_FOUND

**Learning:** 
- Antfarm workflows were documented in AGENTS.md as installed
- Directory `~/.openclaw/workspace/antfarm/` doesn't exist
- Only antfarm-workflows skill exists in ~/.openclaw/skills/

**Action:** Reinstall antfarm workflows:
```bash
clawhub install antfarm-workflows
```

**Status:** ⏳ Candidate for reinstall

---

## 2026-04-09 — OCG → Claw Migration

**Context:** Full workspace migration from OCG (LXC) to claw (bare metal VM)

**Learning:** 
- rsync not installed on claw — used tar pipe instead
- Overwrote authorized_keys — locked out of SSH
- Device identity mismatch caused "pairing required" errors
- sudo NOPASSWD override fixed with /etc/sudoers.d/localadmin

**Action:** Always APPEND to authorized_keys, not overwrite. Test cron jobs immediately after migration.

**Status:** ✅ Promoted to memory/2026-04-09.md

---

## 2026-04-05 — Watchdog PATH Dependency

**Context:** Cron job running but failing with `missing required tools: openclaw`

**Learning:** 
- Cron jobs don't inherit user PATH by default
- Scripts using `openclaw` CLI need full path or PATH setup
- Test cron scripts manually to verify PATH resolution

**Action:** Update watchdog.sh to use `/home/localadmin/.npm-global/bin/openclaw` or add PATH to crontab.

**Status:** ⏳ Candidate for promotion after fix

---

*Review these learnings before major tasks. Status:*
- ✅ Promoted = In memory.md
- ⏳ Candidate = Needs more evidence
- 📦 Archived = No longer relevant
