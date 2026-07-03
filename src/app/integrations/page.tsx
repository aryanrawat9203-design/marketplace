import Link from "next/link";
import type { Metadata } from "next";
import { getIntegrations } from "@/lib/integrations";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Browse n8n templates by integration",
  description:
    "Find ready-to-import n8n workflow templates for the apps you already use - Gmail, Slack, Google Sheets, OpenAI, Telegram, Notion and hundreds more.",
};

export default function IntegrationsPage() {
  const integrations = getIntegrations();
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <h1 className="text-2xl font-semibold text-zinc-100">Browse by integration</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Start from the apps in your stack. Every template is an original, ready-to-import n8n
        workflow - pick an integration to see what you can automate with it.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {integrations.map((i) => (
          <Link
            key={i.slug}
            href={`/integrations/${i.slug}`}
            className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 card-hover hover:border-violet-500/50 hover:bg-zinc-900/70"
          >
            <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{i.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{fmt(i.count)} templates</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
