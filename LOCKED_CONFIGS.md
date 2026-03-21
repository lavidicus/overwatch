# Locked Configurations

**Created:** 2026-03-21  
**Status:** LOCKED - Do not change without explicit approval

---

## Olla (Gateway - OCG)

**Host:** `10.0.2.100`  
**Model:** Qwen3.5-35B  
**Context:** 262k  
**Port:** 11434  
**URL:** `http://olla:11434/v1`

### Config File: `/home/localadmin/.openclaw/openclaw.json`

```json
{
  "models": {
    "providers": {
      "olla": {
        "baseUrl": "http://olla:11434/v1",
        "apiKey": "local",
        "api": "openai-completions",
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

## RCLAW (Mac Mini)

**Host:** `10.0.2.100`  
**Model:** Qwen3.5-35B (different instance)  
**Context:** 131k (OPUS corrected)  
**Port:** 11434  
**URL:** `http://127.0.0.1:11434` (local to rclaw)

### Config File: `/Users/rclaw/.openclaw/openclaw.json`

```json
{
  "models": {
    "providers": {
      "olla": {
        "baseUrl": "http://127.0.0.1:11434",
        "apiKey": "local",
        "api": "openai-completions",
        "models": [{
          "id": "qwen3.5:latest",
          "name": "Qwen3.5 (Local Mac Mini)",
          "reasoning": false,
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

| Setting | Olla (Gateway) | RCLAW (Mac) |
|---------|----------------|-------------|
| **URL** | `http://olla:11434/v1` | `http://127.0.0.1:11434` |
| **Context** | 262k | 131k |
| **Max Tokens** | 8192 | 16384 |
| **Input** | text + image | text only |
| **Model ID** | `qwen3.5:latest` | `qwen3.5:latest` |
| **Gateway Host** | `localhost` | `gateway` |

---

## Why Confusion Happened

1. **Same port, different instances:** Both run on port 11434 but separate hosts
2. **Different context limits:** Gateway = 262k, RCLAW = 131k
3. **Config copy-paste error:** I copied gateway's 262k to rclaw
4. **OPUS fixed it:** Corrected rclaw to 131k

---

## Locked Settings

### Gateway (OCG)
- ✅ `contextWindow: 262144`
- ✅ `maxTokens: 8192`
- ✅ `baseUrl: http://olla:11434/v1`
- ✅ `input: [text, image]`

### RCLAW
- ✅ `contextWindow: 131072`
- ✅ `maxTokens: 16384`
- ✅ `baseUrl: http://127.0.0.1:11434`
- ✅ `input: [text]`

---

**Never mix these configs again.**
