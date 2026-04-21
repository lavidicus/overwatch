# Config Editor Skill

A safer interactive editor for `~/.openclaw/openclaw.json` that lets you view, edit, add, and delete whole config sections without hand-editing the entire file.

## Usage

**Run the editor:**
```bash
python3 ~/.openclaw/workspace/projects/openclaw-section-editor/openclaw_section_editor.py [config_path]
```

**Or from anywhere (if in PATH):**
```bash
python3 openclaw_section_editor.py
```

## Commands

- **`help`** - Show help
- **`roots`** - Show top-level sections
- **`tree [path] [depth]`** - Show a section tree (default depth: 2)
- **`show [path]`** - Print a section as JSON
- **`edit <path>`** - Edit a whole section in $EDITOR (vim/nano)
- **`add <path>`** - Add/replace a section in $EDITOR
- **`set <path> <json5>`** - Replace a section with inline JSON5
- **`delete <path>`** - Delete a section or array item
- **`validate`** - Validate the current config
- **`backup`** - Create a manual backup now
- **`backups`** - List backups
- **`restore <backup-file>`** - Restore a backup after validation
- **`reload`** - Reload from disk
- **`quit` / `exit`** - Exit

## Path Examples

```
channels.telegram
agents.defaults.model
agents.list[0]
agents.defaults.models["openai/gpt-5.4"]
```

## Features

- **JSON5 support** - More flexible syntax than plain JSON
- **Timestamped backups** - Every write creates a backup
- **Validation** - Validates candidate configs before saving
- **Atomic writes** - Avoids partial/corrupt saves
- **Diff view** - Shows changes before committing
- **Editor integration** - Opens $EDITOR for interactive editing

## Dependencies

```bash
pip install json5
```

## Example Session

```
ocfg> tree
agents.defaults (object, 5 key(s))
├── model (string)
├── models (object, 2 key(s))
├── thinking (string)
├── toolsAllow (list, 2 item(s))
└── toolsDeselect (list, 1 item(s))
ocfg> show tools.exec.host
"gateway"
ocfg> set tools.exec.host "node"
[diff view]
Save this change? [y/N]: y
Saved ~/.openclaw/openclaw.json
Backup: ~/.openclaw/openclaw/backups/openclaw.json.20260409-012345.bak
Validation succeeded.
ocfg> quit
```

## Location

**Script:** `~/.openclaw/workspace/projects/openclaw-section-editor/openclaw_section_editor.py`

**Backups:** `~/.openclaw/openclaw/backups/`
