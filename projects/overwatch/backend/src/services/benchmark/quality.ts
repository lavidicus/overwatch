/**
 * Quality benchmark runner.
 *
 * Runs a set of `(prompt, reference)` pairs against the target provider/model
 * and scores each response. Scoring strategies:
 *
 *   - "exact" : case-insensitive substring match against reference
 *   - "judge" : ask a configured judge provider to grade 0..10
 *
 * The judge approach is required for open-ended prompts (poems, reasoning).
 * Exact matching is fine for fact-check style references.
 */

import { PrismaClient } from '@prisma/client';
import { getProviderClient } from '../providers/index.js';
import { ChatMessage } from '../providers/types.js';

const prisma = new PrismaClient();

export interface QualityPrompt {
  prompt: string;
  reference: string;
  category?: string;
  scoring?: 'exact' | 'judge';
}

export interface QualityRunResult {
  promptIndex: number;
  prompt: string;
  reference: string;
  response: string;
  score: number;          // 0..1
  scoreRaw?: number;      // raw judge score (0..10) when scoring='judge'
  notes?: string;
  scoring: 'exact' | 'judge';
  latencyMs: number;
  success: boolean;
  error?: string;
}

export const STANDARD_QUALITY_PROMPTS: QualityPrompt[] = [
  {
    prompt: 'A bat and a ball cost $1.10. The bat costs $1.00 more than the ball. How much does the ball cost?',
    reference: '$0.05',
    category: 'reasoning',
    scoring: 'exact',
  },
  {
    prompt: 'A farmer has 17 sheep. All but 9 die. How many are left?',
    reference: '9',
    category: 'reasoning',
    scoring: 'exact',
  },
  {
    prompt: 'What is 17 * 24? Reply with just the number.',
    reference: '408',
    category: 'math',
    scoring: 'exact',
  },
  {
    prompt: 'Write a Python one-liner that returns True if n is prime, for n >= 2.',
    reference: 'all(n % i for i in range(2, int(n**0.5)+1))',
    category: 'code',
    scoring: 'judge',
  },
  {
    prompt: 'Summarize the Heisenberg uncertainty principle in one sentence.',
    reference: 'Position and momentum cannot both be known with arbitrary precision.',
    category: 'reasoning',
    scoring: 'judge',
  },
];

export interface QualityParams {
  providerId: string;
  modelId: string;
  prompts?: QualityPrompt[];
  judgeProviderId?: string;
  judgeModelId?: string;
}

export interface QualitySummary {
  totalPrompts: number;
  passed: number;
  failed: number;
  averageScore: number;
  results: QualityRunResult[];
}

function exactScore(response: string, reference: string): number {
  return response.toLowerCase().includes(reference.toLowerCase()) ? 1 : 0;
}

async function judgeScore(
  judgeProviderId: string,
  judgeModel: string,
  prompt: string,
  reference: string,
  response: string
): Promise<{ score: number; raw: number; notes: string }> {
  const judge = await getProviderClient(judgeProviderId);
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a strict grader. Given a prompt, a reference answer, and a candidate answer, return ONLY a JSON object: {"score": <0-10 integer>, "notes": "<one short sentence>"}. Score 10 = perfect; 0 = completely wrong.',
    },
    {
      role: 'user',
      content: `Prompt:\n${prompt}\n\nReference:\n${reference}\n\nCandidate:\n${response}\n\nReturn JSON only.`,
    },
  ];
  const out = await judge.chatCompletion({ providerId: judgeProviderId, model: judgeModel, messages, temperature: 0 });
  try {
    const match = out.content.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { score: 0, notes: 'no JSON returned' };
    const raw = Math.max(0, Math.min(10, Number(parsed.score) || 0));
    return { score: raw / 10, raw, notes: String(parsed.notes ?? '') };
  } catch {
    return { score: 0, raw: 0, notes: `judge returned non-JSON: ${out.content.slice(0, 100)}` };
  }
}

