🎯 **Google Workspace (gog) Setup Instructions**

**For your account: ops@claw-sync.com**

---

### **Step 1: Get OAuth Credentials**

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Click:** "Create Credentials" → "OAuth client ID"
3. **Application type:** Web application
4. **Name:** `OpenClaw Google Workspace`
5. **Authorized redirect URIs:** Add `http://127.0.0.1:8080` (CRITICAL: must be 127.0.0.1, not localhost)
6. **Click:** "Create"
7. **Download:** Click the download icon (💾) to save the JSON file
8. **Save to:** `~/.openclaw/config/google/client_secret.json`

---

### **Step 2: Configure gog CLI**

```bash
# Install gog CLI (if not already installed)
npm install -g gogcli

# Or via Homebrew (macOS):
# brew install steipete/tap/gogcli
```

---

### **Step 3: Set up Authentication**

```bash
# Save credentials
mkdir -p ~/.openclaw/config/google
# (Copy the JSON file from step 1 to the path above)

# Initialize gog
gog auth credentials ~/.openclaw/config/google/client_secret.json

# Add your workspace account
gog auth add ops@claw-sync.com --services gmail,calendar,drive,contacts,docs,sheets

# You'll be prompted to login in browser - use ops@claw-sync.com
```

---

### **Step 4: Verify Setup**

```bash
# List authenticated accounts
gog auth list

# Test Gmail
gog gmail search 'newer_than:1d' --max 5

# Test Calendar
gog calendar events --from today --to tomorrow
```

---

### **Quick Commands to Use:**

**Gmail:**
- `gog gmail send --to recipient@example.com --subject "Hi" --body "Hello"`
- `gog gmail search 'in:inbox newer_than:1d' --max 10`
- `gog gmail send --to recipient@example.com --subject "Re: Hi" --body "Reply" --reply-to-message-id <msgId>`

**Calendar:**
- `gog calendar create --summary "Meeting" --from "2026-03-24T10:00:00Z" --to "2026-03-24T11:00:00Z"`
- `gog calendar events --from today --to tomorrow`

**Drive:**
- `gog drive search "filename:report.pdf"`
- `gog drive upload ./file.pdf`

**Sheets:**
- `gog sheets get "Sheet1!A1:B10"`
- `gog sheets append "Sheet1" --values-json '[["col1","col2"],["val1","val2"]]'`

---

### **What to do next:**

1. ✅ **Follow Step 1** to get credentials
2. ✅ **Run the commands above** to configure
3. ✅ **Test with a simple command** like `gog gmail search`

Need help with any step? Let me know! 🦀
