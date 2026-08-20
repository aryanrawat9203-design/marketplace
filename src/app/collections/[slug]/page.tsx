import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection, getCollections, collectionMembers, collectionStats } from "@/lib/collections";
import { bundleForCategory } from "@/lib/bundles";
import { bundleUpsell } from "@/lib/cart-upsell";
import WorkflowCard from "@/components/WorkflowCard";
import AddCollectionToCart from "@/components/AddCollectionToCart";
import BundleUpsellNote from "@/components/BundleUpsellNote";
import TrustStrip from "@/components/TrustStrip";
import { inr } from "@/lib/pricing";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
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
    alternates: { canonical: `/collections/${c.slug}` },
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
  // A collection is priced as the honest sum of its members, which since the
  // catalog-derived repricing can exceed the bundle those members came from.
  // Say so here rather than let a shopper find it themselves and conclude the
  // per-template prices are made up.
  const upsell = bundleUpsell(members.map((w) => ({ kind: "workflow" as const, key: w.route })));

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

      <nav className="text-xs text-faint">
        <Link href="/" className="hover:text-body">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/collections" className="hover:text-body">Collections</Link>
        <span className="mx-1">/</span>
        <span className="text-muted">{c.name}</span>
      </nav>

      <div className={`relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-[1px]`}>
        <div className="relative rounded-[15px] bg-surface-1 p-6 sm:p-8">
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-gradient-to-br ${c.gradient} opacity-[0.12] blur-3xl`}
          />
          <h1 className="text-3xl font-bold tracking-tight text-ink">{c.name}</h1>
          <p className="mt-2 max-w-2xl text-lg text-muted">{c.tagline}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-faint">{c.description}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-2xl font-bold tracking-tight text-ink">{inr(stats.price)}</span>
            <span className="text-sm text-faint">{stats.count} templates</span>
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

      {upsell && (
        <div className="mt-4">
          <BundleUpsellNote upsell={upsell} totalLabel={`These ${stats.count} individually`} />
        </div>
      )}

      {/* Only when there's no cheaper offer to make. This card names the
          category bundle unconditionally, which on an Email Automation
          collection meant advertising a 29,999 bundle directly beneath a
          24,999 Full Library offer that contains it - more money for less. */}
      {!upsell && catBundle && (
        <Link
          href={`/bundles/${catBundle.slug}`}
          className="card-hover mt-4 block rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5 hover:border-violet-500/60"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-300">
            Want everything in this area?
          </span>
          <span className="mt-1 block text-sm text-body">
            The full <b className="text-ink">{catBundle.category}</b>{" "}bundle has all{" "}
            <b className="text-ink">{catBundle.count.toLocaleString("en-IN")}</b>{" "}templates for{" "}
            <b className="text-ink">{inr(catBundle.price)}</b>
          </span>
        </Link>
      )}

      <Reveal className="mt-10">
        <h2 className="text-xl font-semibold text-ink">What&apos;s in this collection</h2>
        <p className="mt-1 text-sm text-faint">
          Selected from the catalog&apos;s highest-demand templates in this area. Every one is also
          available individually.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </Reveal>

      <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-semibold text-ink">Ready to automate?</h2>
          <p className="mt-1 text-sm text-faint">
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
