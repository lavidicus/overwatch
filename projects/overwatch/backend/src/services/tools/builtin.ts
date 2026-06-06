/**
 * Built-in tool definitions and executors.
 *
 * Each tool has:
 *  - JSON Schema describing args (used for LLM tool-calling format)
 *  - An `execute(args)` function returning a structured result
 *
 * Security note: dangerous tools (shell_exec, filesystem_write) default to
 * `requiresApproval=true` and are wired through ToolInvocation.PENDING gating.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(execCallback);

export interface BuiltinTool {
  name: string;
  description: string;
  category: string;
  requiresApproval: boolean;
  schema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

const WORKSPACE_ROOT = process.env.OVERWATCH_TOOL_WORKSPACE || '/tmp/overwatch-tools';

async function ensureWorkspace(): Promise<void> {
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  } catch {
    // best effort
  }
}

function inWorkspace(p: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, p);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path escapes workspace: ${p}`);
  }
  return resolved;
}

export const BUILTIN_TOOLS: BuiltinTool[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Returns a list of result titles, URLs, and snippets.',
    category: 'web',
    requiresApproval: false,
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
        count: { type: 'number', description: 'Max results (1-10).', default: 5 },
      },
      required: ['query'],
    },
    async execute(args) {
      // Minimal stub: real implementation would call a search API.
      // Returning a documented stub keeps the contract predictable.
      return {
        ok: true,
        note: 'web_search is a stub; wire to a real provider (Brave/Perplexity) to enable live results.',
        query: args.query,
        results: [],
      };
    },
  },
  {
    name: 'web_fetch',
    description: 'Fetch a URL and return its body as text (truncated to 50KB).',
    category: 'web',
    requiresApproval: false,
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch.' },
      },
      required: ['url'],
    },
    async execute(args) {
      const url = String(args.url);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OverwatchToolBot/1.0' },
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type') ?? null,
        body: text.slice(0, 50_000),
        truncated: text.length > 50_000,
      };
    },
  },
  {
    name: 'filesystem_read',
    description: 'Read a text file inside the tool workspace.',
    category: 'filesystem',
    requiresApproval: false,
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Workspace-relative path.' },
      },
      required: ['path'],
    },
    async execute(args) {
      await ensureWorkspace();
      const target = inWorkspace(String(args.path));
      const content = await fs.readFile(target, 'utf8');
      return { ok: true, path: args.path, size: content.length, content: content.slice(0, 100_000) };
    },
  },
  {
    name: 'filesystem_write',
    description: 'Write text content to a file inside the tool workspace.',
    category: 'filesystem',
    requiresApproval: true,
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Workspace-relative path.' },
        content: { type: 'string', description: 'File content.' },
      },
      required: ['path', 'content'],
    },
    async execute(args) {
      await ensureWorkspace();
      const target = inWorkspace(String(args.path));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, String(args.content), 'utf8');
      return { ok: true, path: args.path, bytesWritten: String(args.content).length };
    },
  },
  {
    name: 'shell_exec',
    description: 'Execute a shell command inside the sandboxed workspace. Requires approval.',
    category: 'shell',
    requiresApproval: true,
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command line.' },
        timeoutMs: { type: 'number', description: 'Optional timeout (default 15000).' },
      },
      required: ['command'],
    },
    async execute(args) {
      await ensureWorkspace();
      const timeout = Number(args.timeoutMs) || 15_000;
      try {
        const { stdout, stderr } = await execAsync(String(args.command), {
          cwd: WORKSPACE_ROOT,
          timeout,
          maxBuffer: 1024 * 1024,
        });
        return { ok: true, stdout: stdout.slice(0, 50_000), stderr: stderr.slice(0, 10_000) };
      } catch (err: unknown) {
        const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
        return {
          ok: false,
          exitCode: e.code ?? null,
          stdout: (e.stdout ?? '').slice(0, 50_000),
          stderr: (e.stderr ?? '').slice(0, 10_000),
          error: e.message ?? 'execution failed',
        };
      }
    },
  },
  {
    name: 'http_request',
    description: 'Issue an HTTP request (GET/POST/PUT/DELETE) with optional headers and JSON body.',
    category: 'web',
    requiresApproval: false,
    schema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        url: { type: 'string' },
        headers: { type: 'object' },
        body: {},
      },
      required: ['method', 'url'],
    },
    async execute(args) {
      const method = String(args.method || 'GET').toUpperCase();
      const headers = (args.headers as Record<string, string>) || {};
      const init: RequestInit = { method, headers };
      if (args.body !== undefined && method !== 'GET' && method !== 'HEAD') {
        init.body = typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
        if (!headers['content-type'] && !headers['Content-Type']) {
          (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }
      }
      const res = await fetch(String(args.url), init);
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type') ?? null,
        body: text.slice(0, 50_000),
      };
    },
  },
];

const TOOL_REGISTRY = new Map(BUILTIN_TOOLS.map((t) => [t.name, t] as const));

export function getBuiltinTool(name: string): BuiltinTool | undefined {
  return TOOL_REGISTRY.get(name);
}

export function listBuiltinTools(): BuiltinTool[] {
  return [...BUILTIN_TOOLS];
}
