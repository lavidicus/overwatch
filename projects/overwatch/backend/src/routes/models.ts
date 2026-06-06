import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { EncryptionService } from '../services/encryption.js';
import { inspectGGUFFile } from '../utils/gguf-inspector.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const modelSchema = z.object({
  providerId: z.string().uuid(),
  name: z.string().min(1).max(200),
  displayName: z.string().optional(),
  quantization: z.string().optional(),
  sizeGB: z.number().positive().optional(),
  parameters: z.string().optional(),
  source: z.enum(['HUGGINGFACE', 'LOCAL', 'MANUAL', 'DISCOVERED']).optional().default('MANUAL'),
  downloadPath: z.string().optional(),
  systemId: z.string().uuid().optional(),
  visionModelId: z.string().uuid().optional(),
});

// NOTE: Express matches routes top-to-bottom. Specific paths must come BEFORE
// wildcard paths like /:id, or they'll never be reached.

/**
 * GET /api/models
 * List all models with optional filters
 */
router.get('/', authenticate, auditLog('LIST_MODELS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { providerId, status, source, systemId } = req.query as Record<string, string | undefined>;

    const where: any = {};

    if (providerId && typeof providerId === 'string') {
      where.providerId = providerId;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (source && typeof source === 'string') {
      where.source = source;
    }

    if (systemId && typeof systemId === 'string') {
      where.systemId = systemId;
    }

    const models = await prisma.providerModel.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          },
        },
        system: {
          select: {
            id: true,
            name: true,
            hostname: true,
          },
        },
        visionModel: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        companionModels: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ models });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

/**
 * GET /api/models/inspect
 * Read GGUF binary header to extract model metadata without loading model.
 * MUST come before /:id wildcard.
 */
router.get('/inspect', authenticate, auditLog('INSPECT_GGUF_MODEL'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { path: filePath, systemId } = req.query as { path: string; systemId?: string };

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    let sshCredentials: any = undefined;

    if (systemId) {
      const system = await prisma.remoteSystem.findUnique({
        where: { id: systemId },
      });

      if (!system) {
        return res.status(404).json({ error: 'System not found' });
      }

      // Decrypt credentials if SSH
      if (system.protocol === 'SSH') {
        let sshKey: string | undefined;
        let password: string | undefined;

        if (system.encryptedKey) {
          const encrypted = JSON.parse(system.encryptedKey);
          sshKey = await EncryptionService.decrypt(encrypted);
        }

        if (system.encryptedPassword) {
          const encrypted = JSON.parse(system.encryptedPassword);
          password = await EncryptionService.decrypt(encrypted);
        }

        sshCredentials = {
          hostname: system.hostname,
          port: system.port,
          username: system.username,
          sshKey,
          password,
        };
      }
    }

    const metadata = await inspectGGUFFile(filePath, sshCredentials);

    // Build a response format matching the frontend's expected shape
    // hasMmproj is independent of isVisionModel — a text model can have a vision projection companion
    const hasMmproj = !!(metadata.mmprojFiles && metadata.mmprojFiles.length > 0);
    const isVisionModel = metadata.isVisionModel || hasMmproj;

    res.json({
      path: filePath,
      systemId,
      metadata: {
        ...metadata,
        isVisionModel,
        hasMmproj,
        filePath,
        sizeStr: `${metadata.sizeGB} GB`,
      },
    });
  } catch (error: any) {
    console.error('Inspect GGUF error:', error.message);
    res.status(500).json({
      error: 'Failed to inspect GGUF file',
      details: error.message,
    });
  }
});

/**
 * GET /api/models/providers/:providerId/models
 * List all models for a specific provider.
 */
router.get('/providers/:providerId/models', authenticate, auditLog('LIST_PROVIDER_MODELS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { providerId } = req.params as Record<string, string>;

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const models = await prisma.providerModel.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ models });
  } catch (error) {
    console.error('List provider models error:', error);
    res.status(500).json({ error: 'Failed to list provider models' });
  }
});

/**
 * GET /api/models/:id
 * Get a single model by ID.
 */
router.get('/:id', authenticate, auditLog('GET_MODEL'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const model = await prisma.providerModel.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ model });
  } catch (error) {
    console.error('Get model error:', error);
    res.status(500).json({ error: 'Failed to get model' });
  }
});

/**
 * POST /api/models
 * Create a new model.
 */
