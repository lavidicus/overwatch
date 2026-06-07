import { PrismaClient } from '@prisma/client';
import { ProviderConfig, ProviderClient, ProviderClientConstructor } from './types.js';
import { OpenAICompatibleProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';
import { PiProviderClient } from './pi.js';

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
 * 
 * Hybrid execution:
 * - If provider.config?.engine === 'pi', uses PiProviderClient
 * - Otherwise uses native provider client
 * - Falls back to native if Pi fails
 */

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
    select: { type: true, baseUrl: true, port: true, model: true, apiKey: true, config: true, name: true },
  });

  if (!provider) throw new Error(`Provider ${providerId} not found`);

  const baseUrl = normalizeProviderBaseUrl(provider.baseUrl, provider.port, provider.type);
  
  // Check if Pi execution is enabled for this provider
  const engineMode = (provider.config as any)?.engine || process.env.OVERWATCH_AI_ENGINE || 'native';
  const usePi = engineMode === 'pi' || (engineMode === 'auto' && canUsePi(provider.type));
  
  if (usePi) {
    console.log(`[Provider] Using Pi engine for ${provider.name} (${provider.type})`);
    const config: ProviderConfig = {
      baseUrl,
      model: provider.model || undefined,
      extraHeaders: provider.config as Record<string, string> | undefined,
    };
    if (provider.apiKey) {
      const apiKey = provider.apiKey.trim();
      if (!apiKey.startsWith('{') && !apiKey.startsWith('ENC[')) {
        config.apiKey = provider.apiKey;
      }
    }
    return new PiProviderClient(
      providerId,
      config,
      {
        ...((provider.config as Record<string, any>) ?? {}),
        providerType: provider.type,
        providerName: provider.name,
      },
    );
  }
  
  // Use native provider client
  const Ctor = PROVIDER_CLIENTS[provider.type];
  if (!Ctor) throw new Error(`Unsupported provider type: ${provider.type}`);

  const config: ProviderConfig = {
    baseUrl,
    model: provider.model || undefined,
    extraHeaders: provider.config as Record<string, string> | undefined,
  };

  // Don't cache decrypted keys in memory. Encrypted JSON stays in the DB and
  // BaseProviderClient decrypts it on demand.
  if (provider.apiKey) {
    const apiKey = provider.apiKey.trim();
    if (!apiKey.startsWith('{') && !apiKey.startsWith('ENC[')) {
      config.apiKey = provider.apiKey; // Already plaintext (unusual)
    }
  }

  console.log(`[Provider] Using native engine for ${provider.name} (${provider.type})`);
  return new Ctor(providerId, config);
}

/**
 * Check if a provider type can use Pi execution
 */
function canUsePi(providerType: string): boolean {
  const piSupported = ['VLLM', 'LLAMACPP', 'OPENAI', 'CUSTOM', 'OLLAMA', 'ANTHROPIC'];
  return piSupported.includes(providerType.toUpperCase());
}

function normalizeProviderBaseUrl(baseUrl: string, port: number | null, type: string): string {
  const rawBaseUrl = baseUrl.trim();
  const hasProtocol = /^https?:\/\//i.test(rawBaseUrl);
  const host = rawBaseUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const protocol = hasProtocol
    ? undefined
    : type === 'OLLAMA' && host.toLowerCase() === 'ollama.com'
      ? 'https'
      : 'http';

  const url = new URL(protocol ? `${protocol}://${host}` : rawBaseUrl);
  if (port) url.port = port.toString();

  return url.toString().replace(/\/$/, '');
}
