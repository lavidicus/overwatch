"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

export type SearchResult = {
  id: string;
  title: string;
  slug: string[];
  section: string;
  tags: string[];
  type: "markdown" | "pdf";
  updatedAt: number;
  excerpt?: string;
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  const hasResults = results.length > 0;

  return (
    <div className="relative w-full">
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search docs..."
        className="w-full rounded-md border border-[var(--notion-border)] bg-white/70 px-3 py-2 text-sm text-[var(--notion-text)] placeholder:text-[var(--notion-secondary)] focus:border-[var(--notion-accent)] focus:outline-none dark:bg-[var(--notion-hover)]"
      />
      {open && (query.trim() || hasResults) && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-md border border-[var(--notion-border)] bg-[var(--notion-bg)] p-2 shadow-xl">
          {hasResults ? (
            <ul className="space-y-2">
              {results.map((result) => {
                const encoded = result.slug
                  .map((part) => encodeURIComponent(part))
                  .join("/");
                const href =
                  result.type === "pdf"
                    ? `/file/${encoded}`
                    : `/docs/${encoded}`;
                return (
                  <li key={result.id}>
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(
                        "block rounded px-2 py-2 text-sm text-[var(--notion-text)] hover:bg-[var(--notion-hover)]"
                      )}
                    >
                      <div className="font-semibold">{result.title}</div>
                      {result.excerpt && (
                        <div className="text-xs text-[var(--notion-secondary)]">
                          {result.excerpt}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-2 py-4 text-center text-xs text-[var(--notion-secondary)]">
              No results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
