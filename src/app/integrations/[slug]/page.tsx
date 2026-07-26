import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getIndex, type IndexItem } from "@/lib/catalog";
import {
  getIntegrationBySlug,
  getIntegrationPairBySlug,
  canonicalPairSlug,
  relatedPairs,
  pairsForIntegration,
  type IntegrationPair,
} from "@/lib/integrations";
import WorkflowCard from "@/components/WorkflowCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

const fmt = (n: number) => n.toLocaleString("en-IN");

/** Templates that use both halves of a pair. */
function pairMatches(pair: IntegrationPair): IndexItem[] {
  return getIndex().filter(
    (w) => w.platforms.includes(pair.a.name) && w.platforms.includes(pair.b.name),
  );
}

function countBy(items: IndexItem[], key: "category" | "subcategory", limit: number) {
  const counts = new Map<string, number>();
  for (const w of items) {
    const v = w[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/** Dynamic share card for an integration or pair, via the shared /api/og renderer. */
function shareImage(title: string, count: number) {
  return `/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(`${fmt(count)} n8n templates`)}`;
}

function pairBrowseHref(pair: IntegrationPair) {
  return `/workflows?platform=${encodeURIComponent(pair.a.name)}&platform2=${encodeURIComponent(pair.b.name)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const pair = getIntegrationPairBySlug(slug);
  if (pair) {
    const title = `${pair.a.name} + ${pair.b.name} n8n integration templates`;
    const description = `${fmt(pair.count)} ready-to-import n8n workflow templates that connect ${pair.a.name} and ${pair.b.name}. Buy one template or a bundle, download the JSON, add your credentials and it runs - no code required.`;
    return {
      title,
      description,
      alternates: { canonical: `/integrations/${pair.slug}` },
      openGraph: {
        title,
        description,
        type: "website",
        url: `/integrations/${pair.slug}`,
        images: [shareImage(`${pair.a.name} + ${pair.b.name}`, pair.count)],
      },
    };
  }

  const integration = getIntegrationBySlug(slug);
  if (!integration) return { title: "Integration not found" };
  const title = `${integration.name} n8n workflow templates`;
  const description = `${fmt(integration.count)} original, ready-to-import n8n workflow templates that automate ${integration.name} - buy a single template or a bundle and download instantly.`;
  return {
    title,
    description,
    alternates: { canonical: `/integrations/${integration.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/integrations/${integration.slug}`,
      images: [shareImage(integration.name, integration.count)],
    },
  };
}

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // "discord-and-airtable" -> 301 to the canonical "airtable-and-discord"
  const canonical = canonicalPairSlug(slug);
  if (canonical) redirect(`/integrations/${canonical}`);

  const pair = getIntegrationPairBySlug(slug);
  if (pair) return <PairPage pair={pair} />;

  const integration = getIntegrationBySlug(slug);
  if (!integration) notFound();

  const matching = getIndex().filter((w) => w.platforms.includes(integration.name));
  const top = [...matching].sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0)).slice(0, 12);
  const topCategories = countBy(matching, "category", 8);

  // Pairs this integration is half of - internal links into the new pair pages.
  const pairsWithThis = pairsForIntegration(integration.slug, 12);

  const browseHref = `/workflows?platform=${encodeURIComponent(integration.name)}`;
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: integration.name, path: `/integrations/${integration.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/integrations" className="hover:text-zinc-300">Integrations</Link>
        <span className="mx-1">/</span>
        <span className="text-zinc-400">{integration.name}</span>
      </nav>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">
        {integration.name} <span className="gradient-text">n8n templates</span>
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-400">
        {fmt(integration.count)} original workflow templates use {integration.name}. Each one is a
        ready-to-import n8n JSON file - buy it, download it, add your {integration.name} credentials,
        and it runs.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={browseHref} className="btn-primary px-5 py-3">
          Browse all {fmt(integration.count)} templates
        </Link>
        <Link href="/bundles" className="btn-secondary px-5 py-3">
          View bundles &amp; pricing
        </Link>
      </div>

      {topCategories.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-100">Popular categories with {integration.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topCategories.map(([name, count]) => (
              <Link
                key={name}
                href={`/workflows?platform=${encodeURIComponent(integration.name)}&category=${encodeURIComponent(name)}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {name} <span className="text-zinc-500">({fmt(count)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Most popular {integration.name} templates</h2>
          <Link href={browseHref} className="link-arrow">
            View all <span className="arrow">&rarr;</span>
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {top.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </div>

      {pairsWithThis.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-100">
            Connect {integration.name} to another app
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Templates that wire {integration.name} up to the rest of your stack.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pairsWithThis.map((p) => {
              const other = p.a.slug === integration.slug ? p.b : p.a;
              return (
                <Link
                  key={p.slug}
                  href={`/integrations/${p.slug}`}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
                >
                  {integration.name} + {other.name}{" "}
                  <span className="text-zinc-500">({fmt(p.count)})</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-6">
        <div>
          <h2 className="font-semibold text-zinc-100">
            Need a {integration.name} workflow that isn&apos;t here?
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Describe it and get a fixed quote - custom-built, ready to import.
          </p>
        </div>
        <Link href="/custom" className="btn-primary px-5 py-2.5 text-sm">
          Request a custom build
        </Link>
      </div>
    </div>
  );
}

function PairPage({ pair }: { pair: IntegrationPair }) {
  const { a, b } = pair;
  const matching = pairMatches(pair);
  const top = [...matching].sort((x, y) => (y.demand ?? 0) - (x.demand ?? 0)).slice(0, 12);
  const topCategories = countBy(matching, "category", 8);
  const topSubcategories = countBy(matching, "subcategory", 6);
  const related = relatedPairs(pair, 12);
  const browseHref = pairBrowseHref(pair);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: `${a.name} + ${b.name}`, path: `/integrations/${pair.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/integrations" className="hover:text-zinc-300">Integrations</Link>
        <span className="mx-1">/</span>
        <span className="text-zinc-400">{a.name} + {b.name}</span>
      </nav>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">
        {a.name} + {b.name} <span className="gradient-text">n8n templates</span>
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-400">
        {fmt(pair.count)} original workflow templates connect {a.name} and {b.name} in a single
        automation. Every one is a ready-to-import n8n JSON file - buy it, download it, add your{" "}
        {a.name} and {b.name} credentials, and it runs. No code, no rebuild from scratch.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={browseHref} className="btn-primary px-5 py-3">
          Browse all {fmt(pair.count)} templates
        </Link>
        <Link href="/bundles" className="btn-secondary px-5 py-3">
          View bundles &amp; pricing
        </Link>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-zinc-500">Templates using both</dt>
          <dd className="mt-1 text-xl font-semibold text-zinc-100">{fmt(pair.count)}</dd>
        </div>
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-zinc-500">{a.name} templates</dt>
          <dd className="mt-1 text-xl font-semibold text-zinc-100">{fmt(a.count)}</dd>
        </div>
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-zinc-500">{b.name} templates</dt>
          <dd className="mt-1 text-xl font-semibold text-zinc-100">{fmt(b.count)}</dd>
        </div>
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-zinc-500">Setup time</dt>
          <dd className="mt-1 text-xl font-semibold text-zinc-100">Minutes</dd>
        </div>
      </dl>

      {topSubcategories.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-100">
            What you can automate between {a.name} and {b.name}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topSubcategories.map(([name, count]) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-300"
              >
                <span>{name}</span>
                <span className="font-mono text-xs text-zinc-500">{fmt(count)} templates</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topCategories.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-100">Browse by category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topCategories.map(([name, count]) => (
              <Link
                key={name}
                href={`${browseHref}&category=${encodeURIComponent(name)}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {name} <span className="text-zinc-500">({fmt(count)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">
            Most popular {a.name} + {b.name} templates
          </h2>
          <Link href={browseHref} className="link-arrow">
            View all <span className="arrow">&rarr;</span>
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {top.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-zinc-100">Explore each integration</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[a, b].map((i) => (
            <Link key={i.slug} href={`/integrations/${i.slug}`} className="card card-hover group rounded-xl p-4">
              <div className="text-sm font-medium text-zinc-200 group-hover:text-white">
                All {i.name} templates
              </div>
              <div className="mt-1 font-mono text-xs text-zinc-500">{fmt(i.count)} templates</div>
            </Link>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-100">Related integrations</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/integrations/${p.slug}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {p.a.name} + {p.b.name} <span className="text-zinc-500">({fmt(p.count)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-6">
        <div>
          <h2 className="font-semibold text-zinc-100">
            Need a specific {a.name} to {b.name} workflow?
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Describe it and get a fixed quote - custom-built, ready to import.
          </p>
        </div>
        <Link href="/custom" className="btn-primary px-5 py-2.5 text-sm">
          Request a custom build
        </Link>
      </div>
    </div>
  );
}
