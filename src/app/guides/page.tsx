import Link from "next/link";
import type { Metadata } from "next";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description: "Guides for choosing, importing, and getting the most out of n8n workflow templates.",
};

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Guides</h1>
      <p className="mt-3 text-zinc-400">
        Practical guides for picking, importing, and getting the most out of n8n workflow templates.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {guides.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 card-hover hover:border-violet-500/50 hover:bg-zinc-900/70"
          >
            <h2 className="font-semibold text-zinc-100 group-hover:text-white">{g.title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{g.description}</p>
            <div className="mt-3 text-sm font-medium text-violet-400 group-hover:text-violet-300">
              Read guide &rarr;
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
