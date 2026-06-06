/**
 * Per-user tool grant evaluation.
 *
 * A UserToolGrant lets a user pre-authorize a specific tool so that future
 * invocations skip the PENDING approval step. Grants can be:
 *   - scope "ALL"      → applies to every session
 *   - scope "SESSION"  → applies only to the given sessionId
 *
 * Optionally a grant carries an `argsMatch` JSON pattern. The invocation
 * args must match every key in the pattern (deep equality of objects,
 * with the special case that pattern string values ending in `*` are
 * treated as glob prefixes).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FindMatchingGrantParams {
  userId: string;
  toolId: string;
  sessionId?: string | null;
  args: Record<string, unknown>;
}

/**
 * Look up an active grant that auto-approves this invocation.
 * Returns the grant id when one matches, otherwise null.
 */
export async function findMatchingGrant(params: FindMatchingGrantParams): Promise<string | null> {
  const candidates = await prisma.userToolGrant.findMany({
    where: {
      userId: params.userId,
      toolId: params.toolId,
      revokedAt: null,
      OR: [
        { scope: 'ALL' },
        ...(params.sessionId ? [{ scope: 'SESSION', sessionId: params.sessionId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const grant of candidates) {
    if (!grant.argsMatch) return grant.id;
    if (matchesArgs(grant.argsMatch as Record<string, unknown>, params.args)) return grant.id;
  }
  return null;
}

/**
 * Pattern match: every key in `pattern` must be present in `args`.
 * - If pattern value is a string ending in `*`, treat as glob prefix.
 * - If pattern value is an object, recurse.
 * - Otherwise require strict deep equality of the JSON value.
 */
export function matchesArgs(pattern: Record<string, unknown>, args: Record<string, unknown>): boolean {
  for (const key of Object.keys(pattern)) {
    const pv = pattern[key];
    const av = (args ?? {})[key];

    if (typeof pv === 'string' && pv.endsWith('*')) {
      if (typeof av !== 'string') return false;
      if (!av.startsWith(pv.slice(0, -1))) return false;
      continue;
    }

    if (pv !== null && typeof pv === 'object' && !Array.isArray(pv)) {
      if (av === null || typeof av !== 'object' || Array.isArray(av)) return false;
      if (!matchesArgs(pv as Record<string, unknown>, av as Record<string, unknown>)) return false;
      continue;
    }

    // Strict deep equality via JSON for primitives & arrays.
    if (JSON.stringify(pv) !== JSON.stringify(av)) return false;
  }
  return true;
}