async function resolveModelName(providerId: string, idOrName: string): Promise<string> {
  // If it looks like a UUID, look it up; otherwise treat as the name.
  if (/^[0-9a-f]{8}-/.test(idOrName)) {
    const m = await prisma.providerModel.findUnique({ where: { id: idOrName }, select: { name: true } });
    if (m?.name) return m.name;
  }
  return idOrName;
}

export async function runQualityBenchmark(params: QualityParams): Promise<QualitySummary> {
  const client = await getProviderClient(params.providerId);
  const prompts = params.prompts ?? STANDARD_QUALITY_PROMPTS;
  const results: QualityRunResult[] = [];
  const resolvedModel = await resolveModelName(params.providerId, params.modelId);

  let judgeModelName = params.judgeModelId;
  if (params.judgeProviderId && !judgeModelName) {
    const judgeProvider = await prisma.provider.findUnique({ where: { id: params.judgeProviderId }, select: { model: true } });
    judgeModelName = judgeProvider?.model ?? undefined;
  } else if (params.judgeProviderId && judgeModelName) {
    judgeModelName = await resolveModelName(params.judgeProviderId, judgeModelName);
  }

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    const scoring = p.scoring ?? 'exact';
    const start = Date.now();
    try {
      const out = await client.chatCompletion({
        providerId: params.providerId,
        model: resolvedModel,
        messages: [{ role: 'user', content: p.prompt }],
        temperature: 0,
      });
      const elapsed = Date.now() - start;

      let score = 0;
      let raw: number | undefined;
      let notes: string | undefined;

      if (scoring === 'judge' && params.judgeProviderId && judgeModelName) {
        const judged = await judgeScore(params.judgeProviderId, judgeModelName, p.prompt, p.reference, out.content);
        score = judged.score;
        raw = judged.raw;
        notes = judged.notes;
      } else {
        score = exactScore(out.content, p.reference);
        notes = scoring === 'judge' ? 'no judge configured; fell back to exact match' : undefined;
      }

      results.push({
        promptIndex: i,
        prompt: p.prompt,
        reference: p.reference,
        response: out.content.slice(0, 2000),
        score,
        scoreRaw: raw,
        notes,
        scoring,
        latencyMs: elapsed,
        success: true,
      });
    } catch (err) {
      results.push({
        promptIndex: i,
        prompt: p.prompt,
        reference: p.reference,
        response: '',
        score: 0,
        scoring,
        latencyMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const passed = results.filter((r) => r.score >= 0.5).length;
  const failed = results.length - passed;
  const averageScore = results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
  return { totalPrompts: results.length, passed, failed, averageScore, results };
}

export interface ComparativeParams {
  prompts: QualityPrompt[];
  targets: Array<{ providerId: string; modelId: string; label?: string }>;
  judgeProviderId?: string;
  judgeModelId?: string;
}

export interface ComparativeSummary {
  targets: Array<{
    providerId: string;
    modelId: string;
    label: string;
    averageScore: number;
    averageLatencyMs: number;
    results: QualityRunResult[];
  }>;
  winner?: { providerId: string; modelId: string; label: string; averageScore: number };
}

export async function runComparativeBenchmark(params: ComparativeParams): Promise<ComparativeSummary> {
  const targets: ComparativeSummary['targets'] = [];
  for (const t of params.targets) {
    const summary = await runQualityBenchmark({
      providerId: t.providerId,
      modelId: t.modelId,
      prompts: params.prompts,
      judgeProviderId: params.judgeProviderId,
      judgeModelId: params.judgeModelId,
    });
    const avgLatency = summary.results.length > 0
      ? Math.round(summary.results.reduce((s, r) => s + r.latencyMs, 0) / summary.results.length)
      : 0;
    targets.push({
      providerId: t.providerId,
      modelId: t.modelId,
      label: t.label ?? `${t.providerId}:${t.modelId}`,
      averageScore: summary.averageScore,
      averageLatencyMs: avgLatency,
      results: summary.results,
    });
  }
  const winner = targets.length > 0
    ? [...targets].sort((a, b) => b.averageScore - a.averageScore)[0]
    : undefined;
  return {
    targets,
    winner: winner ? { providerId: winner.providerId, modelId: winner.modelId, label: winner.label, averageScore: winner.averageScore } : undefined,
  };
}
