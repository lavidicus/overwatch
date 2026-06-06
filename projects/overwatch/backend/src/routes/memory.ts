import { Router, Response } from 'express';
import { z } from 'zod';
import { MemoryCategory } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import {
  createMemory,
  updateMemory,
  deleteMemory,
  listMemories,
  getMemory,
  listCategories,
  searchMemories,
  setPromoted,
  rebuildUserEmbeddings,
  initMemorySubsystem,
} from '../services/memory/service.js';

const router = Router();

const categoryEnum = z.nativeEnum(MemoryCategory);

const createSchema = z.object({
  category: categoryEnum,
  content: z.string().min(1).max(20000),
  metadata: z.record(z.any()).optional().nullable(),
  isPromoted: z.boolean().optional(),
  isEditable: z.boolean().optional(),
  ttlDays: z.number().int().positive().optional().nullable(),
});

const updateSchema = z.object({
  category: categoryEnum.optional(),
  content: z.string().min(1).max(20000).optional(),
  metadata: z.record(z.any()).optional().nullable(),
  isPromoted: z.boolean().optional(),
  isEditable: z.boolean().optional(),
  ttlDays: z.number().int().positive().optional().nullable(),
});

const searchSchema = z.object({
  query: z.string().min(1).max(2000),
  topK: z.number().int().min(1).max(50).optional(),
  category: categoryEnum.optional(),
});

const importSchema = z.object({
  items: z.array(z.object({
    category: categoryEnum,
    content: z.string().min(1).max(20000),
    metadata: z.record(z.any()).optional().nullable(),
    isPromoted: z.boolean().optional(),
  })).min(1).max(500),
});

// Lazy init on first hit (cheap idempotent).
router.use(async (_req, _res, next) => {
  try {
    await initMemorySubsystem();
    next();
  } catch (err) {
    next(err);
  }
});

/** GET /api/memory/categories — counts per category */
router.get('/categories', auditLog('LIST_MEMORY_CATEGORIES'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const categories = await listCategories(req.user!.id);
    res.json({ categories });
  } catch (err) {
    console.error('list categories error:', err);
    res.status(500).json({ error: 'Failed to list memory categories' });
  }
});

/** POST /api/memory/search — vector + FTS hybrid search */
router.post('/search', auditLog('SEARCH_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = searchSchema.parse(req.body);
    const hits = await searchMemories({
      userId: req.user!.id,
      query: body.query,
      topK: body.topK,
      category: body.category,
    });
    res.json({
      hits: hits.map((h) => ({
        memory: h.memory,
        score: Number(h.score.toFixed(4)),
        semanticScore: h.semanticScore !== undefined ? Number(h.semanticScore.toFixed(4)) : undefined,
        ftsScore: h.ftsScore !== undefined ? Number(h.ftsScore.toFixed(4)) : undefined,
      })),
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('search memory error:', err);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

/** POST /api/memory/rebuild — rebuild embeddings for the current user */
router.post('/rebuild', auditLog('REBUILD_MEMORY_INDEX'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const n = await rebuildUserEmbeddings(req.user!.id);
    res.json({ rebuilt: n });
  } catch (err) {
    console.error('rebuild error:', err);
    res.status(500).json({ error: 'Failed to rebuild memory index' });
  }
});

/** POST /api/memory/import — bulk import */
router.post('/import', auditLog('IMPORT_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = importSchema.parse(req.body);
    const created = [];
    for (const item of body.items) {
      created.push(await createMemory({
        userId: req.user!.id,
        category: item.category,
        content: item.content,
        metadata: item.metadata ?? null,
        isPromoted: item.isPromoted ?? false,
      }));
    }
    res.status(201).json({ created: created.length });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('import error:', err);
    res.status(500).json({ error: 'Failed to import memories' });
  }
});

/** GET /api/memory — list with pagination + filter */
router.get('/', auditLog('LIST_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;
    const category = req.query.category ? (req.query.category as MemoryCategory) : undefined;
    const search = (req.query.q as string | undefined) || undefined;
    const result = await listMemories({
      userId: req.user!.id,
      page,
      pageSize,
      category,
      search,
    });
    res.json(result);
  } catch (err) {
    console.error('list memory error:', err);
    res.status(500).json({ error: 'Failed to list memories' });
  }
});

/** POST /api/memory — create memory */
router.post('/', auditLog('CREATE_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = createSchema.parse(req.body);
    const mem = await createMemory({
      userId: req.user!.id,
      category: body.category,
      content: body.content,
      metadata: body.metadata ?? null,
      isPromoted: body.isPromoted,
      isEditable: body.isEditable,
      ttlDays: body.ttlDays ?? null,
    });
    res.status(201).json({ memory: mem });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('create memory error:', err);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

/** GET /api/memory/:id */
router.get('/:id', auditLog('GET_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const mem = await getMemory(req.params.id as string, req.user!.id);
    if (!mem) return res.status(404).json({ error: 'Memory not found' });
    res.json({ memory: mem });
  } catch (err) {
    console.error('get memory error:', err);
    res.status(500).json({ error: 'Failed to get memory' });
  }
});

/** PATCH /api/memory/:id */
router.patch('/:id', auditLog('UPDATE_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = updateSchema.parse(req.body);
    const mem = await updateMemory(req.params.id as string, req.user!.id, body);
    res.json({ memory: mem });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    const msg = (err as Error).message;
    if (msg === 'Memory not found') return res.status(404).json({ error: msg });
    if (msg === 'Memory is marked non-editable') return res.status(403).json({ error: msg });
    console.error('update memory error:', err);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

/** POST /api/memory/:id/promote — quick toggle */
router.post('/:id/promote', auditLog('PROMOTE_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = z.object({ promoted: z.boolean() }).parse(req.body);
    const mem = await setPromoted(req.params.id as string, req.user!.id, body.promoted);
    res.json({ memory: mem });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    const msg = (err as Error).message;
    if (msg === 'Memory not found') return res.status(404).json({ error: msg });
    console.error('promote memory error:', err);
    res.status(500).json({ error: 'Failed to promote memory' });
  }
});

/** DELETE /api/memory/:id */
router.delete('/:id', auditLog('DELETE_MEMORY'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await deleteMemory(req.params.id as string, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'Memory not found') return res.status(404).json({ error: msg });
    console.error('delete memory error:', err);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

export default router;
