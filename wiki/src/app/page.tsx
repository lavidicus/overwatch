import Link from "next/link";
import { getAllDocs, getSectionConfig } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const docs = await getAllDocs();
  const sections = getSectionConfig();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Workspace Wiki</h1>
        <p className="mt-2 text-slate-300">
          Operational playbooks, knowledge base resources, and system manuals.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(sections).map(([key, value]) => {
          const sectionDocs = docs.filter((doc) => doc.section === key);
          return (
            <div
              key={key}
              className="rounded-lg border border-slate-800 bg-[#121226] p-4"
            >
              <div className="text-lg font-semibold text-slate-100">
                {value.title}
              </div>
              <div className="text-xs text-slate-400">
                {sectionDocs.length} documents
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {sectionDocs.slice(0, 4).map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={
                        doc.type === "pdf"
                          ? `/file/${doc.slug.join("/")}`
                          : `/docs/${doc.slug.join("/")}`
                      }
                      className="text-[#3498db] hover:underline"
                    >
                      {doc.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
