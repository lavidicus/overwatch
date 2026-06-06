import { PrismaClient } from '@prisma/client';
import { ProviderConfig, ProviderClient, ProviderClientConstructor } from './types.js';
import { OpenAICompatibleProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';

const prisma = new PrismaClient();

const PROVIDER_CLIENTS: Record<string, ProviderClientConstructor> = {
  VLLM: OpenAICompatibleProvider,
  LLAMACPP: OpenAICompatibleProvider,
  OPENAI: OpenAICompatibleProvider,
  CUSTOM: OpenAICompatibleProvider,
  ANTHROPIC: AnthropicProvider,
  OLLAMA: OllamaProvider,
};

const clientCache = new Map<string, ProviderClient>();

/**
 * Get or create a provider client instance. Cached per-provider.
 */
export async function getProviderClient(providerId: string): Promise<ProviderClient> {
  const cached = clientCache.get(providerId);
  if (cached) return cached;

  const client = await createProviderClient(providerId);
  clientCache.set(providerId, client);
  return client;
}

/**
 * Clear cached client (call when provider config changes)
 */
export function invalidateClient(providerId: string): void {
  clientCache.delete(providerId);
}

export function listSupportedTypes(): string[] {
  return Object.keys(PROVIDER_CLIENTS);
}

async function createProviderClient(providerId: string): Promise<ProviderClient> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { type: true, baseUrl: true, port: true, model: true, apiKey: true, config: true },
  });

  if (!provider) throw new Error(`Provider ${providerId} not found`);

  const Ctor = PROVIDER_CLIENTS[provider.type];
  if (!Ctor) throw new Error(`Unsupported provider type: ${provider.type}`);

  const baseUrl = provider.baseUrl.replace(/^https?:\/\//, '');
  const config: ProviderConfig = {
    baseUrl: `http://${baseUrl}${provider.port ? `:${provider.port}` : ''}`,
    model: provider.model || undefined,
    extraHeaders: provider.config as Record<string, string> | undefined,
  };

  // Don't cache decrypted key in memory — client fetches from DB each time (encrypted in DB)
  if (provider.apiKey && !provider.apiKey.startsWith('ENC[')) {
    config.apiKey = provider.apiKey; // Already plaintext (unusual)
  }

  return new Ctor(providerId, config);
}
