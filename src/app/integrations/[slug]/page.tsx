import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getIndex, type IndexItem } from "@/lib/catalog";
import {
  getIntegrationBySlug,
  getIntegrationPairBySlug,
  canonicalPairSlug,
  relatedPairs,
  pairsForIntegration,
  pairTitleRelevance,
  isPairIndexable,
  richerNeighbourPairs,
  THIN_PAIR_TEMPLATES,
  type IntegrationPair,
} from "@/lib/integrations";
import { getPairGuide, type PairGuide } from "@/lib/pair-guides";
import { pairFaqs, integrationFaqs, faqJsonLd, type Faq } from "@/lib/integration-faqs";
import WorkflowCard from "@/components/WorkflowCard";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMeta, workflowItemListJsonLd } from "@/lib/seo";
import { starterPackItems } from "@/lib/starter-pack";

const fmt = (n: number) => n.toLocaleString("en-IN");

/** Templates that use both halves of a pair. */
function pairMatches(pair: IntegrationPair): IndexItem[] {
  return getIndex().filter(
    (w) => w.platforms.includes(pair.a.name) && w.platforms.includes(pair.b.name),
  );
}

function countBy(items: IndexItem[], key: "category" | "subcategory", limit: number) {
  const counts = new Map<string, number>();
  for (const w of items) {
    const v = w[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/** Dynamic share card for an integration or pair, via the shared /api/og renderer. */
function shareImage(title: string, count: number) {
  return `/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(`${fmt(count)} n8n templates`)}`;
}

function pairBrowseHref(pair: IntegrationPair) {
  return `/workflows?platform=${encodeURIComponent(pair.a.name)}&platform2=${encodeURIComponent(pair.b.name)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const pair = getIntegrationPairBySlug(slug);
  if (pair) {
    // Search Console shows the demand arrives as "connect x to y" / "x to y"
    // far more than "x + y", and at better positions - so the title leads with
    // the directional phrasing and the body covers both directions.
    const title = `${pair.a.name} to ${pair.b.name}: ${fmt(pair.count)} n8n integration templates`;
    const description = `${fmt(pair.count)} ready-to-import n8n workflow templates that connect ${pair.a.name} to ${pair.b.name} - and ${pair.b.name} back to ${pair.a.name}. Download the JSON, add your credentials and it runs - no code required.`;
    return pageMeta({
      title,
      description,
      path: `/integrations/${pair.slug}`,
      image: shareImage(`${pair.a.name} + ${pair.b.name}`, pair.count),
      noindex: !isPairIndexable(pair),
    });
  }

  const integration = getIntegrationBySlug(slug);
  if (!integration) return { title: "Integration not found" };
  const title = `${integration.name} n8n workflow templates`;
  const description = `${fmt(integration.count)} original, ready-to-import n8n workflow templates that automate ${integration.name} - buy a single template or a bundle and download instantly.`;
  return pageMeta({
    title,
    description,
    path: `/integrations/${integration.slug}`,
    image: shareImage(integration.name, integration.count),
  });
}

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // "discord-and-airtable" -> 301 to the canonical "airtable-and-discord"
  const canonical = canonicalPairSlug(slug);
  if (canonical) redirect(`/integrations/${canonical}`);

  const pair = getIntegrationPairBySlug(slug);
  if (pair) return <PairPage pair={pair} />;

  const integration = getIntegrationBySlug(slug);
  if (!integration) notFound();

  const freeCount = starterPackItems().length;
  const matching = getIndex().filter((w) => w.platforms.includes(integration.name));
  const top = [...matching].sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0)).slice(0, 12);
  const topCategories = countBy(matching, "category", 8);

  // Pairs this integration is half of - internal links into the new pair pages.
  const pairsWithThis = pairsForIntegration(integration.slug, 12);
  const guide = getPairGuide(integration.slug);

  const browseHref = `/workflows?platform=${encodeURIComponent(integration.name)}`;
  const faqs = integrationFaqs(integration, matching);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: integration.name, path: `/integrations/${integration.slug}` },
  ]);
  const itemList = workflowItemListJsonLd({
    name: `${integration.name} n8n workflow templates`,
    items: top,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />
      <JsonLd data={faqJsonLd(faqs)} />
      <nav className="text-xs text-faint">
        <Link href="/" className="hover:text-body">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/integrations" className="hover:text-body">Integrations</Link>
        <span className="mx-1">/</span>
        <span className="text-muted">{integration.name}</span>
      </nav>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
        {integration.name} <span className="gradient-text">n8n templates</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        {fmt(integration.count)} original workflow templates use {integration.name}. Each one is a
        ready-to-import n8n JSON file - buy it, download it, add your {integration.name} credentials,
        and it runs.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={browseHref} className="btn-primary btn-lg">
          Browse all {fmt(integration.count)} templates
        </Link>
        <Link href="/bundles" className="btn-secondary btn-lg">
          View bundles &amp; pricing
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted">
        New to n8n? <Link href="/free" className="text-violet-400 transition-colors hover:text-violet-300">Start with {freeCount} free templates</Link> - no account needed.
      </p>

      {topCategories.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Popular categories with {integration.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topCategories.map(([name, count]) => (
              <Link
                key={name}
                href={`/workflows?platform=${encodeURIComponent(integration.name)}&category=${encodeURIComponent(name)}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-body transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {name} <span className="text-faint">({fmt(count)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-ink">Most popular {integration.name} templates</h2>
          <Link href={browseHref} className="link-arrow">
            View all <span className="arrow">&rarr;</span>
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {top.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </div>
      </div>

      {pairsWithThis.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-ink">
            Connect {integration.name} to another app
          </h2>
          <p className="mt-1 text-sm text-faint">
            Templates that wire {integration.name} up to the rest of your stack.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pairsWithThis.map((p) => {
              const other = p.a.slug === integration.slug ? p.b : p.a;
              return (
                <Link
                  key={p.slug}
                  href={`/integrations/${p.slug}`}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-body transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
                >
                  {integration.name} + {other.name}{" "}
                  <span className="text-faint">({fmt(p.count)})</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {guide && (
        <PairTutorial guide={guide} heading={`How to use ${integration.name} with n8n`} />
      )}

      <FaqSection faqs={faqs} heading={`${integration.name} and n8n: common questions`} />

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-6">
        <div>
          <h2 className="font-semibold text-ink">
            {`Need a ${integration.name} workflow that isn’t here?`}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Describe it and get a fixed quote - custom-built, ready to import.
          </p>
        </div>
        <Link href="/custom" className="btn-primary btn-md">
          Request a custom build
        </Link>
      </div>
    </div>
  );
}

/**
 * The hand-written tutorial for a pair (or a single integration) with real
 * search demand. Rendered in place of the generic three-step block, which was
 * identical across every pair page and answered none of what the query asked.
 */
function PairTutorial({ guide, heading }: { guide: PairGuide; heading: string }) {
  return (
    <section className="mt-14 border-t border-white/10 pt-10">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{heading}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-faint">Nodes you will use:</span>
        {guide.nodes.map((n) => (
          <span key={n} className="chip">
            {n}
          </span>
        ))}
      </div>
      <div className="mt-8 max-w-3xl space-y-8">
        {guide.sections.map((sec) => (
          <div key={sec.h}>
            <h3 className="font-sans text-lg font-semibold text-ink">{sec.h}</h3>
            {/* break-words: the guides quote URLs and identifiers
                (https://app.asana.com/0/<project_gid>/<task_gid>) that have no
                break opportunity and push the page 41px wider than a 375px
                viewport otherwise. */}
            <div className="mt-2.5 space-y-3.5 leading-relaxed text-body break-words">
              {sec.p.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The questions the pages already get impressions for, answered on the page.
 *
 * Rendered from the same array that builds the FAQPage markup - markup whose
 * answer is not visible to the visitor is a structured-data violation, so the
 * two must not be allowed to drift apart.
 */
function FaqSection({ faqs, heading }: { faqs: Faq[]; heading: string }) {
  return (
    <section className="mt-14 border-t border-white/10 pt-10">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{heading}</h2>
      <div className="mt-6 max-w-3xl divide-y divide-white/10 border-y border-white/10">
        {/* Padding sits on the summary, not the details wrapper, so the whole
            row is a comfortable tap target on mobile rather than a 26px sliver. */}
        {faqs.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <span className="mt-0.5 shrink-0 text-faint transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="-mt-1 break-words pb-4 pr-8 leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function PairPage({ pair }: { pair: IntegrationPair }) {
  const { a, b } = pair;
  const guide = getPairGuide(pair.slug);
  const freeCount = starterPackItems().length;
  const matching = pairMatches(pair);
  // Fix 6.1: rank by how well the *title* names the pair, then by demand.
  // Every template here genuinely contains both nodes, but titles name the most
  // prominent platforms - which are often neither - so the grid used to lead
  // with cards reading "Telegram" and "Outlook" on the PostgreSQL + Slack page.
  // Visitors read titles, not node graphs.
  const top = [...matching]
    .sort(
      (x, y) =>
        pairTitleRelevance(y.title, pair) - pairTitleRelevance(x.title, pair) ||
        (y.demand ?? 0) - (x.demand ?? 0),
    )
    .slice(0, 12);
  // Only reassure where the title genuinely does not say it. If most of the
  // grid names both tools already, the line is noise.
  const bothNamed = top.filter((w) => pairTitleRelevance(w.title, pair) === 2).length;
  const reassure = bothNamed < 6 ? `Uses ${a.name} and ${b.name}` : undefined;
  const topCategories = countBy(matching, "category", 8);
  const topSubcategories = countBy(matching, "subcategory", 6);
  const related = relatedPairs(pair, 12);
  const browseHref = pairBrowseHref(pair);
  const faqs = pairFaqs(pair, matching);
  // A short template list is not, on its own, a reason to waste the visit. Where
  // inventory is thin, name the neighbouring pairs that have depth.
  const neighbours =
    pair.count <= THIN_PAIR_TEMPLATES ? richerNeighbourPairs(pair, 6) : [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: `${a.name} + ${b.name}`, path: `/integrations/${pair.slug}` },
  ]);
  const itemList = workflowItemListJsonLd({
    name: `${a.name} + ${b.name} n8n workflow templates`,
    items: top,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />
      <JsonLd data={faqJsonLd(faqs)} />
      <nav className="text-xs text-faint">
        <Link href="/" className="hover:text-body">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/integrations" className="hover:text-body">Integrations</Link>
        <span className="mx-1">/</span>
        <span className="text-muted">{a.name} + {b.name}</span>
      </nav>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
        Connect {a.name} to {b.name} <span className="gradient-text">with n8n</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        {fmt(pair.count)} original workflow templates move data between {a.name} and {b.name} -
        in either direction. Every one is a ready-to-import n8n JSON file: buy it, download it, add
        your {a.name} and {b.name} credentials, and it runs. No code, no rebuild from scratch.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={browseHref} className="btn-primary btn-lg">
          Browse all {fmt(pair.count)} templates
        </Link>
        <Link href="/bundles" className="btn-secondary btn-lg">
          View bundles &amp; pricing
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted">
        New to n8n? <Link href="/free" className="text-violet-400 transition-colors hover:text-violet-300">Start with {freeCount} free templates</Link> - no account needed.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-faint">Templates using both</dt>
          <dd className="mt-1 text-xl font-semibold text-ink">{fmt(pair.count)}</dd>
        </div>
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-faint">{a.name} templates</dt>
          <dd className="mt-1 text-xl font-semibold text-ink">{fmt(a.count)}</dd>
        </div>
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-faint">{b.name} templates</dt>
          <dd className="mt-1 text-xl font-semibold text-ink">{fmt(b.count)}</dd>
        </div>
        <div className="card rounded-xl p-4">
          <dt className="text-xs text-faint">Setup time</dt>
          <dd className="mt-1 text-xl font-semibold text-ink">Minutes</dd>
        </div>
      </dl>

      {topSubcategories.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-ink">
            What you can automate between {a.name} and {b.name}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topSubcategories.map(([name, count]) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-body"
              >
                <span>{name}</span>
                <span className="font-mono text-xs text-faint">{fmt(count)} templates</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topCategories.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Browse by category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topCategories.map(([name, count]) => (
              <Link
                key={name}
                href={`${browseHref}&category=${encodeURIComponent(name)}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-body transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {name} <span className="text-faint">({fmt(count)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Most popular {a.name} + {b.name} templates
          </h2>
          <Link href={browseHref} className="link-arrow">
            View all <span className="arrow">&rarr;</span>
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {top.map((w) => (
            <WorkflowCard
              key={w.id}
              w={w}
              note={pairTitleRelevance(w.title, pair) === 2 ? undefined : reassure}
            />
          ))}
        </div>
      </div>

      {guide ? (
        <PairTutorial guide={guide} heading={`How to connect ${a.name} to ${b.name}`} />
      ) : (
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-ink">
          How to connect {a.name} to {b.name}
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          The same three steps work for every template here, and for sending data the other way -
          {" "}{b.name} to {a.name} - as well.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              h: `1. Pick a ${a.name} to ${b.name} template`,
              p: `Choose the workflow that matches what you need to happen, then download its JSON.`,
            },
            {
              h: "2. Import it into n8n",
              p: "In n8n choose Workflows \u2192 Import from File and select the downloaded file.",
            },
            {
              h: `3. Add your credentials`,
              p: `Connect your ${a.name} and ${b.name} accounts in n8n. That is the whole setup - then run it.`,
            },
          ].map((step) => (
            <li key={step.h} className="card p-5">
              <h3 className="font-semibold text-ink">{step.h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.p}</p>
            </li>
          ))}
        </ol>
      </div>
      )}

      {neighbours.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-ink">
            More templates for {a.name} and {b.name} users
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {a.name} and {b.name} is a focused pairing, so the list above is short by
            design. These neighbouring pairings share one of the two tools and have far more
            ready-made workflows behind them - useful if the automation you want sits one step
            either side of this one.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {neighbours.map((p) => (
              <Link
                key={p.slug}
                href={`/integrations/${p.slug}`}
                className="card card-hover group rounded-xl p-4"
              >
                <div className="text-sm font-medium text-body group-hover:text-white">
                  {p.a.name} <span className="text-faint">+</span> {p.b.name}
                </div>
                <div className="mt-1 font-mono text-xs text-faint">
                  {fmt(p.count)} templates
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <FaqSection faqs={faqs} heading={`${a.name} and ${b.name} in n8n: common questions`} />

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-ink">Explore each integration</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[a, b].map((i) => (
            <Link key={i.slug} href={`/integrations/${i.slug}`} className="card card-hover group rounded-xl p-4">
              <div className="text-sm font-medium text-body group-hover:text-white">
                All {i.name} templates
              </div>
              <div className="mt-1 font-mono text-xs text-faint">{fmt(i.count)} templates</div>
            </Link>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-ink">Related integrations</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/integrations/${p.slug}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-body transition-colors hover:border-violet-500/50 hover:bg-white/[0.06] hover:text-white"
              >
                {p.a.name} + {p.b.name} <span className="text-faint">({fmt(p.count)})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-6">
        <div>
          <h2 className="font-semibold text-ink">
            Need a specific {a.name} to {b.name} workflow?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Describe it and get a fixed quote - custom-built, ready to import.
          </p>
        </div>
        <Link href="/custom" className="btn-primary btn-md">
          Request a custom build
        </Link>
      </div>
    </div>
  );
}
