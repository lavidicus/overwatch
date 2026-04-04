import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-slate-300">We couldn&apos;t find that document.</p>
      <Link href="/" className="text-[#3498db] hover:underline">
        Go back home
      </Link>
    </div>
  );
}
