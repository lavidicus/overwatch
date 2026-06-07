/**
 * Pi AI Provider Adapter (Simplified)
 * 
 * Provides access to Pi AI's 60+ provider catalog while preserving
 * existing Overwatch provider configurations.
 * 
 * Usage:
 * - Set provider.config.engine = 'pi' to enable Pi execution
 * - Use catalog model names like 'openai/gpt-4o-mini', 'anthropic/claude-opus-4-6'
 * - Falls back to native client if Pi fails
 */

import {
  getModel,
  getProviders,
  complete as piComplete,
  stream as piStream,
} from '@earendil-works/pi-ai';
import type { AssistantMessage, Model } from '@earendil-works/pi-ai';
import { BaseProviderClient } from './base.js';
import type {
  ChatMessage,
  ChatCompletionResult,
  ChatCompletionChunk,
  ToolDefinition,
  ToolCallRequest,
  ProviderConfig,
} from './types.js';

export class PiProviderClient extends BaseProviderClient {
  private piConfig?: Record<string, any>;
  private readonly knownPiProviders = new Set<string>(getProviders() as string[]);

  constructor(providerId: string, config: ProviderConfig, providerConfig?: Record<string, any>) {
    super(providerId, config);
    this.piConfig = providerConfig;
  }

  private resolveModel(modelName: string): Model<any> {
    const slashIndex = modelName.indexOf('/');
    if (slashIndex > 0) {
      const provider = modelName.slice(0, slashIndex);
      const model = modelName.slice(slashIndex + 1);

      if (this.knownPiProviders.has(provider)) {
        try {
          console.log(`[Pi] Using catalog model: ${modelName}`);
          return getModel(provider as any, model as any);
        } catch {
          // Some local model ids contain slashes (for example Qwen/Qwen3...).
          // If Pi does not know the provider/model pair, route it as a custom endpoint.
        }
      }
    }

    const baseUrl = this.getOpenAICompatibleBaseUrl();
    const provider = String(
      this.piConfig?.provider
      ?? this.piConfig?.providerType
      ?? 'custom'
    ).toLowerCase();
    const contextWindow = Number(this.piConfig?.contextWindow ?? 128000);
    const maxTokens = Number(this.piConfig?.maxTokens ?? this.piConfig?.maxOutputTokens ?? 32768);

    console.log(`[Pi] Using custom OpenAI-compatible model: ${modelName} @ ${baseUrl}`);

    return {
      id: modelName,
      name: modelName,
      api: 'openai-completions',
      provider,
      baseUrl,
      reasoning: Boolean(this.piConfig?.reasoning ?? false),
      input: this.piConfig?.input ?? ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow,
      maxTokens,
      headers: this.getConfiguredHeaders(),
      thinkingLevelMap: this.piConfig?.thinkingLevelMap,
      compat: {
        supportsDeveloperRole: false,
        supportsReasoningEffort: false,
        supportsStrictMode: false,
        supportsStore: false,
        supportsUsageInStreaming: false,
        maxTokensField: 'max_tokens',
        ...this.piConfig?.compat,
      },
    } satisfies Model<'openai-completions'>;
  }

  private getOpenAICompatibleBaseUrl(): string {
    const configured = this.piConfig?.piBaseUrl
      ?? this.piConfig?.openaiBaseUrl
      ?? this.piConfig?.openAIBaseUrl
      ?? this.config.baseUrl;
    const baseUrl = String(configured).replace(/\/$/, '');
    return baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
  }

