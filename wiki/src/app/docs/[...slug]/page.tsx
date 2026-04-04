import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Toc, { TocItem } from "@/components/Toc";
import {
  getDocBySlug,
  getRawMarkdown,
  getSectionConfig,
  slugifyHeading,
} from "@/lib/content";

export const dynamic = "force-dynamic";

function buildToc(content: string): TocItem[] {
  const lines = content.split("\n");
  const items: TocItem[] = [];
  lines.forEach((line) => {
    const match = /^(#{2,4})\s+(.+)$/.exec(line.trim());
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      items.push({
        id: slugifyHeading(text),
        text,
        level: level - 1,
      });
    }
  });
  return items;
}

const SECTION_COVER: Record<string, string> = {
  playbooks: "from-blue-100 via-blue-50 to-transparent dark:from-blue-900/40 dark:via-blue-900/10",
  pkb: "from-purple-100 via-purple-50 to-transparent dark:from-purple-900/40 dark:via-purple-900/10",
  concepts: "from-emerald-100 via-emerald-50 to-transparent dark:from-emerald-900/40 dark:via-emerald-900/10",
  manuals: "from-amber-100 via-amber-50 to-transparent dark:from-amber-900/40 dark:via-amber-900/10",
};

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  if (!doc) return notFound();

  const sectionTitle = getSectionConfig()[doc.section]?.title ?? doc.section;
  const updated = new Date(doc.updatedAt).toLocaleDateString();
  const cover = SECTION_COVER[doc.section] ?? "from-slate-100 via-slate-50 to-transparent";

  if (doc.type === "pdf") {
    return (
      <div className="space-y-6">
        <div className={`h-20 w-full rounded-lg bg-gradient-to-r ${cover}`} />
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: doc.title }]}
        />
        <div>
          <h1 className="mt-2 text-[2.25rem] font-bold">{doc.title}</h1>
          <p className="mt-2 text-sm text-[var(--notion-secondary)]">
            Last updated {updated}
          </p>
        </div>
        <p className="text-[var(--notion-secondary)]">
          This manual is a PDF. Open it directly:
        </p>
        <a
          href={`/file/${doc.slug.map(encodeURIComponent).join("/")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--notion-accent)] hover:underline"
        >
          Open {doc.title}
        </a>
      </div>
    );
  }

  const { content } = await getRawMarkdown(doc.filePath);
  const toc = buildToc(content);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_280px]">
      <article className="min-w-0 overflow-hidden">
        <div className={`h-20 w-full rounded-lg bg-gradient-to-r ${cover}`} />
        <div className="mt-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: sectionTitle, href: "/" },
              { label: doc.title },
            ]}
          />
          <h1 className="mt-3 text-[2.25rem] font-bold">{doc.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--notion-secondary)]">
            <span>Last updated {updated}</span>
            {doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--notion-border)] px-2 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-8">
          <MarkdownRenderer content={content} />
        </div>
      </article>
      <aside className="hidden xl:block">
        <Toc items={toc} />
      </aside>
    </div>
  );
}
