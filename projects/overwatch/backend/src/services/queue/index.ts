/**
 * Task queue service.
 *
 * Prefers BullMQ (Redis-backed) when REDIS_URL is reachable; otherwise falls
 * back to an in-memory FIFO queue with the same enqueue/process surface.
 *
 * Queues:
 *  - benchmark        : long-running benchmark jobs
 *  - hf-download      : HuggingFace model downloads
 *  - tool-invocation  : asynchronous tool executions
 */

import { Queue, Worker, QueueEvents, type Job } from 'bullmq';
import Redis from 'ioredis';

export type QueueName = 'benchmark' | 'hf-download' | 'tool-invocation';
const QUEUE_NAMES: QueueName[] = ['benchmark', 'hf-download', 'tool-invocation'];

interface QueueHandle {
  add(jobName: string, data: Record<string, unknown>): Promise<{ id: string }>;
  count(): Promise<{ waiting: number; active: number; completed: number; failed: number }>;
  ping(): Promise<boolean>;
}

type Processor = (data: Record<string, unknown>) => Promise<unknown>;

const processors = new Map<QueueName, Processor>();
const handles = new Map<QueueName, QueueHandle>();
let usingRedis = false;
let redisHealthy = false;

/**
 * Register a processor for a queue. Idempotent.
 */
export function registerProcessor(name: QueueName, fn: Processor): void {
  processors.set(name, fn);
}

/**
 * In-memory queue used when Redis is unavailable.
 */
class InMemoryQueue implements QueueHandle {
  private waiting: Array<{ id: string; name: string; data: Record<string, unknown> }> = [];
  private active = 0;
  private completed = 0;
  private failed = 0;

  constructor(private queueName: QueueName) {}

  async add(jobName: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.waiting.push({ id, name: jobName, data });
    queueMicrotask(() => this.tick());
    return { id };
  }

  private async tick(): Promise<void> {
    const job = this.waiting.shift();
    if (!job) return;
    const handler = processors.get(this.queueName);
    if (!handler) {
      // No processor registered yet; re-queue.
      this.waiting.unshift(job);
      return;
    }
    this.active++;
    try {
      await handler(job.data);
      this.completed++;
    } catch (err) {
      this.failed++;
      console.error(`[queue:${this.queueName}] job ${job.id} failed:`, err);
    } finally {
      this.active--;
      if (this.waiting.length > 0) queueMicrotask(() => this.tick());
    }
  }

  async count() {
    return {
      waiting: this.waiting.length,
      active: this.active,
      completed: this.completed,
      failed: this.failed,
    };
  }

  async ping() {
    return true;
  }
}

/**
 * BullMQ wrapper.
 */
class BullQueueHandle implements QueueHandle {
  private queue: Queue;
  private events: QueueEvents;

  constructor(private queueName: QueueName, connection: Redis) {
    this.queue = new Queue(queueName, { connection: connection as any });
    this.events = new QueueEvents(queueName, { connection: connection as any });
  }

  async add(jobName: string, data: Record<string, unknown>) {
    const job = await this.queue.add(jobName, data);
    return { id: String(job.id) };
  }

  async count() {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed');
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    };
  }

  async ping() {
    try {
      const client = await this.queue.client;
      // ioredis exposes `.ping()`; cast away the typing mismatch from bullmq's IRedisClient.
      await (client as unknown as { ping: () => Promise<string> }).ping();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Initialize all queues. Tries Redis first; falls back to in-memory.
 * Idempotent — safe to call multiple times.
 */
export async function initQueues(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    let connection: Redis | null = null;
    try {
      connection = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      // Quiet ECONNREFUSED noise during the probe
      connection.on('error', () => {});
      await connection.connect();
      await connection.ping();
      redisHealthy = true;
      usingRedis = true;
      for (const name of QUEUE_NAMES) {
        if (!handles.has(name)) handles.set(name, new BullQueueHandle(name, connection));
      }
      // Spin up workers for each queue
      for (const name of QUEUE_NAMES) {
        new Worker(
          name,
          async (job: Job) => {
            const handler = processors.get(name);
            if (!handler) throw new Error(`No processor registered for queue ${name}`);
            return await handler((job.data ?? {}) as Record<string, unknown>);
          },
          { connection: connection as any }
        );
      }
      return;
    } catch (err) {
      console.warn('[queue] Redis unavailable, using in-memory fallback:', (err as Error).message);
      try { connection?.disconnect(); } catch { /* ignore */ }
    }
  }
  // Fallback: in-memory
  usingRedis = false;
  redisHealthy = false;
  for (const name of QUEUE_NAMES) {
    if (!handles.has(name)) handles.set(name, new InMemoryQueue(name));
  }
}

export function getQueue(name: QueueName): QueueHandle {
  const q = handles.get(name);
  if (!q) throw new Error(`Queue ${name} not initialized; call initQueues() first`);
  return q;
}

export async function queueHealth() {
  const queues: Record<string, unknown> = {};
  for (const name of QUEUE_NAMES) {
    const handle = handles.get(name);
    if (handle) {
      queues[name] = { ...(await handle.count()), reachable: await handle.ping() };
    } else {
      queues[name] = { error: 'not initialized' };
    }
  }
  return {
    backend: usingRedis ? 'redis' : 'memory',
    redisHealthy,
    queues,
  };
}
