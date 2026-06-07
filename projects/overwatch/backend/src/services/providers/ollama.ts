import { BaseProviderClient } from './base.js';
import { ProviderConfig, ChatMessage, ChatCompletionRequest, ChatCompletionResult, ChatCompletionChunk } from './types.js';

/**
 * Ollama provider client.
 * Uses /api/chat endpoint with NDJSON streaming.
 */
export class OllamaProvider extends BaseProviderClient {
  readonly providerType = 'ollama';

  constructor(providerId: string, config: ProviderConfig) {
    super(providerId, {
      ...config,
      baseUrl: normalizeOllamaBaseUrl(config.baseUrl),
    });
    this.timeoutMs = 120_000;
  }

  /**
   * Build Ollama request body
   */
  private buildBody(req: ChatCompletionRequest): Record<string, unknown> {
    let systemPrompt: string | undefined;
    const ollamaMessages = req.messages.map(m => {
      if (m.role === 'system') {
        systemPrompt = m.content;
        return null;
      }
      return {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      };
    }).filter(Boolean) as { role: string; content: string }[];

    const body: Record<string, unknown> = {
      model: req.model,
      messages: ollamaMessages,
      stream: req.stream,
    };

    if (systemPrompt) body.system = systemPrompt;
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.maxTokens !== undefined) body.options = { num_predict: req.maxTokens };
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    return body;
  }

  /**
   * Non-streaming chat completion
   */
  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const url = `${this.config.baseUrl}/api/chat`;
    const apiKey = await this.getApiKey();

    const body = this.buildBody(req);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ ...body, stream: false }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    const rawToolCalls = (data.message?.tool_calls as any[] | undefined) ?? [];
    const toolCalls = rawToolCalls.map((tc: any) => {
      let args: Record<string, unknown> = {};
      const rawArgs = tc.function?.arguments ?? tc.function?.args ?? tc.arguments ?? tc.args;
      try {
        args = typeof rawArgs === 'string'
          ? JSON.parse(rawArgs)
          : (rawArgs ?? {});
      } catch {
        args = { _rawArguments: rawArgs };
      }
      return {
        id: tc.id ?? `tc-${Math.random().toString(36).slice(2, 10)}`,
        name: tc.function?.name ?? tc.name ?? 'unknown',
        arguments: args,
      };
    });

    return {
      content: (data.message?.content as string) || '',
      model: data.model as string || req.model,
      promptTokens: (data.prompt_eval_count as number) || undefined,
      completionTokens: (data.eval_count as number) || undefined,
      totalTokens: ((data.prompt_eval_count as number) + (data.eval_count as number)) || undefined,
      finishReason: (data.done_reason === 'length') ? 'length' : 'stop',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      raw: data,
    };
  }

  /**
   * Streaming chat completion — NDJSON (one JSON per line)
   */
  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const url = `${this.config.baseUrl}/api/chat`;
    const apiKey = await this.getApiKey();

    const body = this.buildBody({ ...req, stream: true });
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for streaming');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed) as any;
            const message = parsed.message as { role?: string; content?: string } | undefined;

            if (message && message.content) {
              yield { delta: message.content };
            }

            if (parsed.done === true) {
              yield { delta: '', finishReason: parsed.done_reason === 'length' ? 'length' : 'stop' };
            }
          } catch {
            // Skip unparseable NDJSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Test connection — ping /api/tags
   */
  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const url = `${this.config.baseUrl}/api/tags`;
    const start = Date.now();

    try {
      const apiKey = await this.getApiKey();
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
      });

      if (!response.ok) {
        return { ok: false, latencyMs: Date.now() - start, error: `HTTP ${response.status}` };
      }

      const data = await response.json() as Record<string, unknown>;
      const models = data.models as { name: string }[] | undefined;

      return {
        ok: true,
        latencyMs: Date.now() - start,
        modelCount: models?.length || 0,
      } as any;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, latencyMs: Date.now() - start, error: message };
    }
  }
}

/**
 * Ollama Cloud is hosted at https://ollama.com and uses the same /api/*
 * routes as a local Ollama daemon. Local bare hosts remain HTTP by default.
 */
function normalizeOllamaBaseUrl(baseUrl: string): string {
  const rawBaseUrl = baseUrl.trim();
  const hasProtocol = /^https?:\/\//i.test(rawBaseUrl);
  const host = rawBaseUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const protocol = hasProtocol
    ? undefined
    : host.toLowerCase() === 'ollama.com'
      ? 'https'
      : 'http';

  return new URL(protocol ? `${protocol}://${host}` : rawBaseUrl).toString().replace(/\/$/, '');
}
