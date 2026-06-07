import { BaseProviderClient } from './base.js';
import { ProviderConfig, ChatMessage, ChatCompletionRequest, ChatCompletionResult, ChatCompletionChunk } from './types.js';

export class AnthropicProvider extends BaseProviderClient {
  readonly providerType = 'anthropic';

  constructor(providerId: string, config: ProviderConfig) {
    super(providerId, config);
    this.timeoutMs = 120_000;
  }

  private buildBody(req: ChatCompletionRequest): Record<string, unknown> {
    let systemPrompt: string | undefined;
    const messages = req.messages.map(m => {
      if (m.role === 'system') {
        systemPrompt = m.content;
        return null;
      }
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
    }).filter(Boolean) as { role: string; content: string }[];

    const body: Record<string, unknown> = {
      model: req.model,
      messages,
      max_tokens: req.maxTokens || 4096,
    };

    if (systemPrompt) body.system = systemPrompt;
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    return body;
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const apiKey = await this.getApiKey();
    const url = `${this.config.baseUrl}/v1/messages`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey ?? '',
        'anthropic-version': '2023-06-01',
        ...this.config.extraHeaders,
      },
      body: JSON.stringify(this.buildBody(req)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const contentBlocks = data.content as {
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }[] | undefined;
    const usage = (data.usage || {}) as Record<string, unknown>;
    const toolCalls = (contentBlocks ?? [])
      .filter((c) => c.type === 'tool_use' && c.name)
      .map((c) => ({
        id: c.id ?? `tc-${Math.random().toString(36).slice(2, 10)}`,
        name: c.name ?? 'unknown',
        arguments: c.input ?? {},
      }));

    return {
      content: contentBlocks?.find(c => c.type === 'text')?.text || '',
      model: req.model,
      promptTokens: usage.input_tokens as number | undefined,
      completionTokens: usage.output_tokens as number | undefined,
      totalTokens: ((usage.input_tokens as number) + (usage.output_tokens as number)) || undefined,
      finishReason: data.stop_reason as string | undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      raw: data,
    };
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const apiKey = await this.getApiKey();
    const url = `${this.config.baseUrl}/v1/messages`;

    const body = this.buildBody({ ...req, stream: true });
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey ?? '',
        'anthropic-version': '2023-06-01',
        ...this.config.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic error ${response.status}: ${errorText}`);
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

          // Parse SSE lines: "event: content_block_delta" followed by "data: {...}"
          if (trimmed.startsWith('event: ')) {
            const eventType = trimmed.slice(7);
            // Look ahead for data line
            const dataIdx = lines.findIndex((l, i) => i > lines.indexOf(line) && l.includes('data:'));
            if (dataIdx > 0) {
              const dataLine = lines[dataIdx];
              const data = dataLine.replace('data: ', '');
              try {
                const parsed = JSON.parse(data) as Record<string, unknown>;
                if (eventType === 'content_block_delta') {
                  const delta = parsed.delta as Record<string, unknown> | undefined;
                  if (delta?.type === 'input_json_delta' && delta?.partial_json) {
                    yield { delta: delta.partial_json as string };
                  }
                }
                if (eventType === 'message_stop') {
                  yield { delta: '', finishReason: 'stop' };
                }
              } catch { /* skip */ }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const apiKey = await this.getApiKey();
    const url = `${this.config.baseUrl}/v1/messages`;
    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
          stream: false,
        }),
      });

      return {
        ok: response.ok,
        latencyMs: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, latencyMs: Date.now() - start, error: message };
    }
  }
}
