import { ProviderClient, ProviderConfig, ChatCompletionRequest, ChatCompletionResult, ChatCompletionChunk } from './types.js';
import { EncryptionService } from '../encryption.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BaseProviderClient implements ProviderClient {
  readonly providerId: string;
  readonly providerType: string;
  protected config: ProviderConfig;
  protected timeoutMs: number = 60_000;

  constructor(providerId: string, config: ProviderConfig) {
    this.providerId = providerId;
    this.providerType = config.extraHeaders?.['X-Provider-Type'] || 'generic';
    this.config = config;
  }

  /**
   * Decrypt the API key for this provider from the database.
   * Returns undefined for providers without keys (local vLLM/Ollama/llama.cpp).
   */
  protected async getApiKey(): Promise<string | undefined> {
    if (this.config.apiKey) return this.config.apiKey;

    const provider = await prisma.provider.findUnique({
      where: { id: this.providerId },
      select: { apiKey: true },
    });

    if (!provider?.apiKey) {
      return undefined; // Local provider, no key needed
    }

    // apiKey is stored as JSON string of EncryptedField
    const encryptedField = JSON.parse(provider.apiKey) as any;
    return EncryptionService.decrypt(encryptedField);
  }

  /**
   * Fetch with timeout and optional retry on 429
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 2
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (response.status === 429 && retries > 0) {
        clearTimeout(timeout);
        const retryMs = Math.min(1000 * (3 - retries) * 2, 10000);
        await new Promise(r => setTimeout(r, retryMs));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async chatCompletion(_req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    throw new Error('Not implemented');
  }

  async *chatCompletionStream(_req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    throw new Error('Not implemented');
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    throw new Error('Not implemented');
  }
}
