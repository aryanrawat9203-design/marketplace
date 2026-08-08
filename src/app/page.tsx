import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getByRoute, getTaxonomy, topByDemand, freeSamples } from "@/lib/catalog";
import { fullLibrary, lifetime, categoryBundles } from "@/lib/bundles";
import { getCollections, collectionStats } from "@/lib/collections";
import { getShowcaseScreenshots, SHOWCASE_SLOTS } from "@/lib/screenshots";
import WorkflowCard from "@/components/WorkflowCard";
import HeroGraph from "@/components/HeroGraph";
import TrustStrip from "@/components/TrustStrip";
import SectionHeader from "@/components/SectionHeader";
import Reveal from "@/components/Reveal";
import { SearchBar } from "@/components/Controls";
import PriceTag from "@/components/PriceTag";
import { RecentlyViewedStrip } from "@/components/RecentlyViewed";
import JsonLd from "@/components/JsonLd";
import { inr } from "@/lib/pricing";
import { integrationSlug } from "@/lib/slug";
import { baseUrl, SITE_NAME } from "@/lib/site";
import { TEMPLATE_COUNT_LABEL } from "@/lib/site";

// Root canonical so query-string variants (utm_*, cache-busters, ?ref=) all
// consolidate to the bare homepage rather than splitting ranking signals.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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

// Copy for the "see exactly what you get" gallery. Lives here rather than in the
// DB because it's marketing copy about what each slot proves, not per-template
// data; the admin only ever uploads the image. `w`/`h` are the natural pixel
// dimensions of the current screenshots - they only seed the aspect-ratio box
// (the images render `w-full h-auto`), so a replacement of a different shape
// still renders undistorted.
const SHOWCASE_COPY: Record<
  (typeof SHOWCASE_SLOTS)[number],
  { title: string; desc: string; w: number; h: number }
