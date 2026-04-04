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
    <div className="rounded-lg border border-slate-800 bg-[#111122] p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        On this page
      </div>
      <ul className="space-y-1 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: `${Math.min(item.level * 8, 32)}px` }}>
            <Link href={`#${item.id}`} className="hover:text-slate-100">
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
