# Context Window & LLM Service Status (2026-03-31)

## OpenClaw Config
- **Provider:** ollamacpp (olla/llamacpp)
- **Context Window:** 266,144 tokens ✅
- **Reserve Tokens:** 40,000 (compaction at ~216k) ✅
- **Alias:** llamacpp

## llama-server.service (Olla Server)
- **Configured:** --ctx-size 262144 (262k) ✅
- **Binary Status:** ❌ MISSING
- **Service Path:** `/opt/llama.cpp/build/bin/llama-server`
- **Actual Location:** `/opt/` directory doesn't exist
- **Root Cause:** llama.cpp repo never cloned/built or was moved/deleted
- **Current State:** Service failing (exit code 203 = EXEC not found)

## vLLM (Active Alternative)
- **Status:** ✅ Running
- **Model:** Qwen3.5-9B AWQ-4bit
- **Context:** 65,536 tokens (vs 262k target for llama.cpp)
- **Endpoint:** `http://172.16.254.100:8000`
- **VRAM Usage:** ~21.6 GB (out of 24 GB)

## Decision Points
- **Rebuild llama.cpp:** Run `upgrade-llamacpp.sh` to clone/build from source
  - Pros: 262k context, vision support, llama.cpp ecosystem
  - Cons: ~15-30 min build time, requires CUDA/toolchain
- **Stick with vLLM:** Already working, faster startup
  - Pros: Operational now, simpler setup
  - Cons: 65k context (vs 262k), less flexible

**Recommendation:** Use vLLM until llama.cpp rebuild is needed for long-context workloads.

**Date:** 2026-03-31 02:08 UTC
