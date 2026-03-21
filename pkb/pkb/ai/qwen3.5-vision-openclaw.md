# Qwen3.5 Vision with OpenClaw + llama-server

**Created:** 2026-03-20  
**Tags:** #ai #llama-server #qwen3.5 #vision #openclaw #troubleshooting #multimodal

---

## Quick Summary

**Problem:** Qwen3.5 vision requests fail with "Ollama API stream ended without a final response"

**Cause:** llama-server's `/api/chat` returns OpenAI SSE format, but OpenClaw's `api: "ollama"` expects native Ollama NDJSON.

**Fix:** Use `"api": "openai-completions"` in OpenClaw config.

---

## Technical Details

### llama-server API Format

llama.cpp server's `/api/chat` endpoint (with `--jinja` flag) returns **OpenAI-compatible SSE**:

```
data: {"choices":[{"finish_reason":"stop","index":0,"delta":{"content":"hello"}}],"created":123456,"id":"chatcmpl-xxx","model":"qwen3.5:latest","object":"chat.completion.chunk","timings":{"prompt_per_second":136,"predicted_per_second":121}}
data: [DONE]
```

Key points:
- `delta.content` (not `message.content`)
- `finish_reason` (not `done`)
- `data: [DONE]` (not `{"done":true}`)

### OpenClaw Provider Expectations

**Native Ollama** (`api: "ollama"`):
```json
{
  "message": {"content": "hello"},
  "done": true
}
```

**OpenAI Completions** (`api: "openai-completions"`):
```json
{
  "choices": [{"delta": {"content": "hello"}}],
  "done": true
}
```

OpenClaw's Ollama stream parser looks for `chunk.done === true` and `chunk.message.content`. When llama-server sends OpenAI format, neither exists → `finalResponse` stays undefined → error.

---

## Configuration

### llama-server.service (olla host)

```ini
[Service]
ExecStart=/opt/llama.cpp/build/bin/llama-server \
  -m /opt/models/gguf/qwen3.5:latest.gguf \
  --mmproj /opt/models/gguf/mmproj-Qwen_Qwen3.5-35B-A3B-bf16.gguf \
  --host 0.0.0.0 --port 11434 \
  --ctx-size 262144 \
  -np 1 -fa on -b 128 -ub 32 \
  --cache-type-k q4_0 --cache-type-v q4_0 \
  --jinja \
  --chat-template chatml
```

Critical flags:
- `--mmproj`: Multimodal projector (required for vision)
- `--jinja`: Enables Jinja templating + OpenAI-compatible output format

### OpenClaw Config (`~/.openclaw/openclaw.json`)

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "olla": {
        "baseUrl": "http://olla:11434/v1",
        "apiKey": "local",
        "api": "openai-completions",  ← MUST BE THIS
        "models": [
          {
            "id": "qwen3.5:latest",
            "name": "qwen3.5:latest (Custom Provider)",
            "reasoning": false,
            "input": ["text", "image"],
            "contextWindow": 262144,
            "maxTokens": 8192,
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
          }
        ]
      }
    }
  }
}
```

Key fields:
- `baseUrl: http://olla:11434/v1` — OpenAI-compatible endpoint
- `api: openai-completions` — **critical**, not `ollama`

---

## Performance Benchmarks

**First vision request (17:46:45 UTC):**
- Prompt tokens: 5,390 (includes image encoding)
- Prompt eval time: 6,719 ms (1.25 ms/token, 802 tokens/sec)
- Generated tokens: 118
- Generation time: 1,125 ms (9.53 ms/token, 104 tokens/sec)
- Total: 7,844 ms for 5,508 tokens

**Key takeaway:** Image processing adds ~5,000 prompt tokens. Generation speed unchanged (~100 tokens/sec).

---

## Why This Happened

1. llama-server default: OpenAI format (SSE with `choices[]`)
2. OpenClaw config: `api: "ollama"` expecting NDJSON (`message.content`)
3. Stream parser: never found `chunk.done` → error

**The server was working fine** — logs showed HTTP 200, full token generation. OpenClaw just spoke the wrong dialect.

---

## Related Resources

- [llama.cpp documentation](https://github.com/ggerganov/llama.cpp)
- [OpenClaw plugin SDK](https://github.com/openclaw/openclaw)
- [Qwen3.5 GGUF models](https://huggingface.co/models?search=qwen3.5)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)

---

## See Also

- `PAYBOOK-QWEN3-5-VISION.md` — troubleshooting playbook
- `MEMORY.md` — incident history
- `llama-server.service` — server configuration