  private getConfiguredHeaders(): Record<string, string> | undefined {
    const headers = this.piConfig?.headers ?? this.piConfig?.extraHeaders;
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return undefined;

    return Object.fromEntries(
      Object.entries(headers)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
  }

  private async getPiOptions(req: {
    temperature?: number;
    maxTokens?: number;
  }, model?: Model<any>): Promise<Record<string, unknown>> {
    const apiKey = await this.getApiKey();
    const isCustomOpenAIEndpoint = model?.api === 'openai-completions'
      && model.baseUrl === this.getOpenAICompatibleBaseUrl();

    return {
      ...(apiKey ? { apiKey } : isCustomOpenAIEndpoint ? { apiKey: 'dummy' } : {}),
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      headers: this.getConfiguredHeaders(),
      timeoutMs: Number(this.piConfig?.timeoutMs ?? 120000),
    };
  }

  private buildContext(req: {
    messages: ChatMessage[];
    tools?: ToolDefinition[];
  }): Record<string, unknown> {
    const systemPrompt = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    const messages = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const tools = req.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    return {
      systemPrompt: systemPrompt || undefined,
      messages: messages as any[],
      tools: tools as any[],
    };
  }

  private extractText(result: any): string {
    if (typeof result === 'string') return result;
    if (typeof result?.content === 'string') return result.content;
    if (Array.isArray(result?.content)) {
      return result.content
        .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
        .map((block: any) => block.text)
        .join('');
    }
    return '';
  }

  private extractToolCalls(result: any): ToolCallRequest[] {
    const rawToolCalls = Array.isArray(result?.toolCalls)
      ? result.toolCalls
      : Array.isArray(result?.content)
        ? result.content.filter((block: any) => block?.type === 'toolCall')
        : [];

    return rawToolCalls.map((tc: any) => {
      let args: Record<string, unknown> = {};
      try {
        const rawArgs = tc.function?.arguments ?? tc.arguments ?? {};
        args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
      } catch {
        args = { _rawArguments: tc.function?.arguments ?? tc.arguments };
      }

      return {
        id: tc.id ?? `tc-${Math.random().toString(36).slice(2, 10)}`,
        name: tc.function?.name ?? tc.name ?? 'unknown',
        arguments: args,
      };
    });
  }

  private getUsage(result: any): AssistantMessage['usage'] {
    return result?.usage ?? {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
    };
  }

  async chatCompletion(req: {
    model: string;
    messages: ChatMessage[];
    providerId: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    systemPrompt?: string;
    tools?: ToolDefinition[];
  }): Promise<ChatCompletionResult> {
    try {
      const piModel = this.resolveModel(req.model);

      const result: any = await piComplete(piModel, {
        ...this.buildContext(req),
      } as any, await this.getPiOptions(req, piModel));

      // Extract result data safely
      const content = this.extractText(result);
      const usage = this.getUsage(result);
      const toolCalls = this.extractToolCalls(result);

      console.log(
        `[Pi] Complete - tokens: ${usage.totalTokens || 0}, tools: ${toolCalls.length}`
      );

      return {
        content,
        model: req.model,
        promptTokens: usage.input || 0,
        completionTokens: usage.output || 0,
        totalTokens: usage.totalTokens || 0,
        finishReason: toolCalls.length > 0 ? 'tool_calls' : result?.stopReason,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        raw: result,
      };
    } catch (err) {
      console.error('[Pi] Completion failed:', err);
      throw err;
    }
  }

  async *chatCompletionStream(req: {
    model: string;
    messages: ChatMessage[];
    providerId: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    systemPrompt?: string;
    tools?: ToolDefinition[];
  }): AsyncIterable<ChatCompletionChunk> {
    try {
      const piModel = this.resolveModel(req.model);

      for await (const event of piStream(piModel, {
        ...this.buildContext(req),
      } as any, await this.getPiOptions(req, piModel) as any)) {
        if (event.type === 'text_delta') {
          yield {
            delta: event.delta || '',
          };
        } else if (event.type === 'done') {
          yield {
            delta: '',
            finishReason: event.reason === 'length' ? 'length' : 'stop',
          };
        }
      }

      console.log('[Pi] Stream complete');
    } catch (err) {
      console.error('[Pi] Stream failed:', err);
      throw err;
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const piModel = this.resolveModel(this.config.model || 'openai/gpt-4o-mini');
      await piComplete(piModel, {
        messages: [{ role: 'user' as const, content: 'Hi' }],
      } as any, await this.getPiOptions({ maxTokens: 1 }, piModel));

      return {
        ok: true,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
