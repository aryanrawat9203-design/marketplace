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
        <h1 className="text-3xl font-bold text-zinc-50">Bundles &amp; pricing</h1>
        <p className="mt-2 text-zinc-400">
          Buy one template at a time, grab an entire category, or get everything at once. All prices
          are launch pricing - discounted now, rising as we grow.
        </p>
      </div>

      {full && life && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[full, life].map((b) => (
            <Link
              key={b.slug}
              href={`/bundles/${b.slug}`}
              className={`group overflow-hidden rounded-2xl bg-gradient-to-br ${b.gradient} p-[1px] card-hover`}
            >
              <div className="h-full rounded-2xl bg-[#0b0b11] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-zinc-50">{b.name}</h2>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {b.off}% off
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{b.tagline}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-zinc-50">{inr(b.price)}</span>
                  <span className="text-zinc-500 line-through">{inr(b.mrp)}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {fmt(b.count)} templates &middot; individually worth {inr(b.individualValue)}
                </p>
                <span className="mt-4 inline-block text-sm font-medium text-violet-300 group-hover:text-violet-200">
                  View bundle &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section id="pricing" className="mt-16 scroll-mt-20">
        <h2 className="text-2xl font-semibold text-zinc-100">How individual pricing works</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every template is priced by its tier and complexity, so you only pay more for genuinely
          more valuable automations. Prefer to buy in bulk? A bundle is always cheaper per template.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((t) => (
            <div key={t.name} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
              <div className="text-sm font-semibold text-zinc-200">{t.name}</div>
              <div className="mt-1 text-2xl font-bold text-zinc-50">
                {t.lo === 0 ? "Free" : t.hi ? `${inr(t.lo)} - ${inr(t.hi)}` : inr(t.lo)}
              </div>
              <p className="mt-2 text-sm text-zinc-400">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-zinc-100">Category bundles</h2>
        <p className="mt-2 text-sm text-zinc-400">Every template in a category, in one download.</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((b) => (
            <Link
              key={b.slug}
              href={`/bundles/${b.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 card-hover hover:border-violet-500/50"
            >
              <div className={`h-16 bg-gradient-to-br ${b.gradient}`} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-100 group-hover:text-white">{b.category}</h3>
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    {b.off}% off
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{fmt(b.count)} templates</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-zinc-50">{inr(b.price)}</span>
                  <span className="text-sm text-zinc-500 line-through">{inr(b.mrp)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-zinc-100">Subcategory bundles</h2>
        <p className="mt-2 text-sm text-zinc-400">
          More focused than a category, cheaper than the full set. Pick the exact niche you need.
        </p>
        <div className="mt-6 space-y-3">
          {cats.map((c) => {
            const subs = subcategoryBundlesFor(c.category!);
            if (subs.length === 0) return null;
            return (
              <details key={c.slug} className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
                <summary className="flex cursor-pointer items-center justify-between text-zinc-200">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-xs text-zinc-500">{subs.length} bundles</span>
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {subs.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/bundles/${b.slug}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/50 px-3 py-2 text-sm hover:border-violet-500/50"
                    >
                      <span className="truncate text-zinc-300">{b.subcategory}</span>
                      <span className="ml-2 shrink-0 font-semibold text-zinc-100">{inr(b.price)}</span>
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
