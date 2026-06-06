import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { queueHealth, getQueue, QueueName } from '../services/queue/index.js';

const router = Router();

/**
 * GET /api/queue/health
 */
router.get('/health', authenticate, async (_req: AuthRequest, res): Promise<any> => {
  const health = await queueHealth();
  res.json(health);
});

/**
 * POST /api/queue/:name/enqueue
 * Body: { jobName, data }
 */
router.post('/:name/enqueue', authenticate, async (req: AuthRequest, res): Promise<any> => {
  const name = req.params.name as QueueName;
  if (!['benchmark', 'hf-download', 'tool-invocation'].includes(name)) {
    return res.status(400).json({ error: 'Unknown queue' });
  }
  try {
    const queue = getQueue(name);
    const job = await queue.add(req.body?.jobName ?? 'generic', req.body?.data ?? {});
    res.status(201).json({ jobId: job.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
