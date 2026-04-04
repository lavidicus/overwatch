import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-[var(--notion-secondary)]">
        We couldn&apos;t find that document.
      </p>
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--notion-accent)] hover:underline"
      >
        Go back home
      </Link>
    </div>
  );
}
