import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { EncryptionService } from '../services/encryption.js';
import { notify } from '../services/notification.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const providerSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['VLLM', 'OLLAMA', 'LLAMACPP', 'OPENAI', 'ANTHROPIC', 'OPENCLAW', 'HERMES', 'CUSTOM']),
  baseUrl: z.string().min(1).max(500).refine(
    (val) => {
      // Accept bare hostnames (localhost, 192.168.x.x) or full URLs
      if (val.startsWith('http://') || val.startsWith('https://')) {
        try { new URL(val); return true; } catch { return false; }
      }
      // Bare hostname or IP
      return /^[a-zA-Z0-9._-]+$/.test(val);
    },
    { message: 'Must be a valid hostname, IP, or URL' }
  ),
  port: z.number().int().positive().optional(),
  apiKey: z.string().optional(),
  model: z.string().min(1),
  config: z.record(z.any()).optional(),
});

const connectProviderSchema = z.object({
  apiKey: z.string().optional(),
  testConnection: z.boolean().default(true),
});

/**
 * GET /api/providers
 * List all providers.
 */
router.get('/', authenticate, auditLog('LIST_PROVIDERS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        _count: {
          select: { models: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedProviders = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? '[ENCRYPTED]' : null,
    }));

    res.json({ providers: sanitizedProviders });
  } catch (error) {
    console.error('List providers error:', error);
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

/**
 * POST /api/providers
 * Create a new provider.
 */
router.post('/', authenticate, auditLog('CREATE_PROVIDER'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = providerSchema.parse(req.body);

    // Check for duplicate name+type combination
    const existing = await prisma.provider.findUnique({
      where: {
        name_type: {
          name: body.name,
          type: body.type,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Provider with this name and type already exists' });
    }

    // Normalize baseUrl: strip protocol and trailing slashes, keep just host
    let normalizedBaseUrl = body.baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

    // Encrypt API key if provided
    let encryptedApiKey: string | null = null;
    let keyVersion = 1;

    if (body.apiKey) {
      const encrypted = await EncryptionService.encrypt(body.apiKey, 1);
      encryptedApiKey = JSON.stringify(encrypted);
      keyVersion = encrypted.keyVersion;
    }

    const provider = await prisma.provider.create({
      data: {
        ...body,
        baseUrl: normalizedBaseUrl,
        apiKey: encryptedApiKey,
        apiKeyVersion: keyVersion,
        status: 'DISCONNECTED',
      },
      include: {
        _count: {
          select: { models: true },
        },
      },
    });

    res.status(201).json({
      message: 'Provider created successfully',
      provider: {
        ...provider,
        apiKey: '[ENCRYPTED]',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create provider error:', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

/**
 * POST /api/providers/:id/connect
 * Connect to a provider (test connection and update status).
 */
router.post('/:id/connect', authenticate, auditLog('CONNECT_PROVIDER'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;
    const body = connectProviderSchema.parse(req.body);

    const provider = await prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Update status to TESTING
    await prisma.provider.update({
      where: { id },
      data: { status: 'TESTING' },
    });

    // Decrypt API key if needed
    let apiKey: string | undefined;
    if (body.apiKey) {
      apiKey = body.apiKey;
    } else if (provider.apiKey) {
      try {
        const encrypted = JSON.parse(provider.apiKey) as any;
        apiKey = await EncryptionService.decrypt(encrypted);
      } catch (decryptError) {
        console.error('Failed to decrypt API key:', decryptError);
      }
    }

    // Test connection based on provider type
    const testResult = await testProviderConnection(provider, apiKey);

    const status = testResult.success ? 'CONNECTED' : 'ERROR';
    const latencyMs = testResult.latencyMs;

    // Update provider status
    await prisma.provider.update({
      where: { id },
      data: {
        status,
        lastChecked: new Date(),
        latencyMs: status === 'CONNECTED' ? latencyMs : null,
      },
    });

    // Send real-time notification
    notify.providerStatus(id, status, latencyMs);

    res.json({
      success: testResult.success,
      status,
      latencyMs,
      message: testResult.message,
      models: testResult.models || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Connect provider error:', error);

    await prisma.provider.update({
      where: { id: req.params.id as string },
      data: { status: 'ERROR' },
    }).catch(() => {});

    res.status(500).json({ error: 'Failed to connect to provider' });
  }
});

/**
 * POST /api/providers/:id/disconnect
 * Disconnect from a provider.
 */
router.post('/:id/disconnect', authenticate, auditLog('DISCONNECT_PROVIDER'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    await prisma.provider.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
        lastChecked: new Date(),
        latencyMs: null,
      },
    });

    res.json({ message: 'Provider disconnected successfully' });
  } catch (error) {
    console.error('Disconnect provider error:', error);
    res.status(500).json({ error: 'Failed to disconnect provider' });
  }
});

/**
 * POST /api/providers/:id/discover
 * Discover models from a connected provider API.
 * Returns raw model data without auto-registering.
 */
router.post('/:id/discover', authenticate, auditLog('DISCOVER_PROVIDER_MODELS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const provider = await prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (provider.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Provider must be connected to discover models' });
    }

    const discoveredModels = await fetchProviderModelsForDiscovery(provider);

    res.json({
      message: `Discovered ${discoveredModels.length} models from ${provider.name}`,
      models: discoveredModels,
    });
  } catch (error: any) {
    console.error('Discover models error:', error.message);
    res.status(500).json({
      error: 'Failed to discover models',
      details: error.message,
    });
  }
});

/**
 * POST /api/providers/:id/discover-all
 * Discover models from provider API AND auto-register all found models as ProviderModel entries.
 * Uses source='DISCOVERED' for all auto-discovered models.
 * Extracts quantization, size, and parameter count from provider response.
 */
router.post('/:id/discover-all', authenticate, auditLog('DISCOVER_AND_REGISTER_MODELS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const provider = await prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (provider.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Provider must be connected to discover models' });
    }

    // Fetch models from provider API
    const discoveredModels = await fetchProviderModelsForDiscovery(provider);

    // Auto-register all discovered models
    const registeredModels = [];

    for (const modelData of discoveredModels) {
      // Skip if model already exists
      const existing = await prisma.providerModel.findFirst({
        where: {
          providerId: id,
          name: modelData.name,
        },
      });

      if (!existing) {
        const model = await prisma.providerModel.create({
          data: {
            providerId: id,
            name: modelData.name,
            displayName: modelData.displayName || modelData.name,
            parameters: modelData.parameters,
            sizeGB: modelData.sizeGB,
            quantization: modelData.quantization,
            source: 'DISCOVERED',
            status: 'AVAILABLE',
          },
        });
        registeredModels.push(model);
      }
    }

    res.json({
      message: `Discovered ${discoveredModels.length} models, registered ${registeredModels.length} new models`,
      discovered: discoveredModels.length,
      registered: registeredModels.length,
      models: registeredModels,
    });
  } catch (error: any) {
    console.error('Discover and register models error:', error.message);
    res.status(500).json({
      error: 'Failed to discover and register models',
      details: error.message,
    });
  }
});

