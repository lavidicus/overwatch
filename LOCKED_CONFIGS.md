# Locked Configurations

**Created:** 2026-03-21  
**Status:** LOCKED - Do not change without explicit approval

---

## Olla (Dedicated Llama-Server Host)

**Host:** `olla.9xc.local` (separate Proxmox node, not rclaw, not ocg)  
**Model:** Qwen3.5-35B  
**Context:** 262k  
**Port:** 11434  
**URL:** `http://olla:11434/v1`

### Config File: `~/.openclaw/openclaw.json` (on gateway/ocg host)

```json
{
  "models": {
    "providers": {
      "olla": {
        "baseUrl": "http://olla:11434/v1",
        "apiKey": "local",
        "api": "ollama",
        "models": [{
          "id": "qwen3.5:latest",
          "name": "qwen3.5:latest (Custom Provider)",
          "reasoning": false,
          "input": ["text", "image"],
          "contextWindow": 262144,
          "maxTokens": 8192
        }]
      }
    }
  }
}
```

---

## Gateway (ocg host)

**Host:** `ocg` (Linux Proxmox LXC container)  
**Model:** OpenClaw agent (points to Olla)  
**Context:** 256k (client-side)  
**Port:** 18789 (gateway control UI)

### Config File: `/home/localadmin/.openclaw/openclaw.json`

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "olla/qwen3.5:latest",
        "fallbacks": [
          "github-copilot/gpt-5-mini",
          "github-copilot/claude-opus-4.6",
          "github-copilot/gpt-5.2-codex"
        ]
      },
      "compaction": {
        "mode": "safeguard",
        "reserveTokens": 40000
      }
    }
  }
}
```

---

## RCLAW (Mac Mini)

**Host:** `rclaw` (Mac Mini M4, macOS 15.5)  
**Model:** Qwen3.5-9B-Local  
**Context:** 131k (OPUS corrected)  
**Port:** 11434 (local)  
**URL:** `http://127.0.0.1:11434`

### Config File: `/Users/rclaw/.openclaw/openclaw.json`

```json
{
  "models": {
    "providers": {
      "rclaw": {
        "baseUrl": "http://127.0.0.1:11434",
        "apiKey": "local",
        "api": "ollama",
        "models": [{
          "id": "Qwen3.5-9B-Q4_K_M.gguf",
          "name": "Qwen3.5 9B Q4_K_M (Local)",
          "reasoning": true,
          "input": ["text"],
          "contextWindow": 131072,
          "maxTokens": 16384
        }]
      }
    }
  }
}
```

---

## Key Differences

| Setting | Olla | Gateway (ocg) | RCLAW |
|---------|------|---------------|-------|
| **Host** | oll.9xc.local | ocg | rclaw (Mac) |
| **Type** | Llama-server | OpenClaw agent | OpenClaw agent |
| **Model** | Qwen3.5-35B | Points to Olla | Qwen3.5-9B |
| **Context** | 262k | 256k | 131k |
| **Max Tokens** | 8192 | 16384 | 16384 |
| **Input** | text + image | text | text only |
| **API** | ollama | ollama | ollama |

---

## Why Confusion Happened

1. **Three separate hosts:** Olla (Proxmox), ocg (gateway LXC), RCLAW (Mac)
2. **Same port:** Olla and RCLAW both run llama-server on 11434
3. **Different models:** Olla = 35B, RCLAW = 9B
4. **Config copy-paste errors:** Olla's 262k got copied to RCLAW (should be 131k)
5. **Wrong API mode:** RCLAW had `openai-completions` instead of `ollama`

---

## Locked Settings

### Olla (do not change)
- ✅ `contextWindow: 262144`
- ✅ `maxTokens: 8192`
- ✅ `baseUrl: http://olla:11434/v1`
- ✅ `input: [text, image]`
- ✅ `api: ollama`

### Gateway /ocg/ (do not change)
- ✅ `reserveTokens: 40000`
- ✅ `primary: olla/qwen3.5:latest`
- ✅ Fallbacks: mini, opus, codex
- ✅ `api: ollama`

### RCLAW (do not change)
- ✅ `contextWindow: 131072`
- ✅ `maxTokens: 16384`
- ✅ `baseUrl: http://127.0.0.1:11434`
- ✅ `input: [text]`
- ✅ `api: ollama`

---

**Never mix these configs again.**
