# Playbook: llama-server Qwen3.5 Chat Template Parse Failure

**Created:** 2026-03-19  
**Category:** Incident Resolution  
**Priority:** P2  
**Affected Host:** olla (llama-server)

## Symptom

```
Failed to parse input at pos N:
```

Error occurs on every `/v1/chat/completions` request. The position number varies (150, 233, 280, 304, 560, 1189, 28719, etc.). The `/v1/completions` endpoint works fine.

## Root Cause

llama-server's built-in Jinja template parser (C++ implementation) cannot handle the complex Qwen3.5 chat template embedded in the GGUF file. The template uses advanced Jinja2 features:

- `namespace()` objects
- Nested macros with `render_content()`
- Complex conditionals for tool calling, vision, and reasoning
- `raise_exception()` calls

The C++ Jinja parser silently fails at various character positions depending on the input message content.

## Diagnosis

```bash
# Test chat endpoint (will fail)
curl -s http://olla:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.5:latest.gguf","messages":[{"role":"user","content":"hi"}],"max_tokens":20,"stream":false}'

# Test completions endpoint (will work — confirms model is fine)
curl -s http://olla:11434/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.5:latest.gguf","prompt":"<|im_start|>user\nhi<|im_end|>\n<|im_start|>assistant\n","max_tokens":20,"stream":false}'
```

If completions works but chat doesn't → chat template parser issue.

## Fix

Add `--chat-template chatml` to the llama-server ExecStart line. Qwen3.5 uses ChatML format natively, so this is functionally equivalent.

```bash
# Edit service file
sudo sed -i 's|--jinja -np|--jinja --chat-template chatml -np|' /etc/systemd/system/llama-server.service

# Apply
sudo systemctl daemon-reload
sudo systemctl restart llama-server

# Wait ~3-5 minutes for model to load (21GB GGUF + 131k ctx KV cache)
sleep 180

# Verify
curl -s http://olla:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.5:latest.gguf","messages":[{"role":"user","content":"Say hello"}],"max_tokens":50,"stream":false}'
```

## Notes

- Model load time is ~3-5 minutes (21GB GGUF offloaded to GPU + 131k context KV cache allocation)
- The built-in `chatml` template includes `<think>` tags in output — OpenClaw handles stripping these
- Alternative fix: update llama.cpp to a version with improved Jinja parser
- Alternative fix: use `--chat-template-file` with a custom Jinja template
- **Do NOT remove `--jinja`** — it's still needed for other template features

## Related

- MEMORY.md: Context Window 65k Hardcoded Limit (2026-03-08)
- MEMORY.md: Context Window Roll-Over Fix (2026-03-01)
- Playbook: `llama-server-failures.md`
