import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, requireRole, Role } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { EncryptionService } from '../services/encryption.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const settingSchema = z.object({
  key: z.string().max(100),
  value: z.string(),
  category: z.string().optional(),
});

const encryptionKeySchema = z.object({
  source: z.enum(['ENV', 'AWS_KMS', 'GCP_KMS', 'VAULT', 'IMPORTED']),
  importedCert: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /settings
 * List all settings (requires OPERATOR+)
 */
router.get('/', requireRole(Role.OPERATOR, Role.ADMIN), auditLog('LIST_SETTINGS'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    res.json({ settings });
  } catch (error) {
    console.error('List settings error:', error);
    res.status(500).json({ error: 'Failed to list settings' });
  }
});

/**
 * GET /settings/:key
 * Get a specific setting
 */
router.get('/:key', requireRole(Role.OPERATOR, Role.ADMIN), auditLog('GET_SETTING'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { key } = req.params as Record<string, string>;

    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

/**
 * POST /settings
 * Create or update a setting (ADMIN only for encryption keys)
 */
router.post('/', requireRole(Role.OPERATOR, Role.ADMIN), auditLog('UPSERT_SETTING'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = settingSchema.parse(req.body);

    // Check if this is an encryption-related setting (ADMIN only)
    if (body.key.startsWith('encryption.') || body.key.startsWith('security.')) {
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Requires ADMIN role for security settings' });
      }
    }

    const setting = await prisma.setting.upsert({
      where: { key: body.key },
      update: {
        value: body.value,
        category: body.category,
      },
      create: {
        key: body.key,
        value: body.value,
        category: body.category,
      },
    });

    res.json({ setting, message: 'Setting saved successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Upsert setting error:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

/**
 * DELETE /settings/:key
 * Delete a setting (ADMIN only)
 */
router.delete('/:key', requireRole(Role.ADMIN), auditLog('DELETE_SETTING'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { key } = req.params as Record<string, string>;

    // Prevent deletion of critical security settings
    if (key.startsWith('encryption.') || key.startsWith('security.')) {
      return res.status(403).json({ error: 'Cannot delete critical security settings' });
    }

    await prisma.setting.delete({
      where: { key },
    });

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

/**
 * GET /settings/encryption/keys
 * List encryption keys (ADMIN only)
 */
router.get('/encryption/keys', requireRole(Role.ADMIN), auditLog('LIST_ENCRYPTION_KEYS'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const keys = await prisma.encryptionKey.findMany({
      orderBy: { keyVersion: 'desc' },
      select: {
        id: true,
        keyVersion: true,
        keyType: true,
        source: true,
        keyHint: true,
        importedCertFingerprint: true,
        isActive: true,
        isPrimary: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    res.json({ keys });
  } catch (error) {
    console.error('List encryption keys error:', error);
    res.status(500).json({ error: 'Failed to list encryption keys' });
  }
});

/**
 * POST /settings/encryption/keys
 * Register a new encryption key (ADMIN only)
 */
router.post('/encryption/keys', requireRole(Role.ADMIN), auditLog('REGISTER_ENCRYPTION_KEY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = encryptionKeySchema.parse(req.body);

    await EncryptionService.registerMasterKey({
      source: body.source,
      importedCert: body.importedCert,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    res.json({ message: 'Encryption key registered successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Register encryption key error:', error);
    res.status(500).json({ error: 'Failed to register encryption key' });
  }
});

/**
 * POST /settings/encryption/keys/:version/revoke
 * Revoke an encryption key (ADMIN only)
 */
router.post('/encryption/keys/:version/revoke', requireRole(Role.ADMIN), auditLog('REVOKE_ENCRYPTION_KEY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { version } = req.params as Record<string, string>;
    const keyVersion = parseInt(version);

    const key = await prisma.encryptionKey.findUnique({
      where: { keyVersion },
    });

    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (!key.isActive) {
      return res.status(400).json({ error: 'Key already revoked' });
    }

    if (key.isPrimary) {
      return res.status(400).json({ error: 'Cannot revoke primary key. Set a new primary key first.' });
    }

    await prisma.encryptionKey.update({
      where: { id: key.id },
      data: { isActive: false, revokedAt: new Date() },
    });

    res.json({ message: 'Key revoked successfully' });
  } catch (error) {
    console.error('Revoke encryption key error:', error);
    res.status(500).json({ error: 'Failed to revoke encryption key' });
  }
});

/**
 * POST /settings/encryption/keys/:version/primary
 * Set a key as primary (ADMIN only)
 */
router.post('/encryption/keys/:version/primary', requireRole(Role.ADMIN), auditLog('SET_PRIMARY_KEY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { version } = req.params as Record<string, string>;
    const keyVersion = parseInt(version);

    const key = await prisma.encryptionKey.findUnique({
      where: { keyVersion },
    });

    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (!key.isActive) {
      return res.status(400).json({ error: 'Cannot set inactive key as primary' });
    }

    // Transaction: demote old primary, promote new one
    await prisma.$transaction([
      prisma.encryptionKey.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.encryptionKey.update({
        where: { id: key.id },
        data: { isPrimary: true },
      }),
    ]);

    res.json({ message: 'Primary key updated successfully' });
  } catch (error) {
    console.error('Set primary key error:', error);
    res.status(500).json({ error: 'Failed to set primary key' });
  }
});

export default router;
