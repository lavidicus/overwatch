# ITIL Playbook: rclaw Self-Hosted OpenClaw Setup

---
**Author:** Sam (ops butler AI)  
**Created:** 2026-03-21  
**Last Updated:** 2026-03-21  
**Version:** 1.0  
**Tags:** [rclaw, macos, self-hosted, llama.cpp, openclaw, matrix, local-ai]  
---

## Overview

Complete self-hosted OpenClaw setup on rclaw (Mac mini). Includes llama.cpp service configuration, Matrix integration, and user-friendly control scripts.

## Target Host

- **Hostname:** rclaw
- **OS:** macOS (Apple Silicon)
- **OpenClaw Path:** `/Users/rclaw/.openclaw`
- **Model Path:** `/opt/models/gguf/qwen3.5:latest`

## Requirements

- Homebrew installed (provides node/npm)
- Root access for service management
- Matrix server: `https://comms.9xc.io`
- Node.js: Required for Matrix encryption SDK

## Dependencies

**Critical:** Matrix encryption requires `@vector-im/matrix-bot-sdk`

**Install command:**
```bash
cd /opt/homebrew/lib/node_modules/openclaw/extensions/matrix
PATH=/opt/homebrew/bin:$PATH npm install @vector-im/matrix-bot-sdk
```

---

## Installation Steps

### 1. Remove Existing llama.cpp Installation

```bash
# Stop existing service
echo 'Demo1234' | sudo -S kill -9 $(pgrep llama-server)

# Remove old launchd plist files
echo 'Demo1234' | sudo -S rm -f \
  /Library/LaunchDaemons/local.llama-server.plist \
  /Library/LaunchDaemons/ai.llama.server.plist \
  /Library/LaunchAgents/llama-server.plist
```

### 2. Reinstall/Upgrade llama.cpp

```bash
/opt/homebrew/bin/brew upgrade llama.cpp
# Current version: 8420 (stable)
```

### 3. Create LLM Symlink

```bash
# Create symlink for consistent model reference
echo 'Demo1234' | sudo -S ln -sf \
  /opt/models/gguf/Qwen3.5-35B-IQ2_M.gguf \
  /opt/models/gguf/qwen3.5:latest
```

**Result:** `/opt/models/gguf/qwen3.5:latest` → `Qwen3.5-35B-IQ2_M.gguf`

### 4. Create User LaunchAgent Service

**File:** `/Library/LaunchAgents/user.llama-server.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>user.llama-server</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ProcessType</key>
    <string>Interactive</string>
    <key>StandardOutPath</key>
    <string>/Users/rclaw/.openclaw/logs/llama-server.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/rclaw/.openclaw/logs/llama-server.err</string>
    <key>ProgramArguments</key>
    <array>
      <string>/opt/homebrew/bin/llama-server</string>
      <string>-m</string>
      <string>/opt/models/gguf/qwen3.5:latest</string>
      <string>--host</string>
      <string>0.0.0.0</string>
      <string>--port</string>
      <string>11434</string>
      <string>--ctx-size</string>
      <string>131072</string>
      <string>--cache-type-k</string>
      <string>q4_0</string>
      <string>--cache-type-v</string>
      <string>q4_0</string>
    </array>
  </dict>
</plist>
```

**Install:**
```bash
cp user.llama-server.plist /Library/LaunchAgents/
echo 'Demo1234' | sudo -S cp user.llama-server.plist /Library/LaunchAgents/
```

**Start:**
```bash
launchctl load /Library/LaunchAgents/user.llama-server.plist
```

---

## Control Scripts

### Location: `/Users/rclaw/`

#### Start Script: `llama-server-start.sh`
```bash
#!/bin/bash
launchctl load /Library/LaunchAgents/user.llama-server.plist
echo "llama-server started"
```

#### Stop Script: `llama-server-stop.sh`
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

## Model Configuration

