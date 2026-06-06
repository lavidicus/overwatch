/**
 * Memory service — CRUD + RAG search.
 *
 * Search strategy: hybrid
 *   1. TF-IDF cosine similarity (semantic-ish, lexical)
 *   2. SQLite FTS5 keyword boost when available (graceful fallback if not)
 *   3. Recency + promoted + accessCount as light reranker
 *
 * Embeddings are stored in a small `memory_embeddings` table created at
 * startup via raw SQL. We sidestep Prisma schema migrations for this
 * supplemental table since the existing `VectorIndex` table tracks
 * provenance only.
 */

import { Memory, MemoryCategory, PrismaClient } from '@prisma/client';
import {
  embed,
  EmbedderVector,
  cosine,
  invalidateIdfCache,
  vectorize,
  tokenize,
  getUserIdf,
} from './embedder.js';
import { renderMemoryContext, MemoryContextItem } from './templates.js';

const prisma = new PrismaClient();

let initialised = false;

export async function initMemorySubsystem(): Promise<void> {
  if (initialised) return;
  initialised = true;
  // Companion table for raw vectors. We use TEXT (JSON) for portability.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS memory_embeddings (
      memory_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vector TEXT NOT NULL,
      norm REAL NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_memory_embeddings_user
    ON memory_embeddings(user_id)
  `);
  // FTS5 virtual table for keyword search (graceful fallback if unsupported).
  try {
    await prisma.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
        memory_id UNINDEXED,
        user_id UNINDEXED,
        content,
        tokenize='porter unicode61'
      )
    `);
  } catch (err) {
    console.warn('FTS5 unavailable, falling back to TF-IDF only:', (err as Error).message);
  }
}

// ---------- Persistence helpers ----------

interface PersistedEmbedding {
  memory_id: string;
  user_id: string;
  vector: string;
  norm: number;
}

async function persistEmbedding(memoryId: string, userId: string, vector: EmbedderVector): Promise<void> {
  const json = JSON.stringify(Array.from(vector.weights.entries()));
  await prisma.$executeRaw`
    INSERT INTO memory_embeddings (memory_id, user_id, vector, norm, updated_at)
    VALUES (${memoryId}, ${userId}, ${json}, ${vector.norm}, ${Date.now()})
    ON CONFLICT(memory_id) DO UPDATE SET
      vector = excluded.vector,
      norm = excluded.norm,
      updated_at = excluded.updated_at
  `;
  // Upsert VectorIndex row for provenance/lineage tracking.
  await prisma.vectorIndex.upsert({
    where: { memoryId },
    update: { vectorId: memoryId, vectorStore: 'tfidf-sqlite', dimension: vector.weights.size },
    create: { memoryId, vectorId: memoryId, vectorStore: 'tfidf-sqlite', dimension: vector.weights.size },
  });
}

