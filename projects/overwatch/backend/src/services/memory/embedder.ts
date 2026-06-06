/**
 * Simple TF-IDF based embedder for memory vector search.
 *
 * Designed as an MVP so we can implement RAG without external ML deps.
 * Embeddings are deterministic, vector-space friendly, and can be replaced
 * by a real model (vLLM /v1/embeddings, OpenAI, etc.) later by swapping
 * the `embed` function. The shape is stored in the existing VectorIndex
 * table (one row per memory) and the raw vector is persisted in a small
 * companion table `memory_embeddings` (created via raw SQL at startup).
 *
 * The vocabulary is built lazily from the corpus we know about. For
 * search-time queries we keep a precomputed IDF map per user so we can
 * weight tokens correctly. This is intentionally lightweight: we
 * recompute the IDF map when memories change. With <50k memories this
 * is acceptable; for production we would move to pgvector + a real
 * embedding model.
 */

import { PrismaClient } from '@prisma/client';

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','than','that','this','these','those',
  'is','are','was','were','be','been','being','am','do','does','did','done',
  'of','in','on','at','to','for','with','from','by','as','about','into','onto',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their','mine','yours','ours','theirs',
  'so','not','no','yes','can','will','would','could','should','may','might','must',
  'have','has','had','having','some','any','all','none','one','two','three',
]);

export interface EmbedderVector {
  // Sparse map: token -> weight
  weights: Map<string, number>;
  // Pre-normalised L2 magnitude
  norm: number;
}

export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

export function buildIdf(documents: string[][]): Map<string, number> {
  const docCount = documents.length;
  const docFreq = new Map<string, number>();
  for (const tokens of documents) {
    const seen = new Set<string>();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  // smooth-IDF: 1 + log((1+N)/(1+df))
  for (const [token, df] of docFreq.entries()) {
    idf.set(token, 1 + Math.log((1 + docCount) / (1 + df)));
  }
  return idf;
}

export function vectorize(tokens: string[], idf: Map<string, number>): EmbedderVector {
  const tf = termFrequency(tokens);
  const weights = new Map<string, number>();
  let sq = 0;
  for (const [token, count] of tf.entries()) {
    const idfVal = idf.get(token) || 1; // unknown words get baseline weight 1
    const w = count * idfVal;
    if (w === 0) continue;
    weights.set(token, w);
    sq += w * w;
  }
  return { weights, norm: Math.sqrt(sq) || 1 };
}

export function cosine(a: EmbedderVector, b: EmbedderVector): number {
  // Walk smaller map for performance
  const [small, large] = a.weights.size <= b.weights.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [token, w] of small.weights.entries()) {
    const other = large.weights.get(token);
    if (other) dot += w * other;
  }
  return dot / (a.norm * b.norm);
}

// In-memory per-user IDF cache. Keyed by userId. We rebuild on demand
// (mutation events invalidate the cache).
const idfCache = new Map<string, Map<string, number>>();

export function invalidateIdfCache(userId: string) {
  idfCache.delete(userId);
}

export async function getUserIdf(prisma: PrismaClient, userId: string): Promise<Map<string, number>> {
  const cached = idfCache.get(userId);
  if (cached) return cached;

  const memories = await prisma.memory.findMany({
    where: { userId },
    select: { content: true },
  });
  const docs = memories.map((m) => tokenize(m.content));
  const idf = buildIdf(docs);
  idfCache.set(userId, idf);
  return idf;
}

export async function embed(prisma: PrismaClient, userId: string, content: string): Promise<EmbedderVector> {
  const idf = await getUserIdf(prisma, userId);
  return vectorize(tokenize(content), idf);
}