router.post('/', authenticate, auditLog('CREATE_MODEL'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = modelSchema.parse(req.body);

    // Verify provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: body.providerId },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Check for duplicate model name on this provider
    const existing = await prisma.providerModel.findFirst({
      where: {
        providerId: body.providerId,
        name: body.name,
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Model with this name already exists on this provider' });
    }

    // If visionModelId provided, verify it exists on the same provider
    if (body.visionModelId) {
      const visionModel = await prisma.providerModel.findUnique({
        where: { id: body.visionModelId },
      });

      if (!visionModel) {
        return res.status(404).json({ error: 'Vision model not found' });
      }

      // Vision model must belong to the same provider
      if (visionModel.providerId !== body.providerId) {
        return res.status(400).json({ error: 'Vision model must belong to the same provider' });
      }
    }

    const model = await prisma.providerModel.create({
      data: {
        ...body,
        status: 'AVAILABLE',
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Model created successfully',
      model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create model error:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

/**
 * PUT /api/models/:id
 * Update a model.
 */
router.put('/:id', authenticate, auditLog('UPDATE_MODEL'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;
    const body = modelSchema.partial().parse(req.body);

    const model = await prisma.providerModel.findUnique({
      where: { id },
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // If changing providerId, verify new provider exists
    if (body.providerId) {
      const provider = await prisma.provider.findUnique({
        where: { id: body.providerId },
      });

      if (!provider) {
        return res.status(404).json({ error: 'Provider not found' });
      }
    }

    // If visionModelId provided, verify it exists and is on the same provider
    if (body.visionModelId) {
      const visionModel = await prisma.providerModel.findUnique({
        where: { id: body.visionModelId },
      });

      if (!visionModel) {
        return res.status(404).json({ error: 'Vision model not found' });
      }

      const targetProviderId = body.providerId || model.providerId;
      if (visionModel.providerId !== targetProviderId) {
        return res.status(400).json({ error: 'Vision model must belong to the same provider' });
      }
    }

    // If clearing visionModelId
    if (body.visionModelId === null || body.visionModelId === '') {
      body.visionModelId = undefined;
    }

    const updatedModel = await prisma.providerModel.update({
      where: { id },
      data: body,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.json({
      message: 'Model updated successfully',
      model: updatedModel,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update model error:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

/**
 * DELETE /api/models/:id
 * Delete a model.
 */
router.delete('/:id', authenticate, auditLog('DELETE_MODEL'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    await prisma.providerModel.delete({
      where: { id },
    });

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

/**
 * POST /api/models/hf-download
 * Queue a HuggingFace model download to a specific system and path.
 */
router.post('/hf-download', authenticate, auditLog('QUEUE_HF_DOWNLOAD'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { repoId, systemId, targetPath = '/opt/models/gguf' } = z.object({
      repoId: z.string().min(1),
      systemId: z.string().uuid(),
      targetPath: z.string().optional().default('/opt/models/gguf'),
    }).parse(req.body);

    const system = await prisma.remoteSystem.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Create HFDownload record
    const download = await prisma.hFDownload.create({
      data: {
        systemId,
        modelId: repoId,
        fileName: repoId.split('/').pop() || 'model.gguf',
        status: 'QUEUED',
        progress: 0,
      },
    });

    res.json({
      message: `Download queued for ${repoId} to ${targetPath}`,
      downloadId: download.id,
      status: 'QUEUED',
      targetPath,
      note: 'Download job queued — requires BullMQ worker implementation',
    });
  } catch (error: any) {
    console.error('HF download queue error:', error.message);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({
      error: 'Failed to queue download',
      details: error.message,
    });
  }
});

/**
 * POST /api/models/register-from-inspection
 * Register a model after GGUF inspection — convenience endpoint.
 * Takes inspected metadata and creates a ProviderModel record.
 */
router.post('/register-from-inspection', authenticate, auditLog('REGISTER_INSPECTED_MODEL'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = z.object({
      providerId: z.string().uuid(),
      name: z.string().min(1).max(200),
      displayName: z.string().optional(),
      quantization: z.string().optional(),
      sizeGB: z.number().positive().optional(),
      parameters: z.string().optional(),
      downloadPath: z.string().min(1),
      systemId: z.string().uuid(),
      architecture: z.string().optional(),
      fileType: z.string().optional(),
      tensorCount: z.number().int().nonnegative().optional(),
      kvCount: z.number().int().nonnegative().optional(),
      isVisionModel: z.boolean().optional(),
      visionModelId: z.string().uuid().optional().nullable(),
    }).parse(req.body);

    // Verify provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: body.providerId },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // If visionModelId provided, verify it exists on the same provider
    if (body.visionModelId) {
      const visionModel = await prisma.providerModel.findUnique({
        where: { id: body.visionModelId },
      });

      if (!visionModel) {
        return res.status(404).json({ error: 'Vision model not found' });
      }

      if (visionModel.providerId !== body.providerId) {
        return res.status(400).json({ error: 'Vision model must belong to the same provider' });
      }
    }

    const model = await prisma.providerModel.create({
      data: {
        providerId: body.providerId,
        name: body.name,
        displayName: body.displayName || body.name,
        quantization: body.quantization,
        sizeGB: body.sizeGB,
        parameters: body.parameters,
        source: 'LOCAL',
        downloadPath: body.downloadPath,
        systemId: body.systemId,
        visionModelId: body.visionModelId || null,
        status: 'AVAILABLE',
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Model registered from inspection',
      model,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Register from inspection error:', error.message);
    res.status(500).json({ error: 'Failed to register model' });
  }
});

export default router;
