import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getByRoute, getTaxonomy, topByDemand, freeSamples } from "@/lib/catalog";
import { fullLibrary, lifetime, categoryBundles } from "@/lib/bundles";
import { getCollections, collectionStats } from "@/lib/collections";
import { getShowcaseScreenshots } from "@/lib/screenshots";
import WorkflowCard from "@/components/WorkflowCard";
import SectionHeader from "@/components/SectionHeader";
import Reveal from "@/components/Reveal";
import { SearchBar } from "@/components/Controls";
import PriceTag from "@/components/PriceTag";
import { RecentlyViewedStrip } from "@/components/RecentlyViewed";
import { inr } from "@/lib/pricing";
import { integrationSlug } from "@/lib/slug";

function WhyIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const whyItems: { title: string; desc: string; icon: string }[] = [
  {
    title: "Original, not scraped",
    desc: "Every template is built and owned in-house - you get a license to use and adapt it, with no grey areas.",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  {
    title: "See before you buy",
    desc: "Every product page shows the real node graph and node list of the workflow - no mystery ZIPs.",
    icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  {
    title: "Instant delivery",
    desc: "The ready-to-import JSON is downloading seconds after payment, with an email receipt and re-download link.",
    icon: "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
  },
  {
    title: "7-day guarantee",
    desc: "If a template won't import or isn't as described, we fix it or refund you. No forms, no fuss.",
    icon: "M9 12l2 2 4-4 M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
];

export default async function Home() {
  const taxo = getTaxonomy();
  const trending = topByDemand(8);
  const samples = freeSamples(3);
  const full = fullLibrary();
  const life = lifetime();
  const topCats = categoryBundles().slice(0, 6);
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const showcase = await getShowcaseScreenshots();
  const showcaseItem = showcase ? getByRoute(showcase.route) : undefined;
  const showcaseCards = showcase
    ? [
        {
          src: showcase.screenshots.overview,
          title: "Full workflow overview",
          desc: "Every node laid out and labeled - see the entire automation before you buy, not just a title and a price.",
        },
        {
          src: showcase.screenshots.nodeDetail,
          title: "Key logic, explained",
          desc: "Zoom into the node that matters most. Each one documents exactly what it checks and why.",
        },
        {
          src: showcase.screenshots.capabilities,
          title: "Built in, not bolted on",
          desc: "Retries, error handling, data-quality checks, and a customization guide ship with every template.",
        },
        {
          src: showcase.screenshots.cardThumb,
          title: "Plain-English breakdown",
          desc: "What it does, why it exists, and how to use it - spelled out before you ever open n8n.",
        },
      ]
    : [];
  const [featured, ...restShowcase] = showcaseCards;

  const stats: [string, string][] = [
    [fmt(taxo.total), "templates"],
    [String(taxo.categories.length), "categories"],
    [String(taxo.subcategories.length), "subcategories"],
    [`${taxo.platformsTop.length}+`, "integrations"],
  ];

  const steps: [string, string, string][] = [
    ["1", "Find the right one", "Search 10,500+ original templates by industry, tool, or use case."],
    ["2", "Buy securely", "Pay in seconds with UPI, cards, or netbanking via Razorpay."],
    ["3", "Download & import", "Get the ready-to-import n8n JSON instantly - add your credentials and go."],
  ];

  return (
    <>
      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_65%_65%_at_50%_30%,black,transparent)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="anim-rise inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-300">
              <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span>{fmt(taxo.total)} original templates &middot; launch pricing live</span>
            </span>
            <h1 className="anim-rise anim-d1 mt-6 text-4xl font-bold tracking-tight text-zinc-50 sm:text-6xl sm:leading-[1.06]">
              Ready-to-use <span className="gradient-text">n8n workflows</span>, built to sell
            </h1>
            <p className="anim-rise anim-d2 mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Buy original, ready-to-import automation templates across {taxo.industries.length} industries
              and {taxo.categories.length} categories. Download instantly, or grab a whole category in one bundle.
            </p>
            <div className="anim-rise anim-d2 mx-auto mt-8 max-w-xl">
              <Suspense fallback={<div className="h-12" />}>
                <SearchBar />
              </Suspense>
            </div>
            <div className="anim-rise anim-d3 mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/workflows" className="btn-primary px-6 py-3">
                Browse all templates
              </Link>
              <Link href="/bundles" className="btn-secondary px-6 py-3">
                View bundles &amp; pricing
              </Link>
            </div>
            <div className="anim-rise anim-d4 mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.07] sm:grid-cols-4">
              {stats.map(([v, label]) => (
                <div key={label} className="bg-[#0a0a10] px-4 py-3.5">
                  <div className="font-display text-xl font-semibold tracking-tight text-zinc-50">{v}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ showcase */}
      {showcase && showcaseItem && featured && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Reveal>
            <SectionHeader
              eyebrow="Proof, not promises"
              title="See exactly what you get"
              description={
                <>A real template page, not a stock photo &mdash; this is &ldquo;{showcaseItem.title}&rdquo;.</>
              }
              action={{ href: `/workflows/${showcase.route}`, label: "View this template" }}
            />
            <div className="mt-7 grid gap-4">
              <div className="card overflow-hidden">
                <div className="grid lg:grid-cols-[7fr_5fr]">
                  <div className="flex items-center justify-center border-b border-white/[0.06] bg-[#0a0a10] lg:border-b-0 lg:border-r">
                    <Image
                      src={featured.src}
                      alt={featured.title}
                      width={960}
                      height={540}
                      className="w-full object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col justify-center p-6 sm:p-8">
                    <h3 className="text-lg font-semibold text-zinc-50">{featured.title}</h3>
                    <p className="mt-2 leading-relaxed text-zinc-400">{featured.desc}</p>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                      Every template page shows the real node graph, the full node list, and
                      plain-English docs before you pay a rupee.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {restShowcase.map((c) => (
                  <div key={c.title} className="card card-hover overflow-hidden">
                    <div className="flex h-44 items-center justify-center border-b border-white/[0.06] bg-[#0a0a10]">
                      <Image
                        src={c.src}
                        alt={c.title}
                        width={640}
                        height={360}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-sans text-sm font-semibold text-zinc-100">{c.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ------------------------------------------------ free samples */}
      {samples.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader
            eyebrow="No card, no signup"
            title="Try it free"
            description="Genuinely free templates &mdash; import one and see the quality for yourself."
            action={{ href: "/workflows?tier=Free", label: "All free templates" }}
          />
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {samples.map((w) => (
              <WorkflowCard key={w.id} w={w} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ flagship bundles */}
      {full && life && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <Reveal>
            <div className="grid gap-4 md:grid-cols-2">
              {[full, life].map((b, i) => (
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
                        <span className="font-display text-3xl font-bold tracking-tight text-zinc-50">
                          {inr(b.price)}
                        </span>
                        <span className="text-zinc-500 line-through">{inr(b.mrp)}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-zinc-500">
                        {fmt(b.count)} templates &middot; individually worth {inr(b.individualValue)}
                      </div>
                      <div className="link-arrow mt-5">
                        {i === 0 ? "Get the full library" : "Get lifetime access"}{" "}
                        <span className="arrow">&rarr;</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ------------------------------------------------ collections */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeader
          eyebrow="Hand-assembled"
          title="Curated collections"
          description="Themed starter packs - add a whole collection to your cart in one click."
          action={{ href: "/collections", label: "All collections" }}
        />
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {getCollections().slice(0, 4).map((c) => {
            const stats = collectionStats(c);
            return (
              <Link key={c.slug} href={`/collections/${c.slug}`} className="card card-hover group flex flex-col p-5">
                <div
                  aria-hidden="true"
                  className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.gradient} font-display text-sm font-bold text-white shadow-lg`}
                >
                  {c.name.charAt(0)}
                </div>
                <h3 className="mt-4 font-sans font-semibold text-zinc-100 group-hover:text-white">{c.name}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-zinc-500">{c.tagline}</p>
                <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.06] pt-3">
                  <span className="font-display text-sm font-bold tracking-tight text-zinc-100">
                    {inr(stats.price)}
                  </span>
                  <span className="text-xs text-zinc-500">{stats.count} templates</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------ categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeader
          eyebrow="Browse the catalog"
          title="Shop by category"
          action={{ href: "/bundles", label: "All category bundles" }}
        />
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {taxo.categories.map((c) => (
            <Link
              key={c.name}
              href={`/workflows?category=${encodeURIComponent(c.name)}`}
              className="card card-hover group p-4"
            >
              <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{c.name}</div>
              <div className="mt-1 font-mono text-xs text-zinc-500">{fmt(c.count)} templates</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ integrations */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeader
          eyebrow="Your stack"
          title="Browse by integration"
          description="Start from the apps you already use."
          action={{ href: "/integrations", label: "All integrations" }}
        />
        <div className="mt-6 flex flex-wrap gap-2">
          {taxo.platformsTop.slice(0, 18).map((p) => (
            <Link
              key={p.name}
              href={`/integrations/${integrationSlug(p.name)}`}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
            >
              {p.name} <span className="text-zinc-500">({fmt(p.count)})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ popular templates */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeader
          eyebrow="Trending"
          title="Most popular templates"
          action={{ href: "/workflows?sort=demand", label: "More" }}
        />
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ popular bundles */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeader
          eyebrow="Buy in bulk"
          title="Popular bundles"
          action={{ href: "/bundles", label: "View all" }}
        />
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topCats.map((b) => (
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
              <div className="mt-4 border-t border-white/[0.06] pt-3">
                <PriceTag price={b.price} mrp={b.mrp} off={b.off} free={false} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <RecentlyViewedStrip />

      {/* ------------------------------------------------ why us */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
          <SectionHeader eyebrow="The short version" title="Why WorkflowCrate" />
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map((item) => (
              <div key={item.title} className="card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
                  <WhyIcon path={item.icon} />
                </div>
                <h3 className="mt-4 font-sans font-medium text-zinc-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ custom CTA */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 p-8 sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.1] via-transparent to-sky-500/[0.07]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-dot-grid opacity-60 [mask-image:radial-gradient(ellipse_50%_80%_at_80%_20%,black,transparent)]"
            />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="text-2xl font-semibold text-zinc-50">Can&apos;t find the exact workflow?</h2>
                <p className="mt-2 leading-relaxed text-zinc-400">
                  We build custom n8n workflows to order - describe it, get a fixed quote, pay only if
                  you go ahead.
                </p>
              </div>
              <Link href="/custom" className="btn-primary px-6 py-3">
                Request a custom build
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ how it works */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
          <SectionHeader eyebrow="How it works" title="From browsing to running in minutes" />
          <div className="relative mt-8 grid gap-8 sm:grid-cols-3">
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-[18px] hidden h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent sm:block"
            />
            {steps.map(([n, t, d]) => (
              <div key={n} className="relative">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-violet-500/30 bg-[#0b0b12] font-display text-sm font-semibold text-violet-300 shadow-[0_0_0_6px_#07070c]">
                  {n}
                </div>
                <h3 className="mt-4 font-sans font-medium text-zinc-100">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
