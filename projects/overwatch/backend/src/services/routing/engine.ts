/**
 * Routing engine.
 *
 * Given an incoming chat request (prompt + optional hints) and a set of
 * enabled RoutingRule rows, pick the best provider/model. Rules are evaluated
 * in priority order; the first matching rule wins. If none match, the engine
 * returns null (caller falls back to the session's configured provider).
 *
 * Rule condition shape (Json):
 * {
 *   "maxCost"?: number,            // ¢ per 1k tokens (informational; filter)
 *   "maxLatencyMs"?: number,       // provider.latencyMs ceiling
 *   "modelCapability"?: string[],  // e.g. ["vision", "tools"] — matched by name substring
 *   "contentPattern"?: string,     // case-insensitive regex against the prompt
 *   "minTokens"?: number,          // route long prompts elsewhere
 *   "maxTokens"?: number,          // route short prompts elsewhere
 *   "tags"?: string[]              // matched against rule.name/description
 * }
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RoutingContext {
  prompt: string;
  hints?: {
    capability?: string;
    tag?: string;
    maxCost?: number;
    maxLatencyMs?: number;
  };
}

export interface RoutingDecision {
  ruleId: string;
  ruleName: string;
  providerId: string | null;
  modelId: string | null;
  reason: string;
}

interface RuleCondition {
  maxCost?: number;
  maxLatencyMs?: number;
  modelCapability?: string[];
  contentPattern?: string;
  minTokens?: number;
  maxTokens?: number;
  tags?: string[];
}

function roughTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function ruleMatches(condition: RuleCondition | null, ctx: RoutingContext, provider: { latencyMs: number | null; model: string | null }): { ok: boolean; reason: string } {
  if (!condition) return { ok: true, reason: 'unconditional' };

  const tokens = roughTokenCount(ctx.prompt);
  if (condition.minTokens !== undefined && tokens < condition.minTokens) {
    return { ok: false, reason: `tokens<${condition.minTokens}` };
  }
  if (condition.maxTokens !== undefined && tokens > condition.maxTokens) {
    return { ok: false, reason: `tokens>${condition.maxTokens}` };
  }
  if (condition.maxLatencyMs !== undefined && provider.latencyMs !== null && provider.latencyMs > condition.maxLatencyMs) {
    return { ok: false, reason: `provider latency ${provider.latencyMs}>${condition.maxLatencyMs}` };
  }
  if (condition.contentPattern) {
    try {
      const re = new RegExp(condition.contentPattern, 'i');
      if (!re.test(ctx.prompt)) return { ok: false, reason: 'content pattern mismatch' };
    } catch {
      return { ok: false, reason: 'invalid regex' };
    }
  }
  if (condition.modelCapability && condition.modelCapability.length > 0) {
    const modelLc = (provider.model ?? '').toLowerCase();
    const matchesCap = condition.modelCapability.some((cap) => modelLc.includes(cap.toLowerCase()));
    if (!matchesCap) return { ok: false, reason: `model lacks capability` };
  }
  if (ctx.hints?.capability && condition.modelCapability) {
    if (!condition.modelCapability.includes(ctx.hints.capability)) {
      return { ok: false, reason: `hint capability mismatch` };
    }
  }
  return { ok: true, reason: 'matched' };
}

/**
 * Select a route. Returns null when no enabled rule applies.
 */
export async function pickRoute(ctx: RoutingContext): Promise<RoutingDecision | null> {
  const rules = await prisma.routingRule.findMany({
    where: { enabled: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  for (const rule of rules) {
    const condition = (rule.condition as RuleCondition | null) ?? null;
    if (!rule.targetProviderId) continue;

    const provider = await prisma.provider.findUnique({
      where: { id: rule.targetProviderId },
      select: { latencyMs: true, model: true, status: true },
    });
    if (!provider) continue;
    if (provider.status === 'DISCONNECTED' || provider.status === 'ERROR') continue;

    const match = ruleMatches(condition, ctx, provider);
    if (!match.ok) continue;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      providerId: rule.targetProviderId,
      modelId: rule.targetModelId,
      reason: match.reason,
    };
  }
  return null;
}

/**
 * Dry-run the engine and return *all* candidate evaluations for inspection.
 */
export async function simulateRoute(ctx: RoutingContext): Promise<Array<RoutingDecision & { matched: boolean }>> {
  const rules = await prisma.routingRule.findMany({
    where: { enabled: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
  const out: Array<RoutingDecision & { matched: boolean }> = [];
  for (const rule of rules) {
    const condition = (rule.condition as RuleCondition | null) ?? null;
    if (!rule.targetProviderId) {
      out.push({ ruleId: rule.id, ruleName: rule.name, providerId: null, modelId: null, reason: 'no target', matched: false });
      continue;
    }
    const provider = await prisma.provider.findUnique({
      where: { id: rule.targetProviderId },
      select: { latencyMs: true, model: true, status: true },
    });
    if (!provider) {
      out.push({ ruleId: rule.id, ruleName: rule.name, providerId: rule.targetProviderId, modelId: rule.targetModelId, reason: 'provider missing', matched: false });
      continue;
    }
    const match = ruleMatches(condition, ctx, provider);
    out.push({
      ruleId: rule.id,
      ruleName: rule.name,
      providerId: rule.targetProviderId,
      modelId: rule.targetModelId,
      reason: match.reason,
      matched: match.ok && provider.status !== 'DISCONNECTED' && provider.status !== 'ERROR',
    });
  }
  return out;
}
