# OpenClaw Gateway Failures

## Overview

Playbook for diagnosing and recovering OpenClaw gateway daemon issues, including unavailability after restarts, tool call failures, and connection issues.

---

## 1) Gateway Status Check

### Basic Status

```bash
# Check gateway status
openclaw gateway status

# Check if process is running
ps aux | grep openclaw

# Check listening ports
ss -tlnp | grep 18789
netstat -tlnp | grep 18789
```

### Session Status

```bash
# Check session queue
openclaw status

# View session information
openclaw sessions list
```

---

## 2) Common Failure Scenarios

### Scenario A: Gateway Not Running

```bash
# Start gateway
openclaw gateway start

# If that fails, check for errors
journalctl -u openclaw-gateway --since "10 minutes ago"

# Check for port conflicts
lsof -i :18789
netstat -tlnp | grep 18789

# Kill conflicting process
sudo kill -9 <PID>
openclaw gateway start
```

### Scenario B: Gateway Running But Unresponsive

```bash
# Test gateway connectivity
curl -s http://localhost:18789/health

# Check gateway logs
tail -f ~/.openclaw/logs/gateway.log

# Restart gateway (graceful)
openclaw gateway restart

# Force restart if needed
openclaw gateway stop
sleep 2
openclaw gateway start
```

### Scenario C: Tool Calls Failing

**Symptom:** "missing tool result in session history; inserted synthetic error result"

**Root Cause:** Session not auto-reconnecting after gateway restart

**Resolution:**

```bash
# Full gateway restart (most reliable)
openclaw gateway stop
sleep 2
openclaw gateway start

# Verify gateway is up
openclaw gateway status

# Check session health
openclaw status
```

---

## 3) Context Window Issues

### Check Context Usage

```bash
# View session status with token usage
openclaw status

# Check context size configuration
cat ~/.openclaw/openclaw.json | jq '.contextSize'
```

### Context Overflow Recovery

**Symptoms:**
- "Context overflow" errors
- llama-server rejecting prompts >65536 tokens
- Agent becomes unresponsive

**Resolution:**

```bash
# 1. Check current context usage
openclaw status

# 2. Stop gateway
openclaw gateway stop

# 3. Clear session state (if needed)
rm ~/.openclaw/sessions/*.json  # Be careful!

# 4. Restart gateway
openclaw gateway start

# 5. Verify context cleared
openclaw status
```

### Prevent Context Overflow

**Update Configuration:**

Edit `~/.openclaw/openclaw.json`:

```json
{
  "contextSize": 262144,
  "reserveTokens": 50000
}
```

**Update llama-server:**

Edit `/etc/systemd/system/llama-server.service`:

```ini
ExecStart=/usr/bin/llama-server \
  --ctx-size 262144 \
  ...
```

```bash
# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart llama-server
openclaw gateway restart
```

---

## 4) Model Provider Issues

### Check Provider Status

```bash
# Test Ollama provider
curl http://localhost:11434/api/tags

# Test specific model
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "qwen2.5:7b", "prompt": "test", "stream": false}'

# Check vLLM provider (if configured)
curl http://localhost:8000/v1/models
```

### Ollama Service Recovery

```bash
# Check Ollama status
systemctl status ollama

# Restart Ollama
sudo systemctl restart ollama

# Check Ollama logs
journalctl -u ollama --since "10 minutes ago"

# Pull model if missing
ollama pull qwen2.5:7b
```

### vLLM Service Recovery

```bash
# Check vLLM status
systemctl status vllm

# Restart vLLM
sudo systemctl restart vllm

# Check vLLM logs
tail -f /var/log/vllm.log
```

---

## 5) Configuration Issues

### Validate Configuration

```bash
# Check OpenClaw configuration
cat ~/.openclaw/openclaw.json | jq .

# Validate JSON syntax
jq . ~/.openclaw/openclaw.json

# Check for syntax errors
python3 -m json.tool ~/.openclaw/openclaw.json
```

### Common Configuration Fixes

**Remove Invalid Provider Config:**

```bash
# Edit configuration
vim ~/.openclaw/openclaw.json

# Remove invalid entries like:
{
  "providers": {
    "vllm": {
      "baseUrl": "invalid-url",
      ...wrong config...
    }
  }
}
```

**Reset to Defaults:**

```bash
# Backup current config
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup

# Generate fresh config
openclaw config init

# Restore custom settings manually
```

---

## 6) Signal/Telegram Channel Issues

### Signal Channel Debugging

```bash
# Check Signal account status
openclaw channels list

# Test Signal messaging
openclaw message send --channel signal --target <number> --message "test"

# Check Signal logs
tail -f ~/.openclaw/logs/signal.log
```

### Telegram Bot Debugging

```bash
# Check bot token
echo $TELEGRAM_BOT_TOKEN

# Test bot API
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Check bot status
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

---

## 7) Log Analysis

### Gateway Logs

```bash
# Recent gateway logs
tail -100 ~/.openclaw/logs/gateway.log

# Search for errors
grep -i error ~/.openclaw/logs/gateway.log | tail -20

# Follow logs in real-time
tail -f ~/.openclaw/logs/gateway.log
```

### Session Logs

```bash
# View session history
openclaw sessions history --session-key <key>

# Export session for analysis
openclaw sessions export --session-key <key>
```

---

## 8) Backup and Recovery

### Backup Configuration

```bash
# Backup OpenClaw configuration
cp -r ~/.openclaw ~/.openclaw.backup.$(date +%Y%m%d)

# Backup memory files
tar czf /backup/openclaw-memory-$(date +%Y%m%d).tar.gz ~/.openclaw/workspace/memory/
```

### Restore from Backup

```bash
# Restore configuration
rm -rf ~/.openclaw
cp -r ~/.openclaw.backup.20260307 ~/.openclaw

# Restart gateway
openclaw gateway restart
```

---

## 9) Prevention & Monitoring

### Health Check Script

```bash
#!/bin/bash
# /usr/local/bin/openclaw-healthcheck.sh

# Check gateway
if ! openclaw gateway status | grep -q "running"; then
    echo "WARNING: OpenClaw gateway not running"
    openclaw gateway start
fi

# Check context usage
CONTEXT=$(openclaw status | grep -oP '\d+(?= tokens)')
if [ "$CONTEXT" -gt 200000 ]; then
    echo "WARNING: Context usage high: $CONTEXT tokens"
fi

# Check provider connectivity
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "WARNING: Ollama provider not responding"
fi
```

### Cron Job for Health Checks

```bash
# Add to crontab
crontab -e

# Run every 5 minutes
*/5 * * * * /usr/local/bin/openclaw-healthcheck.sh >> /var/log/openclaw-healthcheck.log 2>&1
```

---

## Related PKB Guides

- [[pkb/resources/Concepts/System Administration Knowledge Base]]
- [[pkb/areas/System guides/Linux Operating System/]]

---

*Created: 2026-03-07 | Priority: P1 | Category: Incident*
