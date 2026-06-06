import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, BenchmarkType } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { runBenchmark, BenchmarkParams, BenchmarkEvent, BenchmarkResultEntry } from '../services/benchmark/runner.js';
import { getIO } from '../index.js';
import { ALL_PROMPT_SETS } from '../services/benchmark/prompts.js';

const router = Router();
const prisma = new PrismaClient();

const createBenchmarkSchema = z.object({
  name: z.string().min(1).max(200),
  providerId: z.string().uuid(),
  modelId: z.string(),
  prompts: z.array(z.string()).optional(),
  promptSet: z.enum(['STANDARD', 'CODING', 'REASONING']).optional(),
  iterations: z.number().int().min(1).max(20).default(3),
  type: z.enum(['SPEED', 'QUALITY', 'COMPARATIVE']).default('SPEED'),
});

const activeRunners = new Map<string, { abort: boolean }>();

router.get('/', authenticate, auditLog('LIST_BENCHMARKS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const [runs, total] = await Promise.all([
      prisma.benchmarkRun.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.benchmarkRun.count({ where: { userId: req.user!.id } }),
    ]);
    res.json({ runs, pagination: { page, limit, total, hasMore: page * limit < total } });
  } catch (error) {
    console.error('List benchmarks error:', error);
    res.status(500).json({ error: 'Failed to list benchmarks' });
  }
});

router.get('/:id', authenticate, auditLog('GET_BENCHMARK'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const run = await prisma.benchmarkRun.findUnique({ where: { id: req.params.id as string, userId: req.user!.id } });
    if (!run) return res.status(404).json({ error: 'Benchmark not found' });
    res.json(run);
  } catch (error) {
    console.error('Get benchmark error:', error);
    res.status(500).json({ error: 'Failed to get benchmark' });
  }
});

router.post('/', authenticate, auditLog('CREATE_BENCHMARK'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = createBenchmarkSchema.parse(req.body);
    const prompts = body.prompts || ALL_PROMPT_SETS[body.promptSet || 'STANDARD'];

    const run = await prisma.benchmarkRun.create({
      data: {
        name: body.name,
        benchmarkType: body.type as BenchmarkType,
        providerId: body.providerId,
        modelId: body.modelId,
        prompt: JSON.stringify({ prompts, iterations: body.iterations, type: body.type }),
        status: 'RUNNING',
        userId: req.user!.id,
        results: {},
      } as any,
    } as any);

    const runId = run.id;
    const runner = { abort: false };
    activeRunners.set(runId, runner);

    (async () => {
      try {
        const result = await runBenchmark(
          { name: body.name, providerId: body.providerId, modelId: body.modelId, prompts, iterations: body.iterations, type: body.type as any },
          (event: BenchmarkEvent) => {
            const io = getIO();
            io?.to(`user:${req.user!.id}`).emit('benchmark:progress', { runId, ...event });
            if (event.type === 'done') {
              const data = event.data as any;
              const r = data.result as any;
              const resObj = JSON.parse(JSON.stringify({
                avgLatencyMs: r.avgLatencyMs, avgTokensPerSec: r.avgTokensPerSec, avgTTFT: r.avgTTFT,
                totalRuns: r.totalRuns, completedRuns: r.completedRuns, failedRuns: r.failedRuns,
                entries: r.results,
              })) as any;
              prisma.benchmarkRun.update({
                where: { id: runId },
                data: { status: 'COMPLETED', results: resObj, completedAt: new Date() },
              }).catch(() => {});
            }
            if (event.type === 'error') {
              prisma.benchmarkRun.update({
                where: { id: runId },
                data: { status: 'FAILED', results: JSON.parse(JSON.stringify({ error: event.data.error })) },
              }).catch(() => {});
            }
          },
          runId
        );
        const finalRes = JSON.parse(JSON.stringify({
          avgLatencyMs: result.avgLatencyMs, avgTokensPerSec: result.avgTokensPerSec, avgTTFT: result.avgTTFT,
          totalRuns: result.totalRuns, completedRuns: result.completedRuns, failedRuns: result.failedRuns,
          entries: result.results,
        })) as any;
        await prisma.benchmarkRun.update({
          where: { id: runId },
          data: { status: 'COMPLETED', results: finalRes, completedAt: new Date() },
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Benchmark ${runId} failed:`, err);
        await prisma.benchmarkRun.update({
          where: { id: runId },
          data: { status: 'FAILED', results: JSON.parse(JSON.stringify({ error: errMsg })) },
        }).catch(() => {});
      } finally {
        activeRunners.delete(runId);
      }
    })();

    res.status(201).json({ id: runId, status: 'RUNNING' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create benchmark error:', error);
    res.status(500).json({ error: 'Failed to create benchmark' });
  }
});

router.delete('/:id', authenticate, auditLog('DELETE_BENCHMARK'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const runId = req.params.id as string;
    const run = await prisma.benchmarkRun.findUnique({ where: { id: runId, userId: req.user!.id } });
    if (!run) return res.status(404).json({ error: 'Benchmark not found' });

    const runner = activeRunners.get(runId);
    if (runner) { runner.abort = true; activeRunners.delete(runId); }

    await prisma.benchmarkRun.update({
      where: { id: runId },
      data: { status: run.status === 'RUNNING' ? 'FAILED' : undefined },
    });
    res.json({ message: 'Benchmark deleted' });
  } catch (error) {
    console.error('Delete benchmark error:', error);
    res.status(500).json({ error: 'Failed to delete benchmark' });
  }
});

export default router;
