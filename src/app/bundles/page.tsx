import Link from "next/link";
import type { Metadata } from "next";
import { fullLibrary, lifetime, categoryBundles, subcategoryBundlesFor } from "@/lib/bundles";
import { inr } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Bundles & pricing",
  description:
    "Buy a single template, a whole category bundle, or the full library of 10,500+ original n8n workflows. Simple, discounted launch pricing.",
};

const tiers: { name: string; lo: number; hi?: number; desc: string }[] = [
  { name: "Free", lo: 0, desc: "A handful of genuine samples, kept free permanently - no payment." },
  { name: "Starter", lo: 49, hi: 129, desc: "Simple, everyday micro-automations. Less than a coffee." },
  { name: "Professional", lo: 149, hi: 299, desc: "Solid everyday automations. Impulse-buy pricing." },
  { name: "Premium", lo: 299, hi: 599, desc: "Higher-complexity, higher-value workflows." },
  { name: "Enterprise", lo: 549, hi: 999, desc: "Advanced, multi-step, high-commercial-value builds." },
];

const fmt = (n: number) => n.toLocaleString("en-IN");

export default function BundlesPage() {
  const full = fullLibrary();
  const life = lifetime();
  const cats = categoryBundles();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="eyebrow">Simple pricing</p>
        <h1 className="mt-2.5 text-3xl font-bold text-zinc-50">Bundles &amp; pricing</h1>
        <p className="mt-2 leading-relaxed text-zinc-400">
          Buy one template at a time, grab an entire category, or get everything at once. All prices
          are launch pricing - discounted now, rising as we grow.
        </p>
      </div>

      <Link
        href="/practice-bundles"
        className="card-hover mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5 hover:border-violet-500/60 sm:flex-row sm:items-center"
      >
        <div>
          <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300">
            Learning n8n?
          </span>
          <p className="mt-2 text-sm text-zinc-300">
            Looking to practice, not deploy? See our structured{" "}
            <span className="font-medium text-zinc-100">practice bundles</span>{" "}&mdash; a real curriculum
            from your first automation to enterprise-grade architecture.
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-violet-300">View practice bundles &rarr;</span>
      </Link>

      {full && life && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[full, life].map((b) => (
            <Link
              key={b.slug}
              href={`/bundles/${b.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.gradient} p-[1px] card-hover`}
            >
              <div className="relative h-full rounded-[15px] bg-[#0b0b12] p-6 sm:p-7">
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br ${b.gradient} opacity-[0.13] blur-3xl`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-zinc-50">{b.name}</h2>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      {b.off}% off
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{b.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-2.5">
                    <span className="font-display text-3xl font-bold tracking-tight text-zinc-50">{inr(b.price)}</span>
                    <span className="text-zinc-500 line-through">{inr(b.mrp)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {fmt(b.count)} templates &middot; individually worth {inr(b.individualValue)}
                  </p>
                  <span className="link-arrow mt-5">
                    View bundle <span className="arrow">&rarr;</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section id="pricing" className="mt-16 scroll-mt-20">
        <p className="eyebrow">Per-template tiers</p>
        <h2 className="mt-2.5 text-2xl font-semibold text-zinc-100">How individual pricing works</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Every template is priced by its tier and complexity, so you only pay more for genuinely
          more valuable automations. Prefer to buy in bulk? A bundle is always cheaper per template.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((t) => (
            <div key={t.name} className="card card-hover p-5">
              <div className="text-sm font-semibold text-zinc-200">{t.name}</div>
              <div className="mt-1 font-display text-2xl font-bold tracking-tight text-zinc-50">
                {t.lo === 0 ? "Free" : t.hi ? `${inr(t.lo)} - ${inr(t.hi)}` : inr(t.lo)}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <p className="eyebrow">One category, one download</p>
        <h2 className="mt-2.5 text-2xl font-semibold text-zinc-100">Category bundles</h2>
        <p className="mt-2 text-sm text-zinc-400">Every template in a category, in one download.</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((b) => (
            <Link key={b.slug} href={`/bundles/${b.slug}`} className="card card-hover group flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div
                  aria-hidden="true"
                  className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${b.gradient} font-display text-sm font-bold text-white shadow-lg`}
                >
                  {b.category?.charAt(0)}
                </div>
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  {b.off}% off
                </span>
              </div>
              <h3 className="mt-4 font-sans font-semibold text-zinc-100 group-hover:text-white">{b.category}</h3>
              <p className="mt-1 font-mono text-xs text-zinc-500">{fmt(b.count)} templates</p>
              <div className="mt-4 flex items-baseline gap-2 border-t border-white/[0.06] pt-3">
                <span className="font-display text-xl font-bold tracking-tight text-zinc-50">{inr(b.price)}</span>
                <span className="text-sm text-zinc-500 line-through">{inr(b.mrp)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <p className="eyebrow">Pick your niche</p>
        <h2 className="mt-2.5 text-2xl font-semibold text-zinc-100">Subcategory bundles</h2>
        <p className="mt-2 text-sm text-zinc-400">
          More focused than a category, cheaper than the full set. Pick the exact niche you need.
        </p>
        <div className="mt-6 space-y-3">
          {cats.map((c) => {
            const subs = subcategoryBundlesFor(c.category!);
            if (subs.length === 0) return null;
            return (
              <details key={c.slug} className="card group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-zinc-200 marker:content-none">
                  <span className="font-medium">{c.category}</span>
                  <span className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                    {subs.length} bundles
                    <span aria-hidden="true" className="text-zinc-500 transition-transform duration-200 group-open:rotate-45">+</span>
                  </span>
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {subs.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/bundles/${b.slug}`}
                      className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm transition-colors hover:border-violet-500/50 hover:bg-white/[0.05]"
                    >
                      <span className="truncate text-zinc-300">{b.subcategory}</span>
                      <span className="ml-2 shrink-0 font-display font-semibold tracking-tight text-zinc-100">{inr(b.price)}</span>
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
