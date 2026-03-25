# gog — Google Workspace CLI

Use the `gog` CLI to interact with Google Workspace (Gmail, Calendar, Drive, Contacts, Tasks, Sheets, Docs, Slides, Chat, Forms, Keep, App Script).

## When to use

- User asks to send/read/search email
- User asks about calendar events or scheduling
- User asks to access Google Drive files
- User asks about contacts, tasks, or Google Chat
- User asks to create/edit Google Docs, Sheets, or Slides
- Any Google Workspace operation

## Authentication

- **Account:** `ops@claw-sync.com`
- **Client:** `sam-assistant`
- **Keyring:** file-based (`~/.config/gogcli/config.json`)
- **Auth:** OAuth (credentials at `~/.config/gogcli/credentials-sam-assistant.json`)

No additional auth setup needed — gog is pre-configured.

## Commands

```
gog send [flags]              # Send email
gog ls [flags]                # List (emails, files, events, etc.)
gog search <query>            # Search across services
gog open <target>             # Open in browser
gog download <fileId>         # Download from Drive
gog upload <localPath>        # Upload to Drive

gog gmail <command>           # Gmail operations (aliases: mail, email)
gog calendar <command>        # Calendar (alias: cal)
gog drive <command>           # Drive (alias: drv)
gog docs <command>            # Google Docs (alias: doc)
gog sheets <command>          # Google Sheets (alias: sheet)
gog slides <command>          # Google Slides (alias: slide)
gog contacts <command>        # Contacts (alias: contact)
gog tasks <command>           # Tasks (alias: task)
gog chat <command>            # Google Chat
gog keep <command>            # Google Keep
gog forms <command>           # Google Forms (alias: form)
gog people <command>          # People API (alias: person)
gog groups <command>          # Groups (alias: group)
gog appscript <command>       # Apps Script (alias: script)
gog admin <command>           # Admin operations
```

## Common examples

### Email
```bash
# Send an email
gog send --to "user@example.com" --subject "Hello" --body "Message body"

# List recent emails
gog gmail ls

# Search emails
gog gmail search "from:someone@example.com"

# Read a specific email
gog gmail read <messageId>
```

### Calendar
```bash
# List upcoming events
gog calendar ls

# Create an event
gog calendar create --title "Meeting" --start "2026-03-25T10:00:00" --end "2026-03-25T11:00:00"
```

### Drive
```bash
# List files
gog drive ls

# Upload a file
gog upload ./file.pdf

# Download a file
gog download <fileId>
```

### Contacts
```bash
# List contacts
gog contacts ls

# Search contacts
gog contacts search "name"
```

## Flags (global)

| Flag | Description |
|------|-------------|
| `-a, --account` | Account email (default: ops@claw-sync.com) |
| `-j, --json` | JSON output (best for scripting) |
| `-p, --plain` | TSV output (parseable, no colors) |
| `--results-only` | In JSON mode, emit only primary result |
| `--select` | Select specific fields in JSON output |

## Tips

- Use `-j` (JSON) when you need to parse output programmatically
- Use `-p` (plain) for simple text output
- Use `gog <command> --help` for detailed sub-command help
- The account `ops@claw-sync.com` is the default — no need to specify `-a` unless using a different account
