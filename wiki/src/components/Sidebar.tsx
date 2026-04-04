"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NavItem, SectionKey } from "@/lib/content";
import clsx from "clsx";

const SECTION_TITLES: Record<SectionKey, string> = {
  playbooks: "Playbooks",
  pkb: "PKB Resources",
  concepts: "Concepts",
  manuals: "System Manuals",
};

type Props = {
  nav: Record<SectionKey, NavItem[]>;
  className?: string;
};

function NavTree({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        return (
          <li key={`${item.title}-${item.slug?.join("/") || "group"}`}>
            {item.slug ? (
              <Link
                href={
                  item.type === "pdf"
                    ? `/file/${item.slug.join("/")}`
                    : `/docs/${item.slug.join("/")}`
                }
                className="block rounded px-2 py-1 text-sm text-slate-200 hover:bg-slate-800"
              >
                {item.title}
              </Link>
            ) : (
              <div className="px-2 py-1 text-xs uppercase tracking-wide text-slate-400">
                {item.title}
              </div>
            )}
            {hasChildren && (
              <div className="ml-3 border-l border-slate-700 pl-2">
                <NavTree items={item.children!} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar({ nav, className }: Props) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    playbooks: true,
    pkb: true,
    concepts: true,
    manuals: true,
  });

  const sections = useMemo(() => Object.keys(nav) as SectionKey[], [nav]);

  return (
    <aside className={clsx("h-full w-full overflow-y-auto border-r border-slate-800 bg-[#141425] p-4", className)}>
      {sections.map((key) => (
        <div key={key} className="mb-4">
          <button
            type="button"
            onClick={() =>
              setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            className={clsx(
              "flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-slate-800",
              openSections[key] && "bg-slate-900"
            )}
          >
            <span>{SECTION_TITLES[key]}</span>
            <span className="text-xs text-slate-400">
              {openSections[key] ? "−" : "+"}
            </span>
          </button>
          {openSections[key] && (
            <div className="mt-2">
              <NavTree items={nav[key] || []} />
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
