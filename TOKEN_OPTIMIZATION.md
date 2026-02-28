# TOKEN_OPTIMIZATION.md

## Long‑Term Token‑Optimization Policy

1. **Default model** – `olla/gpt-oss:latest` (local Ollama).  This keeps costs low and latency fast for everyday tasks.
2. **When to switch to OpenAI Codex** – Use `openai/openai-codex` **only** for the following scenarios:
   - **Architecture decisions** – large-scale design discussions requiring the most up‑to‑date reasoning.
   - **Production code review** – deep, security‑critical analysis of live code.
   - **Security analysis** – detailed vulnerability scanning and compliance checks.
   - **Complex debugging / reasoning** – problems that require high‑quality chain‑of‑thought explanations.
   - **Strategic multi‑project decisions** – cross‑project planning, cost‑benefit analyses, or long‑term road‑mapping.

These rules are hard‑coded in the `openclaw.json` defaults section so that every model switch is intentional and auditable.
