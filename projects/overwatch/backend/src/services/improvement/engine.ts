/**
 * Self-improvement engine.
 *
 * Inspects provider health, benchmark trends, and configuration settings,
 * then writes recommendations to the existing `change_proposals` table.
 * The engine only proposes — it never auto-applies. A human must approve
 * each proposal via the change-proposals API (human-in-the-loop).
 */

import {
  PrismaClient,
  ProviderStatus,
  ChangeCategory,
  ImprovementType,
  ChangePriority,
  ChangeRisk,
  ChangeStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

export interface Recommendation {
  title: string;
  description: string;
  category: ChangeCategory;
  type: ImprovementType;
  priority: ChangePriority;
  risk: ChangeRisk;
  configDiff: Record<string, any>;
  // Stable signature so we don't re-create the same proposal repeatedly.
  signature: string;
}

export interface AnalysisReport {
  providerIssues: number;
  benchmarkIssues: number;
  configIssues: number;
  recommendationsCreated: number;
  recommendationsSkipped: number; // duplicate signature
  recommendations: Recommendation[];
}

const PROVIDER_LATENCY_WARN_MS = 5000;
const PROVIDER_LATENCY_CRIT_MS = 12000;
const BENCH_REGRESSION_FACTOR = 1.5; // 50% slower than historical median

// ---------- Provider analysis ----------

export async function analyzeProviders(): Promise<Recommendation[]> {
  const providers = await prisma.provider.findMany();
  const recs: Recommendation[] = [];

  for (const p of providers) {
    // Hard-down provider
    if (p.status === ProviderStatus.DISCONNECTED || p.status === ProviderStatus.ERROR) {
      recs.push({
        title: `Provider ${p.name} is ${p.status.toLowerCase()}`,
        description: `Provider ${p.name} (${p.type}) is reported as ${p.status}. Recommend health-check, restart, or temporary disable until resolved.`,
        category: ChangeCategory.CONFIG_TWEAK,
        type: ImprovementType.SYSTEM_DETECTED,
        priority: p.status === ProviderStatus.ERROR ? ChangePriority.HIGH : ChangePriority.MEDIUM,
        // (kept for clarity)
        risk: ChangeRisk.LOW,
        configDiff: { providerId: p.id, suggestion: 'disable_temporarily', currentStatus: p.status },
        signature: `provider-down:${p.id}:${p.status}`,
      });
    }

    // High latency
    if (p.latencyMs && p.latencyMs >= PROVIDER_LATENCY_CRIT_MS) {
      recs.push({
        title: `Provider ${p.name} latency is critical (${p.latencyMs}ms)`,
        description: `Latest measured latency is ${p.latencyMs}ms (≥ ${PROVIDER_LATENCY_CRIT_MS}ms). Recommend rerouting traffic or investigating the upstream host.`,
        category: ChangeCategory.CONFIG_TWEAK,
        type: ImprovementType.SYSTEM_DETECTED,
        priority: ChangePriority.HIGH,
        risk: ChangeRisk.MEDIUM,
        configDiff: { providerId: p.id, suggestion: 'demote_in_routing', latencyMs: p.latencyMs },
        signature: `provider-latency-crit:${p.id}`,
      });
    } else if (p.latencyMs && p.latencyMs >= PROVIDER_LATENCY_WARN_MS) {
      recs.push({
        title: `Provider ${p.name} latency is elevated (${p.latencyMs}ms)`,
        description: `Latest measured latency is ${p.latencyMs}ms (≥ ${PROVIDER_LATENCY_WARN_MS}ms). Consider lowering its routing weight.`,
        category: ChangeCategory.CONFIG_TWEAK,
        type: ImprovementType.SYSTEM_DETECTED,
        priority: ChangePriority.MEDIUM,
        risk: ChangeRisk.LOW,
        configDiff: { providerId: p.id, suggestion: 'lower_weight', latencyMs: p.latencyMs },
        signature: `provider-latency-warn:${p.id}`,
      });
    }

    // Stale health check (no check in 24h)
    if (p.lastChecked && Date.now() - p.lastChecked.getTime() > 86400_000) {
      recs.push({
        title: `Provider ${p.name} health check is stale`,
        description: `No health check observed in the last 24h. Recommend running a fresh health probe.`,
        category: ChangeCategory.CONFIG_TWEAK,
        type: ImprovementType.SYSTEM_DETECTED,
        priority: ChangePriority.LOW,
        risk: ChangeRisk.LOW,
        configDiff: { providerId: p.id, suggestion: 'run_health_check' },
        signature: `provider-stale:${p.id}`,
      });
    }
  }
  return recs;
}

// ---------- Benchmark analysis ----------

export async function analyzeBenchmarks(): Promise<Recommendation[]> {
  const recs: Recommendation[] = [];
  const cutoff = new Date(Date.now() - 30 * 86400_000);
  const recent = await prisma.benchmarkRun.findMany({
    where: { status: 'COMPLETED', completedAt: { gte: cutoff } },
    orderBy: { completedAt: 'desc' },
  });

  // Group by providerId+modelId
  const groups = new Map<string, typeof recent>();
  for (const r of recent) {
    const key = `${r.providerId}::${r.modelId ?? 'none'}`;
    const arr = groups.get(key) || [];
    arr.push(r);
    groups.set(key, arr);
  }

  for (const [key, runs] of groups.entries()) {
    if (runs.length < 4) continue; // not enough history
    // Pull latency from results (best-effort).
    const latencies = runs
      .map((r) => {
        const j = (r.results as any) ?? {};
        const v = j.latencyMs ?? j.totalLatencyMs ?? j.avgLatencyMs;
        return typeof v === 'number' && v > 0 ? v : undefined;
      })
      .filter((v): v is number => v !== undefined);

    if (latencies.length < 4) continue;
    const sorted = [...latencies].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const latest = latencies[0] ?? 0;
    if (latest > median * BENCH_REGRESSION_FACTOR) {
      const [providerId, modelId] = key.split('::');
      recs.push({
        title: `Benchmark regression detected for provider ${providerId}`,
        description: `Latest benchmark latency ${latest.toFixed(0)}ms exceeds 30-day median ${median.toFixed(0)}ms by ${(BENCH_REGRESSION_FACTOR * 100 - 100).toFixed(0)}%+. Recommend investigation.`,
        category: ChangeCategory.CONFIG_TWEAK,
        type: ImprovementType.SYSTEM_DETECTED,
        priority: ChangePriority.MEDIUM,
        risk: ChangeRisk.LOW,
        configDiff: { providerId, modelId: modelId === 'none' ? null : modelId, latest, median },
        signature: `bench-regression:${providerId}:${modelId}`,
      });
    }
  }

  return recs;
}

// ---------- Config analysis ----------

export async function analyzeConfig(): Promise<Recommendation[]> {
  const recs: Recommendation[] = [];
  const required = [
    { key: 'security.session.timeout', defaultValue: '3600', desc: 'Session timeout missing — recommend setting a default value (seconds).' },
    { key: 'memory.rag.topK', defaultValue: '5', desc: 'No default top-K for memory RAG — recommend setting one.' },
    { key: 'memory.rag.enabled', defaultValue: 'true', desc: 'Memory RAG flag missing — recommend enabling.' },
  ];

  for (const r of required) {
    const existing = await prisma.setting.findUnique({ where: { key: r.key } });
    if (!existing) {
      recs.push({
        title: `Missing recommended setting: ${r.key}`,
        description: r.desc,
        category: ChangeCategory.CONFIG_TWEAK,
        type: ImprovementType.SYSTEM_DETECTED,
        priority: ChangePriority.LOW,
        risk: ChangeRisk.LOW,
        configDiff: { setting: { key: r.key, value: r.defaultValue } },
        signature: `missing-setting:${r.key}`,
      });
    }
  }
  return recs;
}

// ---------- Persistence ----------

async function createProposal(rec: Recommendation, proposedByUserId?: string): Promise<boolean> {
  // Idempotency: check signature against existing open proposals.
  const existing = await prisma.changeProposal.findFirst({
    where: {
      source: rec.signature,
      status: { in: [ChangeStatus.DRAFT, ChangeStatus.UNDER_REVIEW, ChangeStatus.APPROVED] },
    },
  });
  if (existing) return false;

  await prisma.changeProposal.create({
    data: {
      title: rec.title,
      description: rec.description,
      category: rec.category,
      type: rec.type,
      source: rec.signature,
      proposedByUserId: proposedByUserId ?? null,
      proposedBySystem: true,
      priority: rec.priority,
      risk: rec.risk,
      status: ChangeStatus.DRAFT,
      configDiff: rec.configDiff,
    },
  });
  return true;
}

export async function generateRecommendations(): Promise<Recommendation[]> {
  const [p, b, c] = await Promise.all([
    analyzeProviders(),
    analyzeBenchmarks(),
    analyzeConfig(),
  ]);
  return [...p, ...b, ...c];
}

export async function runAnalysis(proposedByUserId?: string): Promise<AnalysisReport> {
  const providerRecs = await analyzeProviders();
  const benchRecs = await analyzeBenchmarks();
  const configRecs = await analyzeConfig();
  const all = [...providerRecs, ...benchRecs, ...configRecs];

  let created = 0;
  let skipped = 0;
  for (const r of all) {
    const wasCreated = await createProposal(r, proposedByUserId);
    if (wasCreated) created += 1;
    else skipped += 1;
  }

  return {
    providerIssues: providerRecs.length,
    benchmarkIssues: benchRecs.length,
    configIssues: configRecs.length,
    recommendationsCreated: created,
    recommendationsSkipped: skipped,
    recommendations: all,
  };
}
