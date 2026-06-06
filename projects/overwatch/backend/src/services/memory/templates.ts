/**
 * Prompt templates for injecting RAG memory into agent chats.
 */

export interface MemoryContextItem {
  title?: string;
  category: string;
  content: string;
  score?: number;
}

export const MEMORY_CONTEXT_HEADER =
  'Relevant context retrieved from your long-term memory store. Use it when answering the user; if it conflicts with the user\'s latest message, prefer the latest message but mention the discrepancy.';

export function renderMemoryContext(items: MemoryContextItem[]): string {
  if (!items.length) return '';
  const blocks = items.map((item, idx) => {
    const score = typeof item.score === 'number' ? ` (relevance ${item.score.toFixed(2)})` : '';
    const title = item.title ? ` — ${item.title}` : '';
    return `[${idx + 1}] [${item.category}]${title}${score}\n${item.content.trim()}`;
  });
  return `${MEMORY_CONTEXT_HEADER}\n\n${blocks.join('\n\n')}`;
}
