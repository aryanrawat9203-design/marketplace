import Link from "next/link";
import type { Metadata } from "next";
import { getCollections, collectionStats } from "@/lib/collections";
import { inr } from "@/lib/pricing";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Curated collections",
  description:
    "Hand-assembled packs of the most in-demand n8n workflow templates - agency starter kits, lead gen pipelines, inbox automation and more. Add a whole collection to your cart in one click.",
  alternates: { canonical: "/collections" },
};

export default function CollectionsPage() {
  const collections = getCollections();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
  ]);
  const base = baseUrl();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Curated collections",
    itemListElement: collections.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/collections/${c.slug}`,
      name: c.name,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />
      <p className="eyebrow">Hand-assembled packs</p>
      <h1 className="mt-2.5 text-2xl font-semibold text-ink sm:text-3xl">Curated collections</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-faint">
        Opinionated starting points, assembled from the catalog&apos;s highest-demand templates.
        One click adds the whole pack to your cart - one payment, one ZIP.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => {
          const stats = collectionStats(c);
          return (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="card card-hover group flex flex-col p-5">
              <div
                aria-hidden="true"
                className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.gradient} font-display text-sm font-bold text-white shadow-lg`}
              >
                {c.name.charAt(0)}
              </div>
              <h2 className="mt-4 font-sans font-semibold text-ink group-hover:text-white">{c.name}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{c.tagline}</p>
              <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.06] pt-3">
                <span className="font-mono text-xs text-faint">{stats.count} templates</span>
                <span className="text-sm">
                  <b className="font-display tracking-tight text-ink">{inr(stats.price)}</b>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
