import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIndex } from "@/lib/catalog";
import { getIntegrationBySlug } from "@/lib/integrations";
import WorkflowCard from "@/components/WorkflowCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const integration = getIntegrationBySlug(slug);
  if (!integration) return { title: "Integration not found" };
  return {
    title: `${integration.name} n8n workflow templates`,
    description: `${integration.count.toLocaleString("en-IN")} original, ready-to-import n8n workflow templates that automate ${integration.name} - buy a single template or a bundle and download instantly.`,
  };
}

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const integration = getIntegrationBySlug(slug);
  if (!integration) notFound();
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const matching = getIndex().filter((w) => w.platforms.includes(integration.name));
  const top = [...matching].sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0)).slice(0, 12);

  const catCounts = new Map<string, number>();
  for (const w of matching) {
    if (w.category) catCounts.set(w.category, (catCounts.get(w.category) ?? 0) + 1);
  }
  const topCategories = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

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
        <Link
          href={browseHref}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 font-medium text-white hover:opacity-95"
        >
          Browse all {fmt(integration.count)} templates
        </Link>
        <Link
          href="/bundles"
          className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-200 hover:bg-zinc-800/60"
        >
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
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-300 hover:border-violet-500/50 hover:text-white"
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
          <Link href={browseHref} className="text-sm text-violet-400 hover:text-violet-300">
            View all &rarr;
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {top.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </div>
    </div>
  );
}
