"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import { NavItem, SectionKey } from "@/lib/content";

type Props = {
  nav: Record<SectionKey, NavItem[]>;
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const SECTION_META: { key: SectionKey; label: string; icon: string }[] = [
  { key: "playbooks", label: "Playbooks", icon: "📋" },
  { key: "pkb", label: "PKB Resources", icon: "📄" },
  { key: "concepts", label: "Concepts", icon: "💡" },
  { key: "manuals", label: "System Manuals", icon: "🛠️" },
];

const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

function getHref(item: NavItem) {
  if (!item.slug) return "#";
  const encoded = item.slug.map((part) => encodeURIComponent(part)).join("/");
  return item.type === "pdf" ? `/file/${encoded}` : `/docs/${encoded}`;
}

function TreeNode({
  item,
  depth,
  sectionKey,
  expanded,
  onToggle,
  activePath,
  collapsed,
}: {
  item: NavItem;
  depth: number;
  sectionKey: SectionKey;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  activePath: string;
  collapsed: boolean;
}) {
  const key = `${sectionKey}/${item.title}/${depth}`;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isOpen = expanded[key] ?? true;
  const href = getHref(item);
  const isActive = href !== "#" && activePath === href;
  const leafIcon = sectionKey === "playbooks" ? "📋" : "📄";

  return (
    <div>
      <div
        className={clsx(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-[var(--notion-hover)] text-[var(--notion-text)]"
            : "text-[var(--notion-secondary)] hover:bg-[var(--notion-hover)] hover:text-[var(--notion-text)]"
        )}
        style={{ paddingLeft: collapsed ? 8 : depth * 14 + 8 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(key)}
            className="text-xs text-[var(--notion-secondary)]"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "▼" : "▶"}
          </button>
        ) : (
          <span className="text-xs text-[var(--notion-secondary)]">•</span>
        )}
        {!collapsed && (
          <span className="text-xs">{item.type === "pdf" ? "📄" : leafIcon}</span>
        )}
        {item.slug ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate"
          >
            {item.title}
          </Link>
        ) : (
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--notion-text)]">
            {item.title}
          </span>
        )}
      </div>
      {hasChildren && isOpen && !collapsed && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <TreeNode
              key={`${key}/${child.title}`}
              item={child}
              depth={depth + 1}
              sectionKey={sectionKey}
              expanded={expanded}
              onToggle={onToggle}
              activePath={activePath}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  nav,
  collapsed,
  expanded,
  onToggle,
}: {
  nav: Record<SectionKey, NavItem[]>;
  collapsed: boolean;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className={clsx("px-3 pb-2", collapsed && "hidden")}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Workspace Wiki</div>
          <ThemeToggle compact />
        </div>
        <SearchBar />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-6">
        <div className="space-y-4">
          {SECTION_META.map((section) => {
            const sectionKey = `section-${section.key}`;
            const isOpen = expanded[sectionKey] ?? true;
            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => onToggle(sectionKey)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--notion-secondary)] hover:bg-[var(--notion-hover)]"
                >
                  <span className="text-[10px]">{isOpen ? "▼" : "▶"}</span>
                  <span>{section.icon}</span>
                  {!collapsed && <span>{section.label}</span>}
                </button>
                {isOpen && !collapsed && (
                  <div className="mt-2 space-y-1">
                    {(nav[section.key] || []).map((item) => (
                      <TreeNode
                        key={`${section.key}-${item.title}`}
                        item={item}
                        depth={1}
                        sectionKey={section.key}
                        expanded={expanded}
                        onToggle={onToggle}
                        activePath={pathname}
                        collapsed={collapsed}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ nav, className, mobileOpen, onMobileClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(280);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "section-playbooks": true,
    "section-pkb": true,
  });

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: MouseEvent) => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX));
      setWidth(next);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const computedWidth = collapsed ? 56 : width;

  return (
    <>
      <aside
        className={clsx(
          "relative hidden h-screen flex-shrink-0 border-r border-[var(--notion-border)] bg-[var(--notion-sidebar)] md:flex",
          className
        )}
        style={{ width: computedWidth }}
      >
        <SidebarContent
          nav={nav}
          collapsed={collapsed}
          expanded={expanded}
          onToggle={toggleExpanded}
        />
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute bottom-4 right-2 rounded-md px-2 py-1 text-xs text-[var(--notion-secondary)] hover:bg-[var(--notion-hover)]"
        >
          {collapsed ? "→" : "←"}
        </button>
        {!collapsed && (
          <div
            role="presentation"
            onMouseDown={() => setDragging(true)}
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent"
          />
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
          />
          <div className="absolute left-0 top-0 h-full w-[80%] max-w-xs border-r border-[var(--notion-border)] bg-[var(--notion-sidebar)] p-2 shadow-xl">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">Workspace Wiki</span>
              <button
                type="button"
                onClick={onMobileClose}
                className="rounded-md px-2 py-1 text-sm text-[var(--notion-secondary)] hover:bg-[var(--notion-hover)]"
              >
                ✕
              </button>
            </div>
            <SidebarContent
              nav={nav}
              collapsed={false}
              expanded={expanded}
              onToggle={toggleExpanded}
            />
          </div>
        </div>
      )}
    </>
  );
}
