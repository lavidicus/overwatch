import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, requireRole, Role } from '../middleware/auth.js';
import { auditLog as auditMiddleware } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const auditQuerySchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /audit/logs
 * List audit logs (ADMIN only)
 */
router.get('/logs', requireRole(Role.ADMIN), auditMiddleware('LIST_AUDIT_LOGS'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const query = auditQuerySchema.parse(req.query);

    const where: any = {};

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('List audit logs error:', error);
    res.status(500).json({ error: 'Failed to list audit logs' });
  }
});

/**
 * GET /audit/logs/:id
 * Get a specific audit log entry (ADMIN only)
 */
router.get('/logs/:id', requireRole(Role.ADMIN), auditMiddleware('GET_AUDIT_LOG'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json({ log });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

/**
 * GET /audit/stats
 * Get audit log statistics (ADMIN only)
 */
router.get('/stats', requireRole(Role.ADMIN), auditMiddleware('AUDIT_STATS'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get counts by action type
    const actions = await prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    });

    // Get counts by entity type
    const entityTypes = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where: { ...where, entityType: { not: null } },
      _count: true,
      orderBy: { _count: { entityType: 'desc' } },
      take: 20,
    });

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get unique users
    const uniqueUsers = await prisma.auditLog.findMany({
      where,
      distinct: ['userId'],
      select: { userId: true },
    });

    res.json({
      stats: {
        total,
        uniqueUsers: uniqueUsers.length,
        topActions: actions.map((a) => ({ action: a.action, count: a._count })),
        topEntityTypes: entityTypes.map((e) => ({
          entityType: e.entityType,
          count: e._count,
        })),
      },
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ error: 'Failed to get audit statistics' });
  }
});

export default router;
