import Link from "next/link";
import { getAllDocs, getSectionConfig } from "@/lib/content";

export const dynamic = "force-dynamic";

const SECTION_COVER: Record<string, string> = {
  playbooks: "from-blue-100 via-blue-50 to-transparent dark:from-blue-900/40 dark:via-blue-900/10",
  pkb: "from-purple-100 via-purple-50 to-transparent dark:from-purple-900/40 dark:via-purple-900/10",
  concepts: "from-emerald-100 via-emerald-50 to-transparent dark:from-emerald-900/40 dark:via-emerald-900/10",
  manuals: "from-amber-100 via-amber-50 to-transparent dark:from-amber-900/40 dark:via-amber-900/10",
};

export default async function Home() {
  const docs = await getAllDocs();
  const sections = getSectionConfig();

  const stats = Object.entries(sections).map(([key, value]) => {
    const sectionDocs = docs.filter((doc) => doc.section === key);
    return { key, title: value.title, total: sectionDocs.length };
  });

  const recent = [...docs]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);

  const totalDocs = docs.length;

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="h-20 w-full rounded-lg bg-gradient-to-r from-slate-100 via-slate-50 to-transparent dark:from-slate-800/60 dark:via-slate-900/20" />
        <h1 className="text-[2.25rem] font-bold">Workspace Wiki</h1>
        <p className="text-[var(--notion-secondary)]">
          {totalDocs} documents across {Object.keys(sections).length} sections.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.key}
            className="rounded-lg border border-[var(--notion-border)] bg-[var(--notion-sidebar)] p-4"
          >
            <div className="text-2xl font-semibold">{s.total}</div>
            <div className="text-sm text-[var(--notion-secondary)]">{s.title}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recently Updated</h2>
        <div className="rounded-lg border border-[var(--notion-border)] bg-[var(--notion-bg)]">
          <ul className="divide-y divide-[var(--notion-border)]">
            {recent.map((doc) => {
              const encoded = doc.slug.map(encodeURIComponent).join("/");
              const href =
                doc.type === "pdf" ? `/file/${encoded}` : `/docs/${encoded}`;
              return (
                <li key={doc.id}>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--notion-hover)]"
                  >
                    <span className="text-sm">
                      {doc.type === "pdf" ? "📄" : "📝"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-[var(--notion-accent)]">
                        {doc.title}
                      </div>
                      <div className="text-xs text-[var(--notion-secondary)]">
                        {sections[doc.section]?.title ?? doc.section}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--notion-secondary)]">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stats.map((s) => (
          <div
            key={`cover-${s.key}`}
            className="rounded-lg border border-[var(--notion-border)] bg-[var(--notion-bg)] p-4"
          >
            <div
              className={`h-12 w-full rounded-md bg-gradient-to-r ${
                SECTION_COVER[s.key] ?? "from-slate-100 via-slate-50 to-transparent"
              }`}
            />
            <div className="mt-3 text-sm font-semibold">{s.title}</div>
            <p className="text-xs text-[var(--notion-secondary)]">
              Browse {s.total} documents in this section from the sidebar.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
