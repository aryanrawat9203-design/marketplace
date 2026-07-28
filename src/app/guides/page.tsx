import Link from "next/link";
import type { Metadata } from "next";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description: "Guides for choosing, importing, and getting the most out of n8n workflow templates.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Get unstuck</p>
      <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-ink">Guides</h1>
      <p className="mt-3 text-muted">
        Practical guides for picking, importing, and getting the most out of n8n workflow templates.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {guides.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="card card-hover group flex flex-col p-5">
            <h2 className="font-sans font-semibold text-ink group-hover:text-white">{g.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{g.description}</p>
            <div className="link-arrow mt-3">
              Read guide <span className="arrow">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
