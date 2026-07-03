import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection, getCollections, collectionMembers, collectionStats } from "@/lib/collections";
import { bundleForCategory } from "@/lib/bundles";
import WorkflowCard from "@/components/WorkflowCard";
import AddCollectionToCart from "@/components/AddCollectionToCart";
import TrustStrip from "@/components/TrustStrip";
import { inr } from "@/lib/pricing";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

export function generateStaticParams() {
  return getCollections().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCollection(slug);
  if (!c) return { title: "Collection not found" };
  return {
    title: `${c.name} - curated n8n templates`,
    description: `${c.tagline} ${collectionStats(c).count} ready-to-import n8n workflow templates, added to your cart in one click.`,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCollection(slug);
  if (!c) notFound();

  const members = collectionMembers(c);
  const stats = collectionStats(c);
  const singleCategory = c.rule.categories?.length === 1 ? c.rule.categories[0] : undefined;
  const catBundle = singleCategory ? bundleForCategory(singleCategory) : undefined;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: c.name, path: `/collections/${c.slug}` },
  ]);
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.name,
    numberOfItems: members.length,
    itemListElement: members.map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: w.title,
      url: `${baseUrl()}/workflows/${w.route}`,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemListJsonLd} />

      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/collections" className="hover:text-zinc-300">Collections</Link>
        <span className="mx-1">/</span>
        <span className="text-zinc-400">{c.name}</span>
      </nav>

      <div className={`mt-4 overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-[1px]`}>
        <div className="rounded-2xl bg-[#0b0b11] p-6 sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">{c.name}</h1>
          <p className="mt-2 max-w-2xl text-lg text-zinc-400">{c.tagline}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">{c.description}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-2xl font-extrabold text-zinc-50">{inr(stats.price)}</span>
            {stats.mrp > stats.price && (
              <>
                <span className="text-zinc-500 line-through">{inr(stats.mrp)}</span>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  You save {inr(stats.mrp - stats.price)}
                </span>
              </>
            )}
            <span className="text-sm text-zinc-500">{stats.count} templates</span>
          </div>

          <div className="mt-5">
            <AddCollectionToCart
              lines={members.map((w) => ({
                kind: "workflow" as const,
                key: w.route,
                name: w.title,
                price: w.price,
                mrp: w.mrp,
              }))}
            />
            <TrustStrip />
          </div>
        </div>
      </div>

      {catBundle && (
        <Link
          href={`/bundles/${catBundle.slug}`}
          className="mt-4 block rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 hover:border-violet-500/60"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-300">
            Want everything in this area?
          </span>
          <span className="mt-1 block text-sm text-zinc-300">
            The full <b className="text-zinc-100">{catBundle.category}</b> bundle has all{" "}
            <b className="text-zinc-100">{catBundle.count.toLocaleString("en-IN")}</b> templates for{" "}
            <b className="text-zinc-100">{inr(catBundle.price)}</b>{" "}
            <span className="text-zinc-500 line-through">{inr(catBundle.mrp)}</span>
          </span>
        </Link>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-100">What&apos;s in this collection</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Selected from the catalog&apos;s highest-demand templates in this area. Every one is also
          available individually.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6">
        <div>
          <h2 className="font-semibold text-zinc-100">Ready to automate?</h2>
          <p className="mt-1 text-sm text-zinc-500">
            One payment, one ZIP with all {stats.count} ready-to-import JSON files.
          </p>
        </div>
        <AddCollectionToCart
          lines={members.map((w) => ({
            kind: "workflow" as const,
            key: w.route,
            name: w.title,
            price: w.price,
            mrp: w.mrp,
          }))}
        />
      </div>
    </div>
  );
}
