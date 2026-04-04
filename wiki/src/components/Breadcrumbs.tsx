import Link from "next/link";

export type Crumb = { label: string; href?: string };

type Props = {
  items: Crumb[];
};

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav className="text-xs text-slate-400">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.href ? (
              <Link href={item.href} className="hover:text-slate-200">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-200">{item.label}</span>
            )}
            {index < items.length - 1 && <span>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
