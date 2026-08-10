import Link from "next/link";
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import WorkflowCard from "@/components/WorkflowCard";
import StarterPackForm from "@/components/StarterPackForm";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMeta, shareImage } from "@/lib/seo";
import { starterPackItems } from "@/lib/starter-pack";

const fmt = (n: number) => n.toLocaleString("en-IN");

export function generateMetadata(): Metadata {
  const count = starterPackItems().length;
  const title = `${count} free n8n workflow templates`;
  const description = `Download ${count} original, ready-to-import n8n workflow templates free - no account needed. Ordered beginner to expert so you can work through them in sequence.`;
  return pageMeta({
    title,
    description,
    path: "/free",
    image: shareImage(`${count} free n8n templates`, "Free starter pack"),
  });
}

export default function FreeTemplatesPage() {
  const items = starterPackItems();
  const count = items.length;

  const byDifficulty = new Map<string, number>();
  for (const w of items) {
    const d = w.difficulty ?? "Other";
    byDifficulty.set(d, (byDifficulty.get(d) ?? 0) + 1);
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Free templates", path: "/free" },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <JsonLd data={breadcrumb} />

      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Free templates" }]}
        eyebrow="Starter pack"
        title={
          <>
            {count} free <span className="gradient-text">n8n workflow templates</span>
          </>
        }
        description={
          <>
            Original, ready-to-import workflows - not links to someone else&apos;s repo. Import the
            JSON, add your own credentials, and each one runs. No account required, and the pack is
            ordered from beginner to expert so it reads as a path rather than a pile.
          </>
        }
      />

      <p className="mt-4 text-sm text-muted">
        Not sure why you would ever pay, when n8n.io hosts thousands free?{" "}
        <Link
          href="/guides/why-pay-for-n8n-templates"
          className="font-medium text-violet-400 transition-colors hover:text-violet-300"
        >
          Here is the honest answer
        </Link>
        , including the cases where we would tell you not to.
      </p>

      <div className="mt-8 max-w-2xl">
        <StarterPackForm />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[...byDifficulty.entries()].map(([name, n]) => (
          <span key={name} className="chip">
            {name} <span className="text-faint">({fmt(n)})</span>
          </span>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-ink">What&apos;s in the pack</h2>
        <p className="mt-1.5 text-sm text-muted">
          Every template below is included in the download, in this order.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            h: "1. Download and unzip",
            p: "You get one ZIP of numbered .json files - one workflow each, nothing to install.",
          },
          {
            h: "2. Import into n8n",
            p: "In n8n choose Workflows → Import from File and pick a template.",
          },
          {
            h: "3. Add your credentials",
            p: "Connect the apps that workflow touches. That is the whole setup - then run it.",
          },
        ].map((s) => (
          <div key={s.h} className="card p-5">
            <h3 className="font-semibold text-ink">{s.h}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.p}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-6">
        <div>
          <h2 className="font-semibold text-ink">Ready for the full library?</h2>
          <p className="mt-1 text-sm text-muted">
            The paid catalog runs from Foundation to Architect across 10,000+ templates - buy a
            single workflow or a whole category bundle.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/bundles" className="btn-primary btn-md">
            View bundles &amp; pricing
          </Link>
          <Link href="/workflows" className="btn-secondary btn-md">
            Browse all templates
          </Link>
        </div>
      </div>
    </div>
  );
}
