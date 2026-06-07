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
      const query = String(args.query);
      const count = Math.min(Math.max(1, Number(args.count) || 5), 10);
      
      // Try to use OpenClaw gateway if available
      const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
      const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
      
      try {
        // Attempt to call OpenClaw's web_search tool via gateway
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (gatewayToken) {
          headers['Authorization'] = `Bearer ${gatewayToken}`;
        }
        
        const res = await fetch(`${gatewayUrl}/api/tools/web_search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, count }),
        });
        
        if (res.ok) {
          const data = await res.json() as { results?: Array<{ title?: string; url?: string; snippet?: string } | string> };
          return {
            ok: true,
            query,
            results: data.results || [],
            source: 'openclaw',
          };
        }
      } catch (err) {
        // Fall through to direct search
      }
      
      // Fallback 1: Use Brave Search API (if key configured)
      if (process.env.BRAVE_SEARCH_API_KEY) {
        try {
          const res = await fetch('https://api.search.brave.com/res/v1/web/search', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
            },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const data = await res.json() as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } };
            const results: Array<{ title: string; url: string; snippet: string }> = (data.web?.results || []).slice(0, count).map(r => ({
              title: r.title || '',
              url: r.url || '',
              snippet: r.description || '',
            }));
            return { ok: true, query, results, source: 'brave' };
          }
        } catch {
          // Fall through to Bing
        }
      }
      
      // Fallback 2: Use Bing (no API key needed for basic web scraping)
      try {
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${count}`;
        const res = await fetch(bingUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        
        // Extract result blocks: <h2><a href=...>Title</a></h2> + <p>Snippet</p>
        // Find all h2 result links
        const h2Links = html.match(/<h2[^>]*class="[^"]*rll__link[^\"]*"[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a><\/h2>/gi) || [];
        const h2Simple = html.match(/<h2[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a><\/h2>/gi) || [];
        
        // Try rll__link class first, fall back to any h2 with link
        const allLinks = h2Links.length > 0 ? h2Links : h2Simple;
        for (const h2 of allLinks) {
          if (results.length >= count) break;
          // Extract href
          const hrefMatch = h2.match(/href="([^"]+)"/i);
          if (!hrefMatch) continue;
          const url = hrefMatch[1];
          // Extract title
          const titleMatch = h2.match(/href="[^"]+"[^>]*>([^<]*)<\/a>/i);
          if (!titleMatch) continue;
          const title = titleMatch[1].trim();
          // Skip navigation/footer links
          if (['About', 'Advertising', 'Business', 'Privacy', 'Terms', 'Settings'].includes(title)) continue;
          
          // Extract snippet: find <p class="alc"...> or <span class="...">...</span> after the h2
          const idx = html.indexOf(h2);
          const after = html.substring(idx);
          const snippetMatch = after.match(/<[ps][^>]*class="[^"]*alc[^\"]*"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)/i);
          if (snippetMatch) {
            results.push({ title, url, snippet: snippetMatch[1].replace(/<[^>]+>/g, '').trim() });
          }
        }
        
        if (results.length > 0) {
          return { ok: true, query, results, source: 'bing' };
        }
      } catch {
        // Fall through to DuckDuckGo
      }
      
      // Fallback 3: Simple text-based Bing scraping
      try {
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(bingUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        
        // Very basic: extract all h2 > a links and their following text
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        const blocks = html.split(/<h2[^>]*>/i);
        for (const block of blocks.slice(1)) {
          if (results.length >= count) break;
          const urlMatch = block.match(/href="([^"]+)"/);
          const titleMatch = block.match(/href="[^"]+"[^>]*>([^<]*)<\/a>/);
          if (!urlMatch || !titleMatch) continue;
          const url = urlMatch[1];
          const title = titleMatch[1].trim();
          // Get snippet from next h2/p tags
          const snippetMatch = block.match(/class="[^\"]*alc[^\"]*"[^>]*>([^<]*)<\/?[ps]/i);
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
          if (title && !['About','Advertising','Business','Privacy','Terms','Settings','Help','Feedback'].includes(title)) {
            results.push({ title, url, snippet });
          }
        }
        
        if (results.length > 0) {
          return { ok: true, query, results, source: 'bing-text' };
        }
      } catch {
        // All search backends failed
      }
      
      // Ultimate fallback: return error so the model knows it couldn't search
      
      try {
        // Attempt to call OpenClaw's web_search tool via gateway
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (gatewayToken) {
          headers['Authorization'] = `Bearer ${gatewayToken}`;
        }
        
        const res = await fetch(`${gatewayUrl}/api/tools/web_search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, count }),
        });
        
        if (res.ok) {
          const data = await res.json() as { results?: Array<{ title?: string; url?: string; snippet?: string } | string> };
          return {
            ok: true,
            query,
            results: data.results || [],
            source: 'openclaw',
          };
        }
      } catch (err) {
        // Fall through to direct search
      }
      
      // Fallback: Use DuckDuckGo HTML search (no API key needed)
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=wt-wt`;
        const res = await fetch(ddgUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OverwatchToolBot/1.0)' },
        });
        const html = await res.text();
        
        // Parse results from DuckDuckGo HTML
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        const resultRegex = /<a class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet" [^>]*>([^<]*(?:<[^>]+>[^<]*)*)</g;
        let match;
        let i = 0;
        while ((match = resultRegex.exec(html)) && i < count) {
          i++;
          results.push({
            title: match[2],
            url: match[1],
            snippet: match[3].replace(/<[^>]+>/g, ''),
          });
        }
        
        return {
          ok: true,
          query,
          results,
          source: 'duckduckgo',
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Search failed',
          query,
          results: [],
        };
      }
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
