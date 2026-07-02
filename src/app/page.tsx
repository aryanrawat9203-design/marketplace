import Link from "next/link";
import { Suspense } from "react";
import { getTaxonomy, topByDemand, freeSamples } from "@/lib/catalog";
import { fullLibrary, lifetime, categoryBundles } from "@/lib/bundles";
import WorkflowCard from "@/components/WorkflowCard";
import { SearchBar } from "@/components/Controls";
import PriceTag from "@/components/PriceTag";
import { inr } from "@/lib/pricing";

export default function Home() {
  const taxo = getTaxonomy();
  const trending = topByDemand(8);
  const samples = freeSamples(3);
  const full = fullLibrary();
  const life = lifetime();
  const topCats = categoryBundles().slice(0, 6);
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const steps: [string, string, string][] = [
    ["1", "Find the right one", "Search 10,500+ original templates by industry, tool, or use case."],
    ["2", "Buy securely", "Pay in seconds with UPI, cards, or netbanking via Razorpay."],
    ["3", "Download & import", "Get the ready-to-import n8n JSON instantly - add your credentials and go."],
  ];

  return (
    <>
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700/70 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {fmt(taxo.total)} original templates &middot; launch pricing live
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-50 sm:text-6xl">
            Ready-to-use <span className="gradient-text">n8n workflows</span>, built to sell
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
            Buy original, ready-to-import automation templates across {taxo.industries.length} industries
            and {taxo.categories.length} categories. Download instantly, or grab a whole category in one bundle.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <Suspense fallback={<div className="h-12" />}>
              <SearchBar />
            </Suspense>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/workflows" className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 font-medium text-white hover:opacity-95">
              Browse all templates
            </Link>
            <Link href="/bundles" className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-200 hover:bg-zinc-800/60">
              View bundles &amp; pricing
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            <span><b className="text-zinc-300">{fmt(taxo.total)}</b> templates</span>
            <span><b className="text-zinc-300">{taxo.categories.length}</b> categories</span>
            <span><b className="text-zinc-300">{taxo.subcategories.length}</b> subcategories</span>
            <span><b className="text-zinc-300">{taxo.platformsTop.length}+</b> integrations</span>
          </div>
        </div>
      </section>

      {samples.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-100">Try it free</h2>
              <p className="mt-1 text-sm text-zinc-500">Genuinely free templates &mdash; no card, no signup.</p>
            </div>
            <Link href="/workflows?tier=Free" className="text-sm text-violet-400 hover:text-violet-300">
              All free templates &rarr;
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {samples.map((w) => (
              <WorkflowCard key={w.id} w={w} />
            ))}
          </div>
        </section>
      )}

      {full && life && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            {[full, life].map((b) => (
              <Link
                key={b.slug}
                href={`/bundles/${b.slug}`}
                className={`group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br ${b.gradient} p-[1px] card-hover`}
              >
                <div className="rounded-2xl bg-[#0b0b11] p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-zinc-50">{b.name}</h3>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      {b.off}% off
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{b.tagline}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-zinc-50">{inr(b.price)}</span>
                    <span className="text-zinc-500 line-through">{inr(b.mrp)}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {fmt(b.count)} templates &middot; individually worth {inr(b.individualValue)}
                  </div>
                  <div className="mt-4 text-sm font-medium text-violet-300 group-hover:text-violet-200">Get the bundle &rarr;</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">Shop by category</h2>
          <Link href="/bundles" className="text-sm text-violet-400 hover:text-violet-300">All category bundles &rarr;</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {taxo.categories.map((c) => (
            <Link
              key={c.name}
              href={`/workflows?category=${encodeURIComponent(c.name)}`}
              className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 card-hover hover:border-violet-500/50 hover:bg-zinc-900/70"
            >
              <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{c.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{fmt(c.count)} templates</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">Most popular templates</h2>
          <Link href="/workflows?sort=demand" className="text-sm text-violet-400 hover:text-violet-300">More &rarr;</Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">Popular bundles</h2>
          <Link href="/bundles" className="text-sm text-violet-400 hover:text-violet-300">View all &rarr;</Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topCats.map((b) => (
            <Link
              key={b.slug}
              href={`/bundles/${b.slug}`}
              className="group flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 card-hover hover:border-violet-500/50"
            >
              <div className={`h-20 rounded-t-2xl bg-gradient-to-br ${b.gradient}`} />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold text-zinc-100 group-hover:text-white">{b.category}</h3>
                <p className="mt-1 text-xs text-zinc-500">{fmt(b.count)} templates</p>
                <div className="mt-3">
                  <PriceTag price={b.price} mrp={b.mrp} off={b.off} free={false} size="sm" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 p-8">
          <h2 className="text-2xl font-semibold text-zinc-100">How it works</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {steps.map(([n, t, d]) => (
              <div key={n}>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 font-semibold text-violet-300">
                  {n}
                </div>
                <h3 className="mt-3 font-medium text-zinc-100">{t}</h3>
                <p className="mt-1 text-sm text-zinc-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
