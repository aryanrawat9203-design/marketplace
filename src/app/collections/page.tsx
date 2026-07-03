import Link from "next/link";
import type { Metadata } from "next";
import { getCollections, collectionStats } from "@/lib/collections";
import { inr } from "@/lib/pricing";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Curated collections",
  description:
    "Hand-assembled packs of the most in-demand n8n workflow templates - agency starter kits, lead gen pipelines, inbox automation and more. Add a whole collection to your cart in one click.",
};

export default function CollectionsPage() {
  const collections = getCollections();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <h1 className="text-2xl font-semibold text-zinc-100">Curated collections</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Opinionated starting points, assembled from the catalog&apos;s highest-demand templates.
        One click adds the whole pack to your cart - one payment, one ZIP.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => {
          const stats = collectionStats(c);
          return (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="group flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 card-hover hover:border-violet-500/50"
            >
              <div className={`h-20 rounded-t-2xl bg-gradient-to-br ${c.gradient}`} />
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-semibold text-zinc-100 group-hover:text-white">{c.name}</h2>
                <p className="mt-1 flex-1 text-sm text-zinc-400">{c.tagline}</p>
                <div className="mt-4 flex items-baseline justify-between border-t border-zinc-800/70 pt-3">
                  <span className="text-xs text-zinc-500">{stats.count} templates</span>
                  <span className="text-sm">
                    <b className="text-zinc-100">{inr(stats.price)}</b>{" "}
                    {stats.mrp > stats.price && (
                      <span className="text-xs text-zinc-500 line-through">{inr(stats.mrp)}</span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
