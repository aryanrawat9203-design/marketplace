import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBundle, getBundles, bundleMembersDetail, bandFor, type SkillBand } from "@/lib/bundles";
import { Badge, bandTone } from "@/components/Badge";
import BuyButton from "@/components/BuyButton";
import PriceTag from "@/components/PriceTag";
import TrustStrip from "@/components/TrustStrip";
import { inr } from "@/lib/pricing";
import { requireLoginToBuy } from "@/lib/require-login";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { baseUrl } from "@/lib/site";

export function generateStaticParams() {
  return getBundles()
    .filter((b) => b.type === "practice")
    .map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = getBundle(slug);
  return b ? { title: b.name, description: b.tagline } : { title: "Bundle not found" };
}

const fmt = (n: number) => n.toLocaleString("en-IN");

const BAND_ORDER: SkillBand[] = ["Foundation", "Core", "Advanced", "Production", "Architect"];

export default async function PracticeBundleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBundle(slug);
  if (!b || b.type !== "practice") notFound();

  const members = bundleMembersDetail(b);
  const bandCounts: Record<SkillBand, number> = {
    Foundation: 0,
    Core: 0,
    Advanced: 0,
    Production: 0,
    Architect: 0,
  };
  for (const m of members) bandCounts[bandFor(m)]++;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Practice bundles", path: "/practice-bundles" },
    { name: b.name, path: `/practice-bundles/${b.slug}` },
  ]);

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: b.name,
    description: b.tagline,
    provider: { "@type": "Organization", name: "WorkflowCrate" },
    offers: {
      "@type": "Offer",
      price: b.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${baseUrl()}/practice-bundles/${b.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={courseJsonLd} />
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/practice-bundles" className="hover:text-zinc-300">Practice bundles</Link>
      </nav>

      <div className={`mt-4 h-40 rounded-2xl bg-gradient-to-br ${b.gradient}`} />

      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <h1 className="text-3xl font-bold text-zinc-50">{b.name}</h1>
          <p className="mt-2 text-lg text-zinc-400">{b.tagline}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
              <dt className="text-xs text-zinc-500">Audience</dt>
              <dd className="mt-1 text-sm text-zinc-200">{b.audience}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
              <dt className="text-xs text-zinc-500">Skill level</dt>
              <dd className="mt-1 text-sm text-zinc-200">{b.skillLevel}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:col-span-2">
              <dt className="text-xs text-zinc-500">Learning outcome</dt>
              <dd className="mt-1 text-sm text-zinc-200">{b.learningOutcome}</dd>
            </div>
          </dl>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-100">Difficulty progression</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Templates are ordered simple &rarr; complex. Node counts and architecture are pulled
              directly from the real catalog &mdash; nothing here is padded.
            </p>
            <div className="mt-4 flex overflow-hidden rounded-lg border border-zinc-800/80">
              {BAND_ORDER.filter((band) => bandCounts[band] > 0).map((band) => (
                <div
                  key={band}
                  className="flex flex-col items-center justify-center gap-1 border-r border-zinc-800/80 bg-zinc-900/40 px-2 py-3 text-center last:border-r-0"
                  style={{ width: `${(bandCounts[band] / members.length) * 100}%` }}
                >
                  <Badge tone={bandTone(band)}>{band}</Badge>
                  <span className="text-xs text-zinc-500">{bandCounts[band]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-100">
              Curriculum <span className="text-sm font-normal text-zinc-500">({fmt(members.length)} templates, in order)</span>
            </h2>
            <ol className="mt-4 space-y-1.5">
              {members.map((m, i) => (
                <li key={m.id}>
                  <Link
                    href={`/workflows/${m.route}`}
                    className="group flex items-center gap-3 rounded-lg border border-zinc-800/70 bg-zinc-900/30 px-3 py-2.5 hover:border-violet-500/50 hover:bg-zinc-900/60"
                  >
                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-zinc-600">{i + 1}</span>
                    <Badge tone={bandTone(bandFor(m))}>{bandFor(m)}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-300 group-hover:text-zinc-100">
                      {m.title}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">{m.totalNodes} nodes</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
            <PriceTag price={b.price} mrp={b.mrp} off={b.off} free={false} size="lg" />
            <p className="mt-2 text-xs text-zinc-500">
              {fmt(b.count)} templates &middot; individually worth {inr(b.individualValue)}
            </p>
            <div className="mt-4">
              <BuyButton
                item={{ kind: "bundle", key: b.slug, name: b.name, price: b.price, free: false }}
                block
                requireLogin={requireLoginToBuy()}
              />
              <TrustStrip />
            </div>
            <div className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-300">
              About {inr(Math.max(1, Math.round(b.price / b.count)))} per template
            </div>
            <p className="mt-4 text-xs text-zinc-500">{b.sellingPosition}</p>
          </div>
          <Link
            href="/practice-bundles"
            className="block text-center text-sm text-violet-400 hover:text-violet-300"
          >
            &larr; All practice bundles
          </Link>
        </aside>
      </div>
    </div>
  );
}
