# rclaw Self-Hosted OpenClaw Setup

**Created:** 2026-03-21  
**Tags:** #macos #self-hosted #llama.cpp #openclaw #matrix #local-ai #rclaw

---

## Quick Summary

**Goal:** Complete self-hosted OpenClaw instance on rclaw (Mac mini) with local LLM inference.

**Status:** ✅ COMPLETE

**Key Components:**
- llama.cpp service on port 11434
- Model symlink: `qwen3.5:latest` → `Qwen3.5-35B-IQ2_M.gguf`
- LaunchAgent service (auto-start on login)
- Control scripts in user home directory
- Matrix integration (`@rclaw:comms.9xc.io`)
- Signal removed, Matrix enabled

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     rclaw (Mac Mini)                       │
├─────────────────────────────────────────────────────────────┤
│  /opt/models/gguf/                                         │
│    └── qwen3.5:latest → Qwen3.5-35B-IQ2_M.gguf           │
├─────────────────────────────────────────────────────────────┤
│  /Library/LaunchAgents/                                    │
│    └── user.llama-server.plist                            │
│        └── llama-server --port 11434                       │
├─────────────────────────────────────────────────────────────┤
│  /Users/rclaw/                                             │
│    ├── llama-server-start.sh                               │
│    ├── llama-server-stop.sh                                │
│    └── .openclaw/                                          │
│          └── openclaw.json (Matrix configured)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation Steps

### 1. Remove Old Installation
```bash
# Stop existing service
sudo kill -9 $(pgrep llama-server)

# Remove old launchd files
sudo rm -f /Library/LaunchDaemons/local.llama-server.plist
sudo rm -f /Library/LaunchDaemons/ai.llama.server.plist
sudo rm -f /Library/LaunchAgents/llama-server.plist
```

### 2. Upgrade/Install llama.cpp
```bash
/opt/homebrew/bin/brew upgrade llama.cpp
# Version: 8420 (stable)
```

### 3. Create Model Symlink
```bash
sudo ln -sf /opt/models/gguf/Qwen3.5-35B-IQ2_M.gguf \
  /opt/models/gguf/qwen3.5:latest
```

### 4. Install LaunchAgent
```bash
# Copy plist to LaunchAgents
sudo cp user.llama-server.plist /Library/LaunchAgents/

# Load service
launchctl load /Library/LaunchAgents/user.llama-server.plist
```

### 5. Install Control Scripts
```bash
# Copy scripts to user home
scp scripts/llama-server-*.sh rclaw@rclaw:/Users/rclaw/
chmod +x /Users/rclaw/llama-server-*.sh
```

### 6. Configure OpenClaw
```bash
# Copy updated config
scp rclaw-openclaw.json rclaw@rclaw:/Users/rclaw/.openclaw/openclaw.json
```

### 7. Create Matrix User
```bash
# On comms.9xc.local
register_new_matrix_user \
  -c /etc/matrix-synapse/homeserver.yaml \
  -u 'rclaw' \
  -p 'Demo1234!' \
  -a

# Result: @rclaw:comms.9xc.io
```

---

## Control Scripts

### `/Users/rclaw/llama-server-start.sh`
```bash
#!/bin/bash
launchctl load /Library/LaunchAgents/user.llama-server.plist
echo "llama-server started"
```

### `/Users/rclaw/llama-server-stop.sh`
```bash
#!/bin/bash
launchctl unload /Library/LaunchAgents/user.llama-server.plist
echo "llama-server stopped"
```

**Usage:**
```bash
/Users/rclaw/llama-server-start.sh
/Users/rclaw/llama-server-stop.sh
```

---

## Model Management

### Symlink Structure
```
/opt/models/gguf/qwen3.5:latest → /opt/models/gguf/Qwen3.5-35B-IQ2_M.gguf
```

### Switching Models
```bash
# 1. Update symlink
sudo ln -sf /opt/models/gguf/NEW_MODEL.gguf /opt/models/gguf/qwen3.5:latest

# 2. Restart service
/Users/rclaw/llama-server-stop.sh
/Users/rclaw/llama-server-start.sh
```

### Available Models
```bash
ls -la /opt/models/gguf/
```

---

## OpenClaw Configuration

### Matrix Integration
```json
{
  "channels": {
    "matrix": {
      "enabled": true,
      "homeserver": "https://comms.9xc.io",
      "userId": "@rclaw:comms.9xc.io",
      "password": "Demo1234!",
      "encryption": true,
      "dmPolicy": "allowlist",
      "allowFrom": ["@lavid:comms.9xc.io"]
    }
  }
}
```

### Model Configuration
```json
{
  "models": {
    "providers": {
      "olla": {
        "baseUrl": "http://127.0.0.1:11434",
        "api": "openai-completions",
        "models": [{
          "id": "qwen3.5:latest",
          "contextWindow": 262144,
          "maxTokens": 16384
        }]
      }
    }
  }
}
```

---

## Service Management

### Check Status
```bash
ps aux | grep llama-server | grep -v grep
launchctl list | grep llama
```

### View Logs
```bash
tail -f /Users/rclaw/.openclaw/logs/llama-server.log
```

### Check Port
```bash
lsof -i :11434
```

---

## Troubleshooting

### Service Won't Start
```bash
# Check plist
plutil -lint /Library/LaunchAgents/user.llama-server.plist

# Unload and reload
launchctl unload /Library/LaunchAgents/user.llama-server.plist
launchctl load /Library/LaunchAgents/user.llama-server.plist

# Check logs
cat /Users/rclaw/.openclaw/logs/llama-server.err
```

### Port Conflict
```bash
# Kill existing process
lsof -i :11434
kill -9 <PID>

# Restart
/Users/rclaw/llama-server-start.sh
```

### Model Not Found
```bash
# Verify symlink
ls -la /opt/models/gguf/qwen3.5:latest

# Recreate if needed
sudo ln -sf /opt/models/gguf/Qwen3.5-35B-IQ2_M.gguf \
  /opt/models/gguf/qwen3.5:latest
```

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `/Library/LaunchAgents/user.llama-server.plist` | llama.cpp service definition |
| `/Users/rclaw/llama-server-start.sh` | Start control script |
| `/Users/rclaw/llama-server-stop.sh` | Stop control script |
| `/Users/rclaw/.openclaw/openclaw.json` | OpenClaw config (Matrix) |
| `/opt/models/gguf/qwen3.5:latest` | Model symlink |

---

## Related Documentation

- **Playbook:** `ITIL/playbooks/rclaw-self-hosted-setup.md`
- **Issue:** `ITIL/playbooks/tool-call-timeouts.md`
- **Memory:** `memory/2026-03-21.md`
- **MEMORY.md:** Long-term learnings

---

**Completed:** 2026-03-21 03:14 UTC  
**Next:** Monitor rclaw for 24h, verify Matrix connectivity
