import Link from "next/link";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

type Props = {
  items: TocItem[];
};

export default function Toc({ items }: Props) {
  if (!items.length) return null;
  return (
    <div className="sticky top-24 rounded-lg border border-[var(--notion-border)] bg-[var(--notion-sidebar)] p-4 text-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--notion-secondary)]">
        On this page
      </div>
      <ul className="space-y-1 text-[var(--notion-secondary)]">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${Math.min(item.level * 8, 32)}px` }}
          >
            <Link
              href={`#${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--notion-text)]"
            >
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
