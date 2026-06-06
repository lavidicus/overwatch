import { NextFunction, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.js';

const prisma = new PrismaClient();

export interface AuditDetails {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userId?: string;
}

/**
 * Audit logging middleware factory
 * Logs significant actions to the AuditLog table
 */
export const auditLog = (action: string) => {
  return async (req: AuthRequest, res: Response<any, Record<string, any>>, next: NextFunction) => {
    // Capture start time for duration calculation
    const startTime = Date.now();

    // Store original json method to capture response body
    const originalJson = res.json.bind(res);
    let responseBody: any;

    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    // Log after response is sent (non-blocking)
    res.on('finish', async () => {
      try {
        const userId = req.user?.id || null;
        const ipAddress = req.ip || req.socket.remoteAddress || null;

        // Extract entity info from request path
        const pathParts = req.path.split('/').filter(Boolean);
        let entityType: string | undefined;
        let entityId: string | undefined;

        if (pathParts.length >= 2) {
          entityType = pathParts[0]; // e.g., 'users', 'providers'
          if (pathParts[1] && !pathParts[1].startsWith(':')) {
            entityId = pathParts[1];
          }
        }

        // Build details object
        const details: Record<string, any> = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startTime,
          userAgent: req.get('user-agent'),
        };

        if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
          details.requestBody = sanitizeBody(req.body);
        }

        if (responseBody && res.statusCode >= 400) {
          details.error = responseBody;
        }

        // Create audit log entry (fire and forget, don't block response)
        await prisma.auditLog.create({
          data: {
            userId,
            action: `${req.method}:${action}`,
            entityType,
            entityId,
            details,
            ipAddress,
          },
        });
      } catch (error) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', error);
      }
    });

    next();
  };
};

/**
 * Sanitize request body before logging (remove sensitive fields)
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = [
    'password',
    'passwordHash',
    'apiKey',
    'token',
    'secret',
    'encryptedPassword',
    'encryptedKey',
    'keyPassword',
    'authTokenEncrypted',
    'mfaSecret',
  ];

  const sanitized = Array.isArray(body) ? [...body] : { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Manual audit log function for programmatic use
 */
export async function logAudit(data: AuditDetails): Promise<void> {
  try {
    await prisma.auditLog.create({
      data,
    });
  } catch (error) {
    console.error('Manual audit logging failed:', error);
  }
}
