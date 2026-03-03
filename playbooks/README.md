# Playbooks - Operation Manuals

This folder contains step-by-step instruction manuals for recurring tasks, setups, and operations. Each playbook documents how we completed a task so we can reproduce it in the future.

## 📁 Structure

```
playbooks/
├── README.md                    # This file
├── TEMPLATE.md                  # Playbook template
├── 2026-03-03-                  # Date-prefixed folders
│   └── <playbook-name>.md
└── ...
```

## 📝 Playbook Format

Each playbook follows this structure:

### Header

```markdown
## [PLAYBOOK-ID] <Title>

**Date**: YYYY-MM-DD
**Author**: <name>
**Status**: active | deprecated | archived
**Complexity**: simple | medium | complex
**Time**: <estimated time to complete>
```

### Sections

1. **Overview** - What this playbook does
2. **Prerequisites** - What's needed before starting
3. **Step-by-Step Instructions** - Detailed steps
4. **Verification** - How to confirm success
5. **Troubleshooting** - Common issues and fixes
6. **References** - Related playbooks, documentation

## 🎯 When to Create a Playbook

Create a playbook when:

- ✅ You complete a complex task that might be repeated
- ✅ You document a setup that needs to be reproduced
- ✅ You want to capture institutional knowledge
- ✅ A task involves multiple steps or systems
- ✅ You discover a better approach worth sharing

## 📊 Current Playbooks

| Playbook | Date | Author | Status |
|----------|------|--------|--------|
| *Add as you create them* | | | |

---

*Created: 2026-03-03 | Tag Team: Sam + Eve*