import { PrismaClient } from '@prisma/client';
import { BUILTIN_TOOLS, getBuiltinTool } from './builtin.js';

const prisma = new PrismaClient();

/**
 * Ensure every built-in tool exists in the database. Idempotent.
 * Called once at server boot. New built-ins are inserted; existing rows
 * are left untouched to preserve admin overrides (enabled/disabled).
 */
export async function syncBuiltinTools(): Promise<void> {
  for (const tool of BUILTIN_TOOLS) {
    const existing = await prisma.tool.findUnique({ where: { name: tool.name } });
    if (!existing) {
      await prisma.tool.create({
        data: {
          name: tool.name,
          description: tool.description,
          category: tool.category,
          schema: tool.schema as any,
          enabled: true,
          requiresApproval: tool.requiresApproval,
        },
      });
    }
  }
}

/**
 * Execute a tool by name with the given args, recording the result.
 * Returns the structured tool result on success or throws on failure.
 */
export async function executeToolByName(
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: boolean; result?: unknown; error?: string; durationMs: number }> {
  const start = Date.now();
  const tool = getBuiltinTool(name);
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${name}`, durationMs: 0 };
  }
  try {
    const result = await tool.execute(args);
    return { ok: true, result, durationMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message, durationMs: Date.now() - start };
  }
}

export { BUILTIN_TOOLS, getBuiltinTool };
