import { BaseProviderClient } from './base.js';
import { ProviderConfig, ChatMessage, ChatCompletionRequest, ChatCompletionResult, ChatCompletionChunk } from './types.js';

/**
 * OpenAI-compatible provider client.
 * Handles: vLLM, llama.cpp, LM Studio, OpenAI, and any OpenAI-compatible API.
 */
export class OpenAICompatibleProvider extends BaseProviderClient {
  readonly providerType = 'openai_compat';

  constructor(providerId: string, config: ProviderConfig) {
    super(providerId, config);
    this.timeoutMs = 120_000; // Longer timeout for local models
  }

  /**
   * Build the OpenAI-compatible request body
   */
  private buildBody(req: ChatCompletionRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.maxTokens !== undefined) body.max_tokens = req.maxTokens;
    if (req.stream) body.stream = true;

    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      body.tool_choice = 'auto';
    }

    return body;
  }

  /**
   * Non-streaming chat completion
   */
  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const apiKey = await this.getApiKey();
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const body = this.buildBody(req);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        ...this.config.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Provider error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    const choice = (data.choices as any[] | undefined)?.[0];
    const usage = (data.usage || {}) as any;

    const rawToolCalls = (choice?.message?.tool_calls as any[] | undefined) ?? [];
    const toolCalls = rawToolCalls.map((tc: any) => {
      let args: Record<string, unknown> = {};
      try {
        args = typeof tc.function?.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : (tc.function?.arguments ?? {});
      } catch {
        args = { _rawArguments: tc.function?.arguments };
      }
      return {
        id: tc.id ?? `tc-${Math.random().toString(36).slice(2, 10)}`,
        name: tc.function?.name ?? 'unknown',
        arguments: args,
      };
    });

    return {
      content: (choice?.message?.content as string) || '',
      model: data.model as string || req.model,
      promptTokens: usage.prompt_tokens as number | undefined,
      completionTokens: usage.completion_tokens as number | undefined,
      totalTokens: usage.total_tokens as number | undefined,
      finishReason: choice?.finish_reason as string | undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      raw: data,
    };
  }

  /**
   * Streaming chat completion — yields SSE-style chunks
   */
  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const apiKey = await this.getApiKey();
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const body = this.buildBody({ ...req, stream: true });
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        ...this.config.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Provider error ${response.status}: ${errorText}`);
    }

    // Parse SSE stream
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
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { delta: '', finishReason: 'stop' };
            return;
          }

          try {
            const parsed = JSON.parse(data) as any;
            const choice = (parsed.choices as any[] | undefined)?.[0];
            const delta = (choice?.delta || {}) as any;

            if (delta?.content) {
              yield { delta: delta.content };
            }

            if (choice?.finish_reason) {
              yield { delta: '', finishReason: (choice.finish_reason as 'stop' | 'length' | null) || null };
            }
          } catch {
            // Skip unparseable SSE data lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Test connection to provider
   */
  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const url = `${this.config.baseUrl}/v1/models`;
    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        },
      });

      if (!response.ok) {
        return { ok: false, latencyMs: Date.now() - start, error: `HTTP ${response.status}` };
      }

      const data = await response.json() as Record<string, unknown>;
      const models = data.data as { id: string }[] | undefined;

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
