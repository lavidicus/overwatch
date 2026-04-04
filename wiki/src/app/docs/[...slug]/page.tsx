import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Toc, { TocItem } from "@/components/Toc";
import { getDocBySlug, getRawMarkdown, getSectionConfig, slugifyHeading } from "@/lib/content";

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

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  if (!doc) return notFound();
  if (doc.type === "pdf") {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: doc.title }]}
        />
        <h1 className="text-2xl font-semibold">{doc.title}</h1>
        <p className="text-slate-300">
          This manual is a PDF. Open it directly:
        </p>
        <a
          href={`/file/${doc.slug.join("/")}`}
          className="text-[#3498db] hover:underline"
        >
          Open {doc.title}
        </a>
      </div>
    );
  }
  const { content } = await getRawMarkdown(doc.filePath);
  const toc = buildToc(content);
  const sectionTitle = getSectionConfig()[doc.section]?.title ?? doc.section;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <article>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: sectionTitle },
            { label: doc.title },
          ]}
        />
        <h1 className="mt-3 text-3xl font-semibold">{doc.title}</h1>
        {doc.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
            {doc.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-700 px-2 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="prose prose-invert mt-6 max-w-none">
          <MarkdownRenderer content={content} />
        </div>
      </article>
      <aside className="hidden lg:block">
        <Toc items={toc} />
      </aside>
    </div>
  );
}