> = {
  overview: {
    title: "Full workflow overview",
    desc: "Every node laid out and labeled - see the entire automation before you buy, not just a title and a price.",
    w: 1453,
    h: 516,
  },
  nodeDetail: {
    title: "Every node documented",
    desc: "Each node carries its own doc card - what it does, and which step runs next.",
    w: 255,
    h: 311,
  },
  capabilities: {
    title: "Error handling & retries",
    desc: "External calls retry with backoff, failures park in a dead-letter queue, and the on-call channel gets the context.",
    w: 312,
    h: 231,
  },
  dataQuality: {
    title: "Data quality built in",
    desc: "Dedupe and diff steps make re-runs safe - the same input twice will not create duplicate records.",
    w: 300,
    h: 222,
  },
  customize: {
    title: "Made to be customized",
    desc: "Every node card explains its role, so you know which parts are safe to point at your own accounts.",
    w: 322,
    h: 217,
  },
  designDecisions: {
    title: "Design decisions, documented",
    desc: "Not just what the workflow does - why it is built this way, and what the obvious alternative would cost you.",
    w: 336,
    h: 216,
  },
  practice: {
    title: "Practice exercises",
    desc: "Concrete extensions to work through, so you learn the pattern instead of only importing it.",
    w: 352,
    h: 242,
  },
  plainEnglish: {
    title: "Plain-English breakdown",
    desc: "What it does, why it exists, and how to use it - spelled out before you ever open n8n.",
    w: 370,
    h: 630,
  },
  credentials: {
    title: "Credential setup, step by step",
    desc: "Exactly where each key comes from, and the gotchas that break first-time connections.",
    w: 352,
    h: 441,
  },
  troubleshooting: {
    title: "Troubleshooting included",
    desc: "The failures that actually happen, each with its cause and fix - not a generic FAQ.",
    w: 337,
    h: 441,
  },
};

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
  // Whatever the showcase template has uploaded, in SHOWCASE_SLOTS order:
  // first entry is the wide hero, the rest fill the masonry grid below it.
  const showcaseCards = showcase
    ? SHOWCASE_SLOTS.flatMap((slot) => {
        const src = showcase.screenshots[slot];
        return src ? [{ slot, src, ...SHOWCASE_COPY[slot] }] : [];
      })
    : [];
  const [featured, ...restShowcase] = showcaseCards;

  const stats: [string, string][] = [
    [fmt(taxo.total), "templates"],
    [String(taxo.categories.length), "categories"],
    [String(taxo.subcategories.length), "subcategories"],
    [`${taxo.platformsTop.length}+`, "integrations"],
  ];

  const steps: [string, string, string][] = [
    ["1", "Find the right one", `Search ${TEMPLATE_COUNT_LABEL} original templates by industry, tool, or use case.`],
    ["2", "Buy securely", "Pay in seconds with UPI, cards, or netbanking via Razorpay."],
    ["3", "Download & import", "Get the ready-to-import n8n JSON instantly - add your credentials and go."],
  ];

  // Structured data: the Organization gives Google a name+logo for the brand,
  // and the WebSite SearchAction advertises the on-site search so results can
  // earn a sitelinks search box. Both point at real, existing routes.
  const base = baseUrl();
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: base,
    logo: `${base}/icon`,
    description:
      "Original, ready-to-import n8n workflow templates - single templates, category bundles, or the full library.",
  };
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/workflows?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={orgJsonLd} />
      <JsonLd data={siteJsonLd} />
      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_65%_65%_at_50%_30%,black,transparent)]"
        />
        {/* Signature visual: an ambient n8n-style automation graph. Labelled
            node cards frame the copy on desktop; a fainter node-and-wire network
            stands in on mobile/tablet, where the side gutters vanish. */}
        <div className="pointer-events-none absolute inset-0">
          <HeroGraph />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="anim-rise inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-body">
              <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span>{fmt(taxo.total)} original templates &middot; launch pricing live</span>
            </span>
            <h1 className="anim-rise anim-d1 mt-6 text-4xl font-bold tracking-tight text-ink sm:text-6xl sm:leading-[1.06]">
              See every <span className="gradient-text">node</span> before you buy
            </h1>
            <p className="anim-rise anim-d2 mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              Original n8n templates, documented well enough to learn from &mdash; not a mystery ZIP.
              {" "}{taxo.industries.length} industries, {taxo.categories.length} categories, instant download.
            </p>
            <div className="anim-rise anim-d2 mx-auto mt-8 max-w-xl">
              <Suspense fallback={<div className="h-12" />}>
                <SearchBar />
              </Suspense>
            </div>
            <div className="anim-rise anim-d3 mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/workflows" className="btn-primary btn-lg">
                Browse all templates
              </Link>
              <Link href="/bundles" className="btn-secondary btn-lg">
                View bundles &amp; pricing
              </Link>
            </div>
            <div className="anim-rise anim-d3">
              <TrustStrip />
            </div>
            {/* Proof, raised above the fold: a visitor who bounces from the
                hero never used to see this. It's a real template page, not a
                stock photo - the single best answer to "why pay when free
                templates exist?" (Fix 2.7). */}
            {showcase && showcaseItem && featured && (
              <Link
                href={`/workflows/${showcase.route}`}
                className="card card-hover anim-rise anim-d3 mx-auto mt-10 block max-w-3xl overflow-hidden text-left"
              >
                <Image
                  src={featured.src}
                  alt={featured.title}
                  width={featured.w}
                  height={featured.h}
                  priority
                  sizes="(min-width: 768px) 768px, 100vw"
                  className="h-auto w-full border-b border-white/[0.06] bg-surface-1 object-contain"
                />
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                      Proof, not promises
                    </p>
                    <p className="mt-0.5 text-sm text-body">
                      &ldquo;{showcaseItem.title}&rdquo; &mdash; the real node graph, before you pay.
                    </p>
                  </div>
                  <span className="link-arrow shrink-0 text-sm">
                    View <span className="arrow">&rarr;</span>
                  </span>
                </div>
              </Link>
            )}
            <div className="anim-rise anim-d4 mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.07] sm:grid-cols-4">
              {stats.map(([v, label]) => (
                <div key={label} className="bg-surface-1 px-4 py-3.5">
                  <div className="font-display text-xl font-semibold tracking-tight text-ink">{v}</div>
                  <div className="mt-0.5 text-xs text-faint">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ showcase */}
      {showcase && showcaseItem && restShowcase.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Reveal>
            <SectionHeader
              eyebrow="Every detail, documented"
              title="See exactly what you get"
              description={
                <>The rest of &ldquo;{showcaseItem.title}&rdquo; &mdash; design decisions, credentials, troubleshooting, all included.</>
              }
              action={{ href: `/workflows/${showcase.route}`, label: "View this template" }}
            />
            {/* Masonry, not a fixed-height grid: these screenshots range from
                wide sticky notes to tall doc cards, and letterboxing a 370x630
                card into a short row would shrink its text past legibility.
                Below the fold, so lazy-loaded (next/image default) rather
                than eagerly fetched like the hero screenshot above. */}
            <div className="mt-7 gap-4 sm:columns-2 lg:columns-3">
              {restShowcase.map((c) => (
                <div key={c.slot} className="card card-hover mb-4 break-inside-avoid overflow-hidden">
                  <div className="border-b border-white/[0.06] bg-surface-1">
                    <Image
                      src={c.src}
                      alt={c.title}
                      width={c.w}
                      height={c.h}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="h-auto w-full object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-sans text-sm font-semibold text-ink">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ------------------------------------------------ free samples */}
      {samples.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Reveal>
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
          </Reveal>
        </section>
      )}

      {/* ------------------------------------------------ flagship bundles */}
      {full && life && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Reveal>
            <SectionHeader
              eyebrow="Best value"
              title="Buy the whole library"
              description="Every template we've made, in one download - or lifetime access to everything we make next."
              action={{ href: "/bundles", label: "Compare all plans" }}
            />
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {[full, life].map((b, i) => (
                <Link
                  key={b.slug}
                  href={`/bundles/${b.slug}`}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.gradient} p-[1px] card-hover`}
                >
                  <div className="relative h-full rounded-[15px] bg-surface-1 p-6 sm:p-7">
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br ${b.gradient} opacity-[0.13] blur-3xl`}
                    />
                    <div className="relative">
                      {i === 0 && (
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
                          <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.6 6.3L21 9l-5 4.3L17.5 20 12 16.5 6.5 20 8 13.3 3 9l6.4-.7z" />
                          </svg>
                          Best value
                        </span>
                      )}
                      <h3 className="text-xl font-semibold text-ink">{b.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{b.tagline}</p>
                      <div className="mt-5 flex items-baseline gap-2.5">
                        <span className="font-display text-3xl font-bold tracking-tight text-ink">
                          {inr(b.price)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-xs text-faint">{fmt(b.count)} templates</div>
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
        <Reveal>
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
                  <h3 className="mt-4 font-sans font-semibold text-ink group-hover:text-white">{c.name}</h3>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-faint">{c.tagline}</p>
                  <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.06] pt-3">
                    <span className="font-display text-sm font-bold tracking-tight text-ink">
                      {inr(stats.price)}
                    </span>
                    <span className="text-xs text-faint">{stats.count} templates</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
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
                <div className="text-sm font-medium text-body group-hover:text-white">{c.name}</div>
                <div className="mt-1 font-mono text-xs text-faint">{fmt(c.count)} templates</div>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ integrations */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
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
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-body transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {p.name} <span className="text-faint">({fmt(p.count)})</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ popular templates */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
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
        </Reveal>
      </section>

      {/* ------------------------------------------------ popular bundles */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
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
                </div>
                <h3 className="mt-4 font-sans font-semibold text-ink group-hover:text-white">{b.category}</h3>
                <p className="mt-1 font-mono text-xs text-faint">{fmt(b.count)} templates</p>
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <PriceTag price={b.price} free={false} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
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
                <h3 className="mt-4 font-sans font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ custom CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
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
                <h2 className="text-2xl font-semibold text-ink">Can&apos;t find the exact workflow?</h2>
                <p className="mt-2 leading-relaxed text-muted">
                  We build custom n8n workflows to order - describe it, get a fixed quote, pay only if
                  you go ahead.
                </p>
              </div>
              <Link href="/custom" className="btn-primary btn-lg">
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
                <div className="grid h-9 w-9 place-items-center rounded-full border border-violet-500/30 bg-surface-1 font-display text-sm font-semibold text-violet-300 shadow-[0_0_0_6px_var(--color-surface-1)]">
                  {n}
                </div>
                <h3 className="mt-4 font-sans font-medium text-ink">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
