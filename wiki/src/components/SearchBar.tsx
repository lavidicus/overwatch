"use client";

import { useEffect, useMemo, useState } from "react";
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
    <div className="relative w-full max-w-xl">
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search docs..."
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#3498db] focus:outline-none"
      />
      {open && (query.trim() || hasResults) && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-md border border-slate-800 bg-[#0f0f1c] p-2 shadow-xl">
          {hasResults ? (
            <ul className="space-y-2">
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    href={
                      result.type === "pdf"
                        ? `/file/${result.slug.join("/")}`
                        : `/docs/${result.slug.join("/")}`
                    }
                    className={clsx(
                      "block rounded px-2 py-2 text-sm text-slate-100 hover:bg-slate-800"
                    )}
                  >
                    <div className="font-semibold">{result.title}</div>
                    {result.excerpt && (
                      <div className="text-xs text-slate-400">
                        {result.excerpt}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-2 py-4 text-center text-xs text-slate-400">
              No results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
