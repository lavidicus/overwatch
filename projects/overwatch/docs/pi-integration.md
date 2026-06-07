# Pi AI Integration Guide for Overwatch

## Architecture

**Hybrid Execution Model:**
- Existing Overwatch provider configs remain the source of truth
- Pi AI executes requests in the background when enabled
- Falls back to native providers if Pi fails
- Zero UI changes required

## Enabling Pi

### Option 1: Per-Provider Config
```json
{
  "id": "...",
  "name": "My Provider",
  "type": "OPENAI",
  "config": {
    "engine": "pi"
  }
}
```

### Option 2: Environment Variable
```bash
OVERWATCH_AI_ENGINE=pi
```

### Option 3: Auto Mode (Default)
Pi is used automatically for supported providers when available.

## Using Pi Catalog Models

Pi provides access to 60+ providers. Use catalog model format `provider/model`:

**Popular Models:**
- `openai/gpt-4o-mini` - Fast, cheap OpenAI model
- `openai/gpt-4o` - Flagship OpenAI model
- `anthropic/claude-opus-4-6` - Top-tier Anthropic
- `anthropic/claude-sonnet-4` - Fast Anthropic
- `groq/llama-3.3-70b-versatile` - Ultra-fast Llama on Groq
- `openrouter/anthropic/claude-sonnet-4.5` - Via OpenRouter

**OAuth Providers (require setup):**
- `github-copilot/gpt-4o` - GitHub Copilot subscription
- `openai-codex/*` - ChatGPT Plus/Pro subscription
- `vertex-ai/*` - Google Vertex AI

## Benefits

- **60+ providers** vs current ~5
- **OAuth support** for premium subscriptions
- **Cost tracking** built into responses
- **Better tool calling** with validation
- **Cross-provider handoffs** mid-conversation

## Logging

Pi execution is logged for monitoring:
```
[Provider] Using Pi engine for My Provider (OPENAI)
[Pi] Using catalog model: openai/gpt-4o-mini
[Pi] Complete - tokens: 1250, tools: 0
```

## Fallback Behavior

If Pi fails or is incompatible:
1. Error is logged
2. Request can be retried with native provider
3. No data loss - configs preserved

## Migration Path

**Phase 1 (Current):** Pi available as optional engine
**Phase 2:** Enable Pi for all supported providers
**Phase 3:** Import additional Pi catalog models into UI

## OAuth Setup

For ChatGPT Plus, Copilot, Vertex AI:
```bash
npx pi-ai auth login --provider github-copilot
```

Tokens stored securely and refreshed automatically.
