# OpenClaw Email Configuration

**Email Address:** Jeremy.ingalls@gmail.com  
**Configuration Date:** 2026-04-05 21:49 UTC

---

## Email Setup Instructions

### Option 1: Using gog-bridge (Recommended)
If you have the Google Workspace CLI configured:

```bash
# Test email sending
gog send --to "Jeremy.ingalls@gmail.com" \
  --subject "Test Invoice - INV-2026-04-001" \
  --body "This is a test invoice from OpenClaw."
```

### Option 2: Using SMTP Configuration
Add to `openclaw.json`:

```json
{
  "channels": {
    "email": {
      "type": "email",
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "user": "your_email@gmail.com",
        "password": "your_app_password",
        "from": "your_email@gmail.com"
      },
      "targets": ["Jeremy.ingalls@gmail.com"]
    }
  }
}
```

### Option 3: Using Gmail API
If you have Gmail API credentials configured:

```json
{
  "channels": {
    "email": {
      "type": "gmail",
      "api": {
        "serviceAccountFile": "~/.openclaw/credentials/gmail-service-account.json"
      }
    }
  }
}
```

---

## Current Status

- ✅ Invoice PDF generated: `INV-2026-04-001.pdf`
- ✅ Markdown backup: `INV-2026-04-001.md`
- ⏳ Email channel: Needs configuration
- 📧 Matrix channel: Working (invoice sent here)

---

## Next Steps

1. Choose email method (SMTP, Gmail API, or gog-bridge)
2. Add credentials to workspace
3. Update `openclaw.json` with email config
4. Restart OpenClaw gateway
5. Test email delivery

**Note:** For Gmail, use an app password (not main password) if 2FA is enabled.

---

*Last updated: 2026-04-05 21:49 UTC*