async function deleteEmbedding(memoryId: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM memory_embeddings WHERE memory_id = ${memoryId}`;
}

async function loadUserEmbeddings(userId: string): Promise<Array<{ memoryId: string; vector: EmbedderVector }>> {
  const rows = await prisma.$queryRaw<PersistedEmbedding[]>`
    SELECT memory_id, user_id, vector, norm FROM memory_embeddings WHERE user_id = ${userId}
  `;
  return rows.map((r) => {
    const entries = JSON.parse(r.vector) as Array<[string, number]>;
    return {
      memoryId: r.memory_id,
      vector: { weights: new Map(entries), norm: r.norm },
    };
  });
}

async function persistFts(memoryId: string, userId: string, content: string): Promise<void> {
  try {
    await prisma.$executeRaw`DELETE FROM memory_fts WHERE memory_id = ${memoryId}`;
    await prisma.$executeRaw`
      INSERT INTO memory_fts (memory_id, user_id, content)
      VALUES (${memoryId}, ${userId}, ${content})
    `;
  } catch {
    // FTS5 unavailable; ignored.
  }
}

async function deleteFts(memoryId: string): Promise<void> {
  try {
    await prisma.$executeRaw`DELETE FROM memory_fts WHERE memory_id = ${memoryId}`;
  } catch {
    /* ignore */
  }
}

// ---------- CRUD ----------

export interface CreateMemoryInput {
  userId: string;
  category: MemoryCategory;
  content: string;
  metadata?: Record<string, any> | null;
  isPromoted?: boolean;
  isEditable?: boolean;
  ttlDays?: number | null;
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  await initMemorySubsystem();
  const mem = await prisma.memory.create({
    data: {
      userId: input.userId,
      category: input.category,
      content: input.content,
      metadata: input.metadata ?? undefined,
      isPromoted: input.isPromoted ?? false,
      isEditable: input.isEditable ?? true,
      ttlDays: input.ttlDays ?? null,
    },
  });
  // Invalidate IDF cache (corpus changed) before recomputing the vector
  invalidateIdfCache(input.userId);
  const vec = await embed(prisma, input.userId, input.content);
  await persistEmbedding(mem.id, input.userId, vec);
  await persistFts(mem.id, input.userId, input.content);
  return mem;
}

export interface UpdateMemoryInput {
  content?: string;
  category?: MemoryCategory;
  metadata?: Record<string, any> | null;
  isPromoted?: boolean;
  isEditable?: boolean;
  ttlDays?: number | null;
}

export async function updateMemory(memoryId: string, userId: string, input: UpdateMemoryInput): Promise<Memory> {
  await initMemorySubsystem();
  const existing = await prisma.memory.findFirst({ where: { id: memoryId, userId } });
  if (!existing) throw new Error('Memory not found');
  if (!existing.isEditable && (input.content || input.category)) {
    throw new Error('Memory is marked non-editable');
  }
  const updated = await prisma.memory.update({
    where: { id: memoryId },
    data: {
      content: input.content ?? undefined,
      category: input.category ?? undefined,
      metadata: input.metadata === undefined ? undefined : input.metadata ?? undefined,
      isPromoted: input.isPromoted ?? undefined,
      isEditable: input.isEditable ?? undefined,
      ttlDays: input.ttlDays === undefined ? undefined : input.ttlDays,
    },
  });
  if (input.content) {
    invalidateIdfCache(userId);
    const vec = await embed(prisma, userId, input.content);
    await persistEmbedding(memoryId, userId, vec);
    await persistFts(memoryId, userId, input.content);
  }
  return updated;
}

export async function deleteMemory(memoryId: string, userId: string): Promise<void> {
  await initMemorySubsystem();
  const existing = await prisma.memory.findFirst({ where: { id: memoryId, userId } });
  if (!existing) throw new Error('Memory not found');
  await prisma.memory.delete({ where: { id: memoryId } });
  await deleteEmbedding(memoryId);
  await deleteFts(memoryId);
  invalidateIdfCache(userId);
}

export interface ListMemoriesQuery {
  userId: string;
  category?: MemoryCategory;
  search?: string;
  page?: number;
  pageSize?: number;
  includeExpired?: boolean;
}

export async function listMemories(query: ListMemoriesQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));
  const where: any = { userId: query.userId };
  if (query.category) where.category = query.category;
  if (query.search) where.content = { contains: query.search };

  const [items, total] = await prisma.$transaction([
    prisma.memory.findMany({
      where,
      orderBy: [
        { isPromoted: 'desc' },
        { updatedAt: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.memory.count({ where }),
  ]);

  // Apply soft TTL filter post-query unless includeExpired.
  const now = Date.now();
  const filtered = query.includeExpired
    ? items
    : items.filter((m) => {
        if (!m.ttlDays) return true;
        const expiresAt = m.createdAt.getTime() + m.ttlDays * 86400_000;
        return expiresAt > now;
      });

  return { items: filtered, total, page, pageSize };
}

export async function getMemory(memoryId: string, userId: string): Promise<Memory | null> {
  return prisma.memory.findFirst({ where: { id: memoryId, userId } });
}

export async function listCategories(userId: string) {
  const groups = await prisma.memory.groupBy({
    by: ['category'],
    where: { userId },
    _count: { _all: true },
  });
  return groups.map((g) => ({ category: g.category, count: g._count._all }));
}

// ---------- Search ----------

export interface SearchHit {
  memory: Memory;
  score: number;
  ftsScore?: number;
  semanticScore?: number;
}

export interface SearchOptions {
  userId: string;
  query: string;
  topK?: number;
  category?: MemoryCategory;
  promotedBoost?: number;
  recencyBoost?: number;
}

/**
 * Hybrid search: TF-IDF cosine + optional FTS5 + light reranker.
 */
export async function searchMemories(opts: SearchOptions): Promise<SearchHit[]> {
  await initMemorySubsystem();
  const topK = Math.min(50, opts.topK ?? 5);
  const promotedBoost = opts.promotedBoost ?? 0.05;
  const recencyHalfLifeDays = 30;

  // 1. Build query vector from user's IDF (use existing corpus, no rebuild).
  const idf = await getUserIdf(prisma, opts.userId);
  const queryVec = vectorize(tokenize(opts.query), idf);

  // 2. Load all embeddings for this user. With <50k memories per user, this
  //    is fast enough; for production we'd shard or move to pgvector.
  const embeddings = await loadUserEmbeddings(opts.userId);
  if (embeddings.length === 0) return [];

  // 3. Score each embedding.
  const semanticScores = new Map<string, number>();
  for (const { memoryId, vector } of embeddings) {
    semanticScores.set(memoryId, cosine(queryVec, vector));
  }

  // 4. Optional FTS5 boost
  const ftsScores = new Map<string, number>();
  try {
    // bm25() returns negative (lower = better); we invert and clamp
    const escaped = opts.query.replace(/"/g, '""');
    const ftsRows = await prisma.$queryRawUnsafe<Array<{ memory_id: string; rank: number }>>(
      `SELECT memory_id, bm25(memory_fts) AS rank FROM memory_fts
       WHERE user_id = ? AND memory_fts MATCH ? LIMIT 200`,
      opts.userId,
      `"${escaped}"`
    );
    for (const r of ftsRows) {
      // Normalise to (0,1]: 1 / (1 + |rank|)
      ftsScores.set(r.memory_id, 1 / (1 + Math.abs(r.rank)));
    }
  } catch {
    /* FTS5 unavailable or query syntax issue — ignore */
  }

  // 5. Fetch memory rows for top candidates by raw semantic score.
  const candidateIds = Array.from(semanticScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK * 4)
    .map(([id]) => id);

  if (candidateIds.length === 0) return [];

  const memories = await prisma.memory.findMany({
    where: { id: { in: candidateIds }, userId: opts.userId, ...(opts.category ? { category: opts.category } : {}) },
  });

  // 6. Apply hybrid score + recency + promoted boost.
  const now = Date.now();
  const hits: SearchHit[] = memories.map((m) => {
    const semantic = semanticScores.get(m.id) || 0;
    const fts = ftsScores.get(m.id) || 0;
    const ageDays = (now - m.updatedAt.getTime()) / 86400_000;
    const recency = Math.exp(-ageDays / recencyHalfLifeDays) * (opts.recencyBoost ?? 0.05);
    const promoted = m.isPromoted ? promotedBoost : 0;
    const score = semantic * 0.65 + fts * 0.3 + recency + promoted;
    return { memory: m, score, ftsScore: fts, semanticScore: semantic };
  });

  hits.sort((a, b) => b.score - a.score);
  const finalHits = hits.slice(0, topK);

  // 7. Update access metrics (fire-and-forget).
  if (finalHits.length > 0) {
    const ids = finalHits.map((h) => h.memory.id);
    prisma.memory.updateMany({
      where: { id: { in: ids } },
      data: { accessedAt: new Date(), accessCount: { increment: 1 } },
    }).catch(() => {});
  }

  return finalHits;
}

// ---------- RAG injection helper ----------

export async function buildMemoryContext(userId: string, query: string, topK = 5): Promise<{
  contextText: string;
  hits: SearchHit[];
}> {
  const hits = await searchMemories({ userId, query, topK });
  if (hits.length === 0) return { contextText: '', hits: [] };
  const items: MemoryContextItem[] = hits.map((h) => ({
    title: (h.memory.metadata as any)?.title,
    category: h.memory.category,
    content: h.memory.content,
    score: h.score,
  }));
  return { contextText: renderMemoryContext(items), hits };
}

// ---------- Maintenance ----------

/**
 * Promote/demote a memory (also bumps relevanceScore floor).
 */
export async function setPromoted(memoryId: string, userId: string, promoted: boolean): Promise<Memory> {
  const mem = await prisma.memory.findFirst({ where: { id: memoryId, userId } });
  if (!mem) throw new Error('Memory not found');
  return prisma.memory.update({
    where: { id: memoryId },
    data: { isPromoted: promoted, relevanceScore: promoted ? Math.max(mem.relevanceScore, 0.75) : mem.relevanceScore },
  });
}

/**
 * Soft expire (mark for pending deletion) memories whose TTL has elapsed.
 * Returns the number of memories scheduled for deletion.
 */
export async function expireDueMemories(): Promise<number> {
  const all = await prisma.memory.findMany({ where: { ttlDays: { not: null } } });
  const now = Date.now();
  let n = 0;
  for (const m of all) {
    const expiresAt = m.createdAt.getTime() + (m.ttlDays ?? 0) * 86400_000;
    if (expiresAt <= now) {
      // Already scheduled?
      const existing = await prisma.pendingDeletion.findFirst({ where: { memoryId: m.id, confirmedAt: null } });
      if (!existing) {
        await prisma.pendingDeletion.create({
          data: { memoryId: m.id, reason: 'TTL expired', scheduledFor: new Date() },
        });
        n += 1;
      }
    }
  }
  return n;
}

/**
 * Rebuild embeddings for a user. Used after bulk imports or category-wide edits.
 */
export async function rebuildUserEmbeddings(userId: string): Promise<number> {
  await initMemorySubsystem();
  invalidateIdfCache(userId);
  const memories = await prisma.memory.findMany({ where: { userId } });
  for (const m of memories) {
    const vec = await embed(prisma, userId, m.content);
    await persistEmbedding(m.id, userId, vec);
    await persistFts(m.id, userId, m.content);
  }
  return memories.length;
}
