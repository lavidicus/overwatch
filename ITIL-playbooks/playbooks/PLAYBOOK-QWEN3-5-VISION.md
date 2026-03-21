# Qwen3.5 Vision Troubleshooting Playbook

**Created:** 2026-03-20  
**Applies to:** OpenClaw + llama-server + Qwen3.5:latest  
**Issue:** Vision/multimodal image processing failures

---

## Symptom

```
Error: Ollama API stream ended without a final response
```

Model appears to hang or fail when processing images.

---

## Root Cause

llama-server's Ollama-compatible `/api/chat` endpoint returns **OpenAI SSE format**:
```
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

OpenClaw's `api: "ollama"` provider expects **native Ollama NDJSON**:
```json
{"message":{"content":"..."},"done":false}
{"message":{"content":"..."},"done":true}
```

Mismatch causes stream parser to never find `chunk.done === true` → `finalResponse` stays `undefined` → error.

---

## Diagnosis Steps

### 1. Check llama-server logs
```bash
ssh localadmin@olla 'sudo journalctl -u llama-server --since "17:45" --until "17:48" --no-pager'
```

**Successful signs:**
- `srv log_server_r: done request: POST /api/chat 172.16.254.101 200`
- `prompt eval time =` with token count
- `slot print_timing:` with eval metrics

**If logs show 200 but OpenClaw fails** → stream format mismatch.

### 2. Test llama-server directly
```bash
curl -s http://localhost:11434/api/chat -d '{"model":"qwen3.5:latest","messages":[{"role":"user","content":"hi"}],"stream":true}'
```

**Expected output:**
```
data: {"choices":[{"finish_reason":"stop","index":0,"delta":{}}],"created":...,"id":"...","model":"...","object":"chat.completion.chunk","timings":{...}}
data: [DONE]
```

If you see `data: [DONE]` not `{"done":true}` → OpenAI format confirmed.

### 3. Check llama-server.service config
```bash
ssh localadmin@olla 'cat /etc/systemd/system/llama-server.service'
```

**Required:**
```
--mmproj /opt/models/gguf/mmproj-Qwen_Qwen3.5-35B-A3B-bf16.gguf
--jinja
```

Without `--mmproj`, vision is disabled.

---

## Fix

### Option 1: Use OpenAI Provider (Recommended)

Edit `~/.openclaw/openclaw.json`:

```json
"models": {
  "mode": "merge",
  "providers": {
    "olla": {
      "baseUrl": "http://olla:11434/v1",
      "apiKey": "local",
      "api": "openai-completions",  ← CHANGED from "ollama"
      "models": [...]
    }
  }
}
```

**Restart gateway:**
```bash
openclaw gateway stop && sleep 2 && openclaw gateway start
```

### Option 2: Use Native Ollama Provider

Run llama-server with **no `--jinja` flag** and access `/api/chat` (not `/v1`).

Then set:
```json
"baseUrl": "http://olla:11434",  ← no /v1
"api": "ollama"
```

**Not recommended** — llama-server defaults to Jinja+OpenAI format.

---

## Verification

Send an image to the bot. Should:

1. ✅ Receive image successfully
2. ✅ Return response within ~10 seconds
3. ✅ Include generated tokens (check llama-server logs for `slot print_timing:`)

**Example success:**
```
prompt eval time = 6719.41 ms / 5390 tokens (802.15 tokens/sec)
eval time = 1124.60 ms / 118 tokens (104.93 tokens/sec)
```

---

## Prevention

- Always use `"api": "openai-completions"` for llama-server
- Never change from `ollama` → `openai-completions` mid-session
- Document this in team runbooks
- Consider adding validation to OpenClaw config wizard

---

## Related Files

- `llama-server.service` — llama-server config (olla host)
- `~/.openclaw/openclaw.json` — OpenClaw model providers
- `MEMORY.md` — long-term memory entries

---

## History

- **2026-03-20 17:46-18:22:** Qwen3.5 vision failure diagnosed and fixed
- **Root cause:** OpenAI SSE format vs Ollama NDJSON mismatch
- **Fix:** Switched to `openai-completions` provider
- **Status:** ✅ Working
