import { PrismaClient } from '@prisma/client';
import { getProviderClient } from '../providers/index.js';
import { ChatMessage } from '../providers/types.js';

const prisma = new PrismaClient();

export interface BenchmarkParams {
  name: string;
  providerId: string;
  modelId: string;
  prompts: string[];
  iterations: number;
  type: 'SPEED' | 'QUALITY' | 'COMPARATIVE';
}

export interface BenchmarkEvent {
  type: 'progress' | 'run-complete' | 'done' | 'error';
  data: Record<string, unknown>;
}

export interface BenchmarkRunResult {
  runId: string;
  name: string;
  type: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgLatencyMs: number;
  avgTokensPerSec: number;
  avgTTFT: number;
  results: BenchmarkResultEntry[];
}

export interface BenchmarkResultEntry {
  promptIndex: number;
  iteration: number;
  prompt: string;
  latencyMs: number;
  ttfMs: number;
  tokensPerSec: number;
  totalTokens: number;
  content: string;
  success: boolean;
  error?: string;
}

/**
 * Run a benchmark: iterate over prompts × iterations, measure performance.
 * Calls onEvent callback with progress events.
 */
export async function runBenchmark(
  params: BenchmarkParams,
  onEvent: (event: BenchmarkEvent) => void,
  runId: string
): Promise<BenchmarkRunResult> {
  const results: BenchmarkResultEntry[] = [];
  let completedRuns = 0;
  let failedRuns = 0;
  const totalRuns = params.prompts.length * params.iterations;

  onEvent({
    type: 'progress',
    data: { runId, status: 'running', totalRuns, completedRuns: 0 },
  });

  let totalLatency = 0;
  let totalTokensPerSec = 0;
  let totalTTFT = 0;
  let count = 0;

  try {
    const client = await getProviderClient(params.providerId);

    for (let i = 0; i < params.prompts.length; i++) {
      for (let j = 0; j < params.iterations; j++) {
        const prompt = params.prompts[i];
        const start = Date.now();
        let ttfMs = 0;
        let totalTokens = 0;
        let content = '';
        let success = true;
        let error: string | undefined;

        try {
          // Stream to measure TTFT accurately
          const chatReq = {
            providerId: params.providerId,
            model: params.modelId,
            messages: [{ role: 'user', content: prompt }] as ChatMessage[],
            stream: true,
          };

          for await (const chunk of client.chatCompletionStream(chatReq)) {
            if (ttfMs === 0 && chunk.delta) {
              ttfMs = Date.now() - start;
            }
            if (chunk.delta) {
              content += chunk.delta;
            }
          }

          totalTokens = content.split(/\s+/).filter(Boolean).length * 1.3; // rough estimate
          const elapsed = Date.now() - start;
          const tokensPerSec = ttfMs > 0 ? (totalTokens / elapsed) * 1000 : 0;

          results.push({
            promptIndex: i,
            iteration: j,
            prompt,
            latencyMs: elapsed,
            ttfMs,
            tokensPerSec,
            totalTokens: Math.round(totalTokens),
            content: content.slice(0, 500), // Truncate stored content
            success: true,
          });

          totalLatency += elapsed;
          totalTokensPerSec += tokensPerSec;
          totalTTFT += ttfMs;
          count++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          error = errMsg;
          success = false;
          failedRuns++;

          results.push({
            promptIndex: i,
            iteration: j,
            prompt,
            latencyMs: Date.now() - start,
            ttfMs: 0,
            tokensPerSec: 0,
            totalTokens: 0,
            content: '',
            success: false,
            error: errMsg,
          });
        }

        completedRuns++;
        onEvent({
          type: 'run-complete',
          data: { runId, promptIndex: i, iteration: j, success, latencyMs: results[results.length - 1].latencyMs },
        });

        onEvent({
          type: 'progress',
          data: { runId, completedRuns, failedRuns, totalRuns, pct: (completedRuns / totalRuns) * 100 },
        });
      }
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    onEvent({ type: 'error', data: { runId, error: errMsg } });
    throw err;
  }

  const avgLatency = count > 0 ? Math.round(totalLatency / count) : 0;
  const avgTokensPerSec = count > 0 ? Math.round(totalTokensPerSec / count * 10) / 10 : 0;
  const avgTTFT = count > 0 ? Math.round(totalTTFT / count) : 0;

  const result: BenchmarkRunResult = {
    runId,
    name: params.name,
    type: params.type,
    totalRuns,
    completedRuns,
    failedRuns,
    avgLatencyMs: avgLatency,
    avgTokensPerSec,
    avgTTFT,
    results,
  };

  onEvent({ type: 'done', data: { runId, result } });

  return result;
}
