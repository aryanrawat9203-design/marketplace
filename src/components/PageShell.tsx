import Link from "next/link";
import { ReactNode } from "react";

export default function PageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <span className="text-zinc-400">{title}</span>
      </nav>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-50">{title}</h1>
      {updated && <p className="mt-1 text-sm text-zinc-500">Last updated: {updated}</p>}
      <div className="mt-8 leading-relaxed text-zinc-300 [&_a]:text-violet-400 hover:[&_a]:text-violet-300 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_li]:mt-1.5 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
