import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBundle, getBundles, bundlePreview } from "@/lib/bundles";
import WorkflowCard from "@/components/WorkflowCard";
import BuyButton from "@/components/BuyButton";
import PriceTag from "@/components/PriceTag";
import { inr } from "@/lib/pricing";
import { requireLoginToBuy } from "@/lib/require-login";

export function generateStaticParams() {
  return getBundles().map((b) => ({ slug: b.slug }));
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

export default async function BundleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBundle(slug);
  if (!b) notFound();
  const preview = bundlePreview(b, 8);

  const browseHref =
    b.type === "category"
      ? `/workflows?category=${encodeURIComponent(b.category!)}`
      : b.type === "subcategory"
        ? `/workflows?category=${encodeURIComponent(b.category!)}&subcategory=${encodeURIComponent(b.subcategory!)}`
        : "/workflows";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/bundles" className="hover:text-zinc-300">Bundles</Link>
      </nav>

      <div className={`mt-4 h-40 rounded-2xl bg-gradient-to-br ${b.gradient}`} />

      <div className="mt-6 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-zinc-50">{b.name}</h1>
          <p className="mt-2 text-lg text-zinc-400">{b.tagline}</p>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-100">What&apos;s included</h2>
            <ul className="mt-3 space-y-2 text-zinc-300">
              <li className="flex gap-2"><span className="mt-0.5 text-emerald-400">&#10003;</span> {fmt(b.count)} original, ready-to-import n8n templates</li>
              <li className="flex gap-2"><span className="mt-0.5 text-emerald-400">&#10003;</span> Delivered as a single ZIP, organised by category &amp; subcategory</li>
              <li className="flex gap-2"><span className="mt-0.5 text-emerald-400">&#10003;</span> License to use and adapt every template in your projects</li>
              {b.type === "lifetime" ? (
                <li className="flex gap-2"><span className="mt-0.5 text-emerald-400">&#10003;</span> Every future template and update, forever</li>
              ) : (
                <li className="flex gap-2"><span className="mt-0.5 text-emerald-400">&#10003;</span> Instant download after secure payment</li>
              )}
            </ul>
          </div>

          {preview.length > 0 && (
            <div className="mt-10">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Sample templates inside</h2>
                <Link href={browseHref} className="text-sm text-violet-400 hover:text-violet-300">
                  Browse all {fmt(b.count)} &rarr;
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {preview.map((w) => (
                  <WorkflowCard key={w.id} w={w} />
                ))}
              </div>
            </div>
          )}
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
            </div>
            <div className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-300">
              About {inr(Math.max(1, Math.round(b.price / b.count)))} per template
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
