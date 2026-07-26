import Link from "next/link";
import type { Metadata } from "next";
import { getIntegrations, getIntegrationPairs } from "@/lib/integrations";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Browse n8n templates by integration",
  description:
    "Find ready-to-import n8n workflow templates for the apps you already use - Gmail, Slack, Google Sheets, OpenAI, Telegram, Notion and hundreds more.",
};

export default function IntegrationsPage() {
  const integrations = getIntegrations();
  const pairs = getIntegrationPairs();
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <p className="eyebrow">Your stack</p>
      <h1 className="mt-2.5 text-2xl font-semibold text-zinc-50 sm:text-3xl">Browse by integration</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">
        Start from the apps in your stack. Every template is an original, ready-to-import n8n
        workflow - pick an integration to see what you can automate with it.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {integrations.map((i) => (
          <Link key={i.slug} href={`/integrations/${i.slug}`} className="card card-hover group rounded-xl p-4">
            <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{i.name}</div>
            <div className="mt-1 font-mono text-xs text-zinc-500">{fmt(i.count)} templates</div>
          </Link>
        ))}
      </div>

      {pairs.length > 0 && (
        <div className="mt-14">
          <p className="eyebrow">App to app</p>
          <h2 className="mt-2.5 text-xl font-semibold text-zinc-50 sm:text-2xl">
            Connect two apps together
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Most automations join two tools. These {fmt(pairs.length)} pairings each have a set of
            ready-to-import templates that wire them together end to end.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pairs.map((p) => (
              <Link
                key={p.slug}
                href={`/integrations/${p.slug}`}
                className="card card-hover group flex items-center justify-between rounded-xl px-4 py-3"
              >
                <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                  {p.a.name} <span className="text-zinc-600">+</span> {p.b.name}
                </span>
                <span className="ml-3 shrink-0 font-mono text-xs text-zinc-500">{fmt(p.count)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
