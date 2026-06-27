import Link from "next/link";
import { Suspense } from "react";
import { getTaxonomy, topByDemand } from "@/lib/catalog";
import WorkflowCard from "@/components/WorkflowCard";
import { SearchBar } from "@/components/Controls";

export default function Home() {
  const taxo = getTaxonomy();
  const trending = topByDemand(8);
  const fmt = (n: number) => n.toLocaleString();

  const steps: [string, string, string][] = [
    ["1", "Search & filter", "Find the right automation among 10,000+ by industry, tool, or keyword."],
    ["2", "Review the details", "See what it does, the tools it connects, and real-world use cases."],
    ["3", "Open on n8n.io", "Jump straight to the original workflow and import it for free."],
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700/70 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {fmt(taxo.total)} workflows indexed
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-50 sm:text-6xl">
            Discover the perfect <span className="gradient-text">n8n workflow</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
            Search {fmt(taxo.total)}+ automation templates across {taxo.industries.length} industries.
            Find it here, then open it free on n8n.io.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <Suspense fallback={<div className="h-12" />}>
              <SearchBar />
            </Suspense>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            <span><b className="text-zinc-300">{fmt(taxo.total)}</b> workflows</span>
            <span><b className="text-zinc-300">{taxo.industries.length}</b> industries</span>
            <span><b className="text-zinc-300">{taxo.categories.length}</b> categories</span>
            <span><b className="text-zinc-300">{taxo.platformsTop.length}+</b> integrations</span>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">Browse by industry</h2>
          <Link href="/workflows" className="text-sm text-violet-400 hover:text-violet-300">View all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {taxo.industries.map((i) => (
            <Link
              key={i.name}
              href={`/workflows?industry=${encodeURIComponent(i.name)}`}
              className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 card-hover hover:border-violet-500/50 hover:bg-zinc-900/70"
            >
              <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{i.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{fmt(i.count)} workflows</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">Trending workflows</h2>
          <Link href="/workflows?sort=demand" className="text-sm text-violet-400 hover:text-violet-300">More →</Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold text-zinc-100">Popular categories</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {taxo.categories.map((c) => (
            <Link
              key={c.name}
              href={`/workflows?category=${encodeURIComponent(c.name)}`}
              className="rounded-full border border-zinc-800/80 bg-zinc-900/40 px-4 py-2 text-sm text-zinc-300 hover:border-violet-500/50 hover:text-white"
            >
              {c.name} <span className="text-zinc-500">{fmt(c.count)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 p-8">
          <h2 className="text-2xl font-semibold text-zinc-100">How FlowDex works</h2>
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