/**
 * GET /api/providers/:id/models
 * List all models registered to a specific provider.
 * MUST come before the wildcard `/:id` route below.
 */
router.get('/:id/models', authenticate, auditLog('LIST_PROVIDER_MODELS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const provider = await prisma.provider.findUnique({ where: { id } });
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const models = await prisma.providerModel.findMany({
      where: { providerId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ models });
  } catch (error) {
    console.error('List provider models error:', error);
    res.status(500).json({ error: 'Failed to list provider models' });
  }
});

/**
 * GET /api/providers/:id
 * Get a single provider by ID.
 */
router.get('/:id', authenticate, auditLog('GET_PROVIDER'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        models: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const sanitizedProvider = {
      ...provider,
      apiKey: provider.apiKey ? '[ENCRYPTED]' : null,
    };

    res.json({ provider: sanitizedProvider });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Failed to get provider' });
  }
});

/**
 * PUT /api/providers/:id
 * Update a provider.
 */
router.put('/:id', authenticate, auditLog('UPDATE_PROVIDER'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;
    const body = providerSchema.partial().parse(req.body);

    const provider = await prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Handle API key encryption if provided
    let updateData: any = { ...body };

    if (body.apiKey !== undefined) {
      if (body.apiKey) {
        const encrypted = await EncryptionService.encrypt(body.apiKey, 1);
        updateData.apiKey = JSON.stringify(encrypted);
        updateData.apiKeyVersion = encrypted.keyVersion;
      } else {
        updateData.apiKey = null;
      }
    }

    const updatedProvider = await prisma.provider.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Provider updated successfully',
      provider: {
        ...updatedProvider,
        apiKey: '[ENCRYPTED]',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update provider error:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

/**
 * DELETE /api/providers/:id
 * Delete a provider.
 */
router.delete('/:id', authenticate, auditLog('DELETE_PROVIDER'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    await prisma.provider.delete({
      where: { id },
    });

    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

/**
 * Test connection to a provider based on type.
 */
async function testProviderConnection(
  provider: any,
  apiKey?: string
): Promise<{ success: boolean; latencyMs: number; message: string; models?: string[] }> {
  const startTime = Date.now();

  try {
    const baseUrl = provider.baseUrl.replace(/^https?:\/\//, '');
    const url = new URL(`http://${baseUrl}`);
    if (provider.port) {
      url.port = provider.port.toString();
    }

    let testUrl = url.toString();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (provider.type) {
      case 'VLLM':
      case 'OLLAMA':
      case 'LLAMACPP':
        testUrl = `${url.protocol}//${url.hostname}:${provider.port || 80}/v1/models`;
        break;
      case 'OPENAI':
        testUrl = 'https://api.openai.com/v1/models';
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'ANTHROPIC':
        testUrl = 'https://api.anthropic.com/v1/messages';
        if (apiKey) headers['X-API-Key'] = apiKey;
        break;
      case 'OPENCLAW':
        testUrl = `${url.protocol}//${url.hostname}:${provider.port || 3000}/health`;
        break;
      case 'HERMES':
        testUrl = `${url.protocol}//${url.hostname}:${provider.port || 3000}/api/health`;
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      default:
        testUrl = `${url.protocol}//${url.hostname}:${provider.port || 80}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(testUrl, {
      method: provider.type === 'ANTHROPIC' ? 'POST' : 'GET',
      headers,
      signal: controller.signal,
      body: provider.type === 'ANTHROPIC' ? JSON.stringify({ role: 'user', content: 'test' }) : undefined,
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      let models: string[] = [];

      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = await response.json() as any;
          if (data.data && Array.isArray(data.data)) {
            models = data.data.map((m: any) => m.id || m.name).filter(Boolean);
          } else if (Array.isArray(data)) {
            models = data.map((m: any) => m.id || m.name).filter(Boolean);
          }
        } catch { /* ignore */ }
      }

      return {
        success: true,
        latencyMs,
        message: `Connection successful (${latencyMs}ms)`,
        models,
      };
    } else {
      return {
        success: false,
        latencyMs,
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: error.name === 'AbortError' ? 'Connection timeout (10s)' : error.message || 'Connection failed',
    };
  }
}

/**
 * Fetch models from a provider's API for discovery.
 * Handles vLLM/Ollama/llama.cpp (OpenAI-compatible /v1/models), Ollama (/api/tags),
 * OpenAI (api.openai.com), and custom providers.
 */
async function fetchProviderModelsForDiscovery(provider: any): Promise<Array<{
  name: string;
  displayName?: string;
  parameters?: string;
  sizeGB?: number;
  quantization?: string;
}>> {
  try {
    const baseUrl = provider.baseUrl.replace(/^https?:\/\//, '');
    const url = new URL(`http://${baseUrl}`);
    if (provider.port) {
      url.port = provider.port.toString();
    }

    let testUrl = `${url.protocol}//${url.hostname}:${url.port}/v1/models`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Decrypt API key if needed
    let apiKey: string | undefined;
    if (provider.apiKey) {
      try {
        const encrypted = JSON.parse(provider.apiKey);
        apiKey = await EncryptionService.decrypt(encrypted);
      } catch { /* ignore */ }
    }

    if (provider.type === 'OPENAI' && apiKey) {
      testUrl = 'https://api.openai.com/v1/models';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Ollama uses /api/tags instead of /v1/models
    if (provider.type === 'OLLAMA') {
      testUrl = `${url.protocol}//${url.hostname}:${url.port}/api/tags`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as any;

    // Parse Ollama response
    if (provider.type === 'OLLAMA' && data.models) {
      return data.models.map((m: any) => ({
        name: m.name,
        displayName: m.name,
        parameters: m.details?.parameter_size || undefined,
        sizeGB: Math.round((m.size / (1024 * 1024 * 1024)) * 100) / 100,
        quantization: m.details?.quantization_level || undefined,
      }));
    }

    // Parse vLLM/OpenAI-compatible response
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => {
        const modelId = m.id || m.name || 'unknown';
        return {
          name: modelId,
          displayName: modelId,
          parameters: extractParametersFromModelName(modelId),
          sizeGB: estimateSizeFromModelName(modelId),
          quantization: extractQuantizationFromModelName(modelId),
        };
      });
    }

    return [];
  } catch (error: any) {
    console.error('Fetch provider models error:', error.message);
    throw error;
  }
}

/**
 * Extract parameter count from model name.
 */
function extractParametersFromModelName(modelName: string): string | undefined {
  const match = modelName.match(/(\d+(?:\.\d+)?)(b|m)/i);
  if (match) {
    const value = match[1];
    const unit = match[2].toLowerCase();
    return unit === 'b' ? `${value}B` : `${value}M`;
  }
  return undefined;
}

/**
 * Extract quantization type from model name (e.g., Q4_K_M, Q8_0).
 */
function extractQuantizationFromModelName(modelName: string): string | undefined {
  const match = modelName.match(/(Q[0-9]+_[A-Z_]+)/i);
  if (match) {
    return match[1];
  }
  return undefined;
}

/**
 * Estimate model size in GB based on parameters and quantization.
 */
function estimateSizeFromModelName(modelName: string): number | undefined {
  const paramMatch = modelName.match(/(\d+(?:\.\d+)?)(b)/i);
  if (paramMatch) {
    const params = parseFloat(paramMatch[1]);
    // Rough estimate: 1B params ≈ 2GB for FP16, varies by quantization
    return Math.round(params * 2 * 10) / 10;
  }
  return undefined;
}

export default router;
