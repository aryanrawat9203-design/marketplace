import Link from "next/link";
import type { Metadata } from "next";
import { getIntegrations, getIndexablePairs, getNonIndexablePairs } from "@/lib/integrations";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Browse n8n templates by integration",
  description:
    "Find ready-to-import n8n workflow templates for the apps you already use - Gmail, Slack, Google Sheets, OpenAI, Telegram, Notion and hundreds more.",
  path: "/integrations",
});

export default function IntegrationsPage() {
  const integrations = getIntegrations();
  // Guided pairs lead; the rest stay linked from here so nothing is orphaned.
  const guided = getIndexablePairs();
  const others = getNonIndexablePairs();
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
  ]);
  const base = baseUrl();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "n8n templates by integration",
    itemListElement: integrations.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${base}/integrations/${i.slug}`,
      name: i.name,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />
      <p className="eyebrow">Your stack</p>
      <h1 className="mt-2.5 text-2xl font-semibold text-ink sm:text-3xl">Browse by integration</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-faint">
        Start from the apps in your stack. Every template is an original, ready-to-import n8n
        workflow - pick an integration to see what you can automate with it.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {integrations.map((i) => (
          <Link key={i.slug} href={`/integrations/${i.slug}`} className="card card-hover group rounded-xl p-4">
            <div className="text-sm font-medium text-body group-hover:text-white">{i.name}</div>
            <div className="mt-1 font-mono text-xs text-faint">{fmt(i.count)} templates</div>
          </Link>
        ))}
      </div>

      {guided.length > 0 && (
        <div className="mt-14">
          <p className="eyebrow">App to app</p>
          <h2 className="mt-2.5 text-xl font-semibold text-ink sm:text-2xl">
            Connect two apps together
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-faint">
            Most automations join two tools. These {fmt(guided.length)} pairings each come with a
            written guide - the nodes involved, the credential setup, a worked example and the
            failure modes - alongside the ready-to-import templates.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guided.map((p) => (
              <Link
                key={p.slug}
                href={`/integrations/${p.slug}`}
                className="card card-hover group flex items-center justify-between rounded-xl px-4 py-3"
              >
                <span className="text-sm font-medium text-body group-hover:text-white">
                  {p.a.name} <span className="text-faint">+</span> {p.b.name}
                </span>
                <span className="ml-3 shrink-0 font-mono text-xs text-faint">{fmt(p.count)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-ink">Every other pairing we have templates for</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-faint">
            {fmt(others.length)} further combinations, each with its own set of templates. There is
            no written guide behind these yet, so they list the workflows and leave the walkthrough
            to the pairings above.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/integrations/${p.slug}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-body transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {p.a.name} + {p.b.name} <span className="text-faint">({fmt(p.count)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
