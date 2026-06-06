# Model Routing Skill

**Purpose:** Determine which model to use based on task type for optimal speed/quality balance.

## Routing Table

| Task Type | Model | Alias | Rationale |
|---|---|---|---|
| Main session (interactive chat) | `pve3090-111/llamacpp` | vm111 | Fastest local (~102 tok/s), low latency |
| Sub-agents — routine tasks | `node1/llamacpp` or `node2/llamacpp` | node1/node2 | Balance GPU load, ~52 tok/s fine for async |
| Sub-agents — complex reasoning | `ollama/qwen3.5:cloud` | cloud | Better for analysis, research, multi-step |
| Code generation / debugging | `ollama/qwen3.5:cloud` | cloud | Cloud models superior at code |
| File ops, system admin, exec | `node1/llamacpp` | node1 | Local is fine, cloud is overkill |
| Creative writing, summarization | `ollama/qwen3.5:cloud` | cloud | Fast, cheap, good quality |
| When local model stalls | `ollama/qwen3.5:cloud` | cloud | Fallback when P6000s busy |

## Decision Rules

1. **Main session stays local** — interactive needs low latency, no network dependency
2. **Sub-agents default to local** — 50/50 node1/node2 for GPU load balancing
3. **Sub-agents use cloud for:** research, code, analysis, multi-step reasoning, creative writing
4. **Fallback:** If local model stalls or takes >30s, retry on cloud

## How to Use

When spawning a sub-agent:

```bash
# Routine task (use local)
sessions_spawn(task="...", model="node1/llamacpp")

# Complex reasoning (use cloud)
sessions_spawn(task="...", model="ollama/qwen3.5:cloud")

# Code work (use cloud)
sessions_spawn(task="...", model="ollama/qwen3.5:cloud")
```

## Model Aliases

- `vm111` = `pve3090-111/llamacpp` (RTX 3090, ~102 tok/s)
- `node1` = `node1/llamacpp` (P6000, ~52 tok/s)
- `node2` = `node2/llamacpp` (P6000, ~52 tok/s)
- `cloud` = `ollama/qwen3.5:cloud` (fast cloud fallback)
- `minimax` = `ollama/minimax-m2.7:cloud` (alternative cloud)
- `5.4` = `openai/gpt-5.4` (via codex-advisor, for complex tasks)
