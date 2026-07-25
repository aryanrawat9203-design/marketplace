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
    </div>
  );
}