### Current Model
- **Path:** `/opt/models/gguf/qwen3.5:latest`
- **Target File:** `/opt/models/gguf/Qwen3.5-35B-IQ2_M.gguf`
- **Size:** 11.5 GB
- **Quantization:** IQ2_M

### Changing Models

To switch to a different model:

```bash
# Update symlink
echo 'Demo1234' | sudo -S ln -sf /opt/models/gguf/NEW_MODEL.gguf /opt/models/gguf/qwen3.5:latest

# Restart service
/Users/rclaw/llama-server-stop.sh
/Users/rclaw/llama-server-start.sh
```

---

## OpenClaw Configuration

**File:** `/Users/rclaw/.openclaw/openclaw.json`

### Key Changes:

1. **Model reference:**
   ```json
   "id": "qwen3.5:latest",
   "name": "Qwen3.5 (Local Mac Mini)"
   ```

2. **Matrix channel (replaces Signal):**
   ```json
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
   ```

3. **Remove Signal:**
   ```json
   // Remove entire "signal" channel block
   "channels": {
     "matrix": { ... }
     // No "signal" entry
   }
   ```

4. **Matrix plugin enabled:**
   ```json
   "plugins": {
     "entries": {
       "matrix": { "enabled": true }
     }
   }
   ```

---

## Matrix User Setup

### Create User on Matrix Server

**Server:** `comms.9xc.local`  
**SSH:** `ssh localadmin@comms.9xc.io`

```bash
register_new_matrix_user \
  -c /etc/matrix-synapse/homeserver.yaml \
  -u 'rclaw' \
  -p 'Demo1234!' \
  -a
```

**Result:** `@rclaw:comms.9xc.io`  
**Password:** `Demo1234!`

---

## Configuration File Management

### llama.cpp Configurable Settings

Edit `/Library/LaunchAgents/user.llama-server.plist`:

- **Model path:** `<string>-m</string>`
- **Context size:** `<string>--ctx-size</string>`
- **Port:** `<string>--port</string>`
- **Cache types:** `<string>--cache-type-k</string>`, `<string>--cache-type-v</string>`

### OpenClaw Configurable Settings

Edit `/Users/rclaw/.openclaw/openclaw.json`:

- **Model ID:** `"id": "qwen3.5:latest"`
- **Matrix credentials:** `userId`, `password`
- **Allowlist:** `allowFrom` array
- **Tool defaults:** `tools.web.search`, `tools.exec`

---

## Service Status

### Check if Running

```bash
ps aux | grep llama-server | grep -v grep
```

### Check LaunchAgent Status

```bash
launchctl list | grep llama
```

### View Logs

```bash
tail -f /Users/rclaw/.openclaw/logs/llama-server.log
```

---

## Troubleshooting

### Service Won't Start

1. Check plist syntax:
   ```bash
   plutil -lint /Library/LaunchAgents/user.llama-server.plist
   ```

2. Reload service:
   ```bash
   launchctl unload /Library/LaunchAgents/user.llama-server.plist
   launchctl load /Library/LaunchAgents/user.llama-server.plist
   ```

3. Check logs:
   ```bash
   cat /Users/rclaw/.openclaw/logs/llama-server.err
   ```

### Port Already in Use

```bash
# Kill existing process
lsof -i :11434
kill -9 <PID>

# Restart service
/Users/rclaw/llama-server-start.sh
```

### Model Not Found

```bash
# Verify symlink
ls -la /opt/models/gguf/qwen3.5:latest

# Check target exists
ls -la /opt/models/gguf/Qwen3.5-35B-IQ2_M.gguf
```

---

## Related Documentation

- **PKB:** See PKB vault for architecture diagrams and advanced configuration
- **ITIL:** Issue tracking in `/home/localadmin/.openclaw/workspace/ITIL/`
- **Memory:** Session logs in `/home/localadmin/.openclaw/workspace/memory/`

---

**Setup Complete:** 2026-03-21 03:14 UTC
