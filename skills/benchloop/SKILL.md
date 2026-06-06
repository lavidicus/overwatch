# BenchLoop Skill

Benchmark local LLMs by what actually matters: quality, speed, and reliability.

## Install

BenchLoop CLI is installed system-wide via pipx:

```bash
pipx install benchloop-cli
```

Commands available: `bench-loop`, `benchloop`

## Core Usage

### Run a benchmark
```bash
benchloop run \
  --model "llamacpp.gguf" \
  --endpoint "http://<host>:11434" \
  --provider "openai_compat" \
  --harness "raw" \
  --suites "speed"
```

### Launch dashboard
```bash
benchloop dashboard
```

### List suites/harnesses
```bash
benchloop info
benchloop suites
```

### Export results
```bash
benchloop export
```

## Available Suites

- **speed** (9 tasks) — Tokens/sec throughput
- **coding** (12 tasks) — Code generation quality
- **dataextract** (15 tasks) — Structured data extraction
- **instructfollow** (15 tasks) — Instruction adherence
- **reasonmath** (15 tasks) — Reasoning and math
- **toolcall** (15 tasks) — Function/tool calling
- **agent** (8 tasks) — Agent-like multi-step tasks

## Available Harnesses

`raw`, `hermes`, `pi`, `qwen`

## Our Infrastructure

| Host | Endpoint | GPU | Speed (tok/s) | SSH User |
|------|----------|-----|---------------|----------|
| node1 | http://node1:11434 | 2× P6000 48GB | ~48 | localadmin |
| node2 | http://node2:11434 | 1× P6000 24GB | ~44 | localadmin |
| pve3090-111 | http://pve3090-111:11434 | 2× RTX 3090 48GB | ~64 | user1 |

## Running Multi-Node Benchmarks

For a full comparison across all nodes:

```bash
# Run on all nodes sequentially
for host in node1 node2 pve3090-111; do
  echo "=== Benchmarking $host ==="
  benchloop run \
    --model "llamacpp.gguf" \
    --endpoint "http://${host}:11434" \
    --provider "openai_compat" \
    --harness "raw" \
    --suites "speed,toolcall,coding" 2>&1
  echo ""
done
```

## Viewing Results

Results are saved to `~/.bench-loop/runs/` and auto-published to the BenchLoop leaderboard at https://bench-loop.com/leaderboard

```bash
# View recent runs
ls -lt ~/.bench-loop/runs/

# Launch local dashboard
benchloop dashboard
```

## Notes

- Speed suite gives the clearest hardware comparison (tokens/sec)
- Full suites (coding, reasonmath, toolcall, etc.) require more time and context
- The `raw` harness works with any OpenAI-compatible backend
- Quality scores come from comparing generated text against ground truth
- Reliability measures how many tasks completed without errors
