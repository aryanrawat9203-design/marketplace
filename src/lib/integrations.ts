import { getIndex } from "./catalog";
import { integrationSlug, pairSlug, isPairSlug, PAIR_SEP } from "./slug";

export type Integration = { name: string; slug: string; count: number };

/**
 * Two integrations that appear together on at least MIN_PAIR_TEMPLATES
 * templates. These back the /integrations/<a>-and-<b> pages, which target
 * "<tool a> <tool b> integration" search demand.
 */
export type IntegrationPair = {
  a: Integration;
  b: Integration;
  slug: string;
  count: number;
};

export { integrationSlug, pairSlug, isPairSlug };

/**
 * Below this a pair page would be too thin to be useful (and to rank), so the
 * route 404s instead. The threshold was 10 back when platform data was
 * unreliable and thin pages were often bogus. Now that platforms are derived
 * from the real node graphs, a pair backed by 3 genuine templates plus the
 * how-to content is legitimate - and lets us serve measured search demand
 * (e.g. Trello+Discord, Asana+Discord) that we otherwise 404 on. Dropping
 * 10 -> 3 takes the catalog from 108 pair pages to 129 (all recognisable
 * tool pairs with 3+ real templates behind them).
 */
export const MIN_PAIR_TEMPLATES = 3;

/**
 * The pair pages we ask Google to index. Everything else keeps its page, its
 * links and its crawlability, and carries `noindex, follow`.
 *
 * This replaced an inventory threshold that left 126 pages indexable, and the
 * reason is worth recording because the numbers said something a threshold
 * cannot express: Google crawled almost none of them. Not ranked badly - never
 * fetched. 126 near-identical templated pages is an ask that gets declined as a
 * quality judgement, and no technical fix addresses a quality judgement. The
 * page this site actually gets surfaced for is a blog post with original prose
 * (209 impressions, against 41 for the homepage). Prose earns crawl here;
 * templates do not.
 *
 * So the set is small and hand-chosen, on the union of two signals:
 *
 *   demand    - >=15 Search Console impressions across the 90 days to
 *               2026-08-13, aggregated over query phrasings rather than per
 *               query string. Note this cuts one way only: a page that was
 *               never crawled cannot have impressions, so zero is silence, not
 *               evidence of no demand, and absence is never held against a pair.
 *   inventory - the largest template counts in the catalog, which are the pages
 *               most likely to serve a real query once they are crawled.
 *
 * Both numbers are recorded per slug so the next person to revisit this knows
 * which signal put a page here. Every slug also has a hand-written guide in
 * pair-guides.ts, and that is a hard requirement rather than a coincidence:
 * asking for a page to be indexed is a claim that it is worth reading, which is
 * exactly the claim the templated version could not support.
 */
export const INDEXABLE_PAIR_SLUGS: ReadonlySet<string> = new Set([
  //                                    impressions / templates
  "discord-and-trello", //                      154 / 6
  "postgresql-and-slack", //                     95 / 1231
  "airtable-and-shopify", //                     70 / 19
  "http-rest-api-and-hubspot", //                61 / 1025
  "asana-and-discord", //                        58 / 4
  "postgresql-and-shopify", //                   51 / 12
  "airtable-and-discord", //                     42 / 87
  "discord-and-notion", //                       29 / 195
  "google-drive-and-notion", //                  28 / 247
  "google-sheets-and-microsoft-teams", //        27 / 700
  "discord-and-hubspot", //                      20 / 72
  "http-rest-api-and-mysql", //                  19 / 726
  "mysql-and-slack", //                          16 / 1020
  "discord-and-jira", //                         15 / 6
  "airtable-and-slack", //                       15 / 971
  // Added 2026-08-20 off the 3-month Search Console read to 2026-08-18. These
  // three were the impression leaders among pages carrying `noindex`, which is
  // a contradiction worth naming: they earned that demand before the tag went
  // on, and the tag then guaranteed the demand could not convert. They stayed
  // out because they had no hand-written guide, which was the right rule; each
  // now has one written against the node graphs of its own templates, so the
  // rule is satisfied rather than waived.
  "discord-and-google-drive", //                 50 / 75
  "airtable-and-google-drive", //                32 / 72
  "mysql-and-twilio", //                          9 / 96
  // Kept on inventory depth: no impressions yet because no crawl yet.
  "google-sheets-and-slack", //                   - / 7332
  "http-rest-api-and-slack", //                   - / 5907
  "google-sheets-and-http-rest-api", //           - / 5671
  "notion-and-slack", //                          - / 1993
  "http-rest-api-and-notion", //                  - / 1792
  "google-sheets-and-notion", //                  - / 1661
  "hubspot-and-slack", //                         - / 1245
  "google-drive-and-slack", //                    - / 988
  "google-drive-and-google-sheets", //            - / 921
  "google-sheets-and-hubspot", //                 - / 835
]);

/**
 * Whether a pair page should be indexed and listed in the sitemap. One
 * predicate drives both the robots tag and the sitemap, because submitting a
 * URL that carries noindex is a contradictory signal.
 */
export function isPairIndexable(pair: IntegrationPair): boolean {
  return INDEXABLE_PAIR_SLUGS.has(pair.slug);
}

const g = globalThis as unknown as {
  __integrations?: Integration[];
  __integrationsBySlug?: Map<string, Integration>;
  __integrationPairs?: IntegrationPair[];
  __integrationPairsBySlug?: Map<string, IntegrationPair>;
};

/** Every integration in the catalog with its template count, most-used first. */
export function getIntegrations(): Integration[] {
  if (!g.__integrations) {
    const counts = new Map<string, number>();
    for (const w of getIndex()) {
      for (const p of w.platforms) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    g.__integrations = [...counts.entries()]
      .map(([name, count]) => ({ name, slug: integrationSlug(name), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return g.__integrations;
}

export function getIntegrationBySlug(slug: string): Integration | undefined {
  if (!g.__integrationsBySlug) {
    g.__integrationsBySlug = new Map(getIntegrations().map((i) => [i.slug, i]));
  }
  return g.__integrationsBySlug.get(slug);
}

/** Every integration pair with enough shared templates to deserve a page. */
export function getIntegrationPairs(): IntegrationPair[] {
  if (!g.__integrationPairs) {
    const bySlug = new Map(getIntegrations().map((i) => [i.slug, i]));
    const counts = new Map<string, number>();

    for (const w of getIndex()) {
      const slugs = [...new Set(w.platforms.map(integrationSlug))].sort();
      for (let i = 0; i < slugs.length; i++) {
        for (let j = i + 1; j < slugs.length; j++) {
          const key = `${slugs[i]}${PAIR_SEP}${slugs[j]}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }

    const pairs: IntegrationPair[] = [];
    for (const [slug, count] of counts) {
      if (count < MIN_PAIR_TEMPLATES) continue;
      const [aSlug, bSlug] = slug.split(PAIR_SEP);
      const a = bySlug.get(aSlug);
      const b = bySlug.get(bSlug);
      if (a && b) pairs.push({ a, b, slug, count });
    }

    g.__integrationPairs = pairs.sort(
      (x, y) => y.count - x.count || x.slug.localeCompare(y.slug),
    );
  }
  return g.__integrationPairs;
}

/**
 * The pair pages we index, in `INDEXABLE_PAIR_SLUGS` order rather than by
 * template count - the list is ordered by demand first, and a page with 154
 * impressions behind it deserves to lead the hub over one with more inventory
 * and no measured interest.
 */
export function getIndexablePairs(): IntegrationPair[] {
  const bySlug = new Map(getIntegrationPairs().map((p) => [p.slug, p]));
  return [...INDEXABLE_PAIR_SLUGS]
    .map((s) => bySlug.get(s))
    .filter((p): p is IntegrationPair => p !== undefined);
}

/** The pair pages that keep their page but carry `noindex, follow`. */
export function getNonIndexablePairs(): IntegrationPair[] {
  return getIntegrationPairs().filter((p) => !isPairIndexable(p));
}

export function getIntegrationPairBySlug(slug: string): IntegrationPair | undefined {
  if (!g.__integrationPairsBySlug) {
    g.__integrationPairsBySlug = new Map(getIntegrationPairs().map((p) => [p.slug, p]));
  }
  return g.__integrationPairsBySlug.get(slug);
}

/**
 * Resolves a reversed pair slug ("discord-and-airtable") to its canonical
 * form ("airtable-and-discord") so the route can 301 instead of serving the
 * same page on two URLs. Returns undefined when the slug is already canonical
 * or isn't a known pair.
 */
export function canonicalPairSlug(slug: string): string | undefined {
  if (!isPairSlug(slug) || getIntegrationPairBySlug(slug)) return undefined;
  const parts = slug.split(PAIR_SEP);
  if (parts.length !== 2) return undefined;
  const flipped = `${parts[1]}${PAIR_SEP}${parts[0]}`;
  return getIntegrationPairBySlug(flipped) ? flipped : undefined;
}

/** True when `p` shares exactly one side with `pair` (and is not `pair`). */
function sharesASide(p: IntegrationPair, pair: IntegrationPair): boolean {
  return (
    p.slug !== pair.slug &&
    (p.a.slug === pair.a.slug ||
      p.b.slug === pair.a.slug ||
      p.a.slug === pair.b.slug ||
      p.b.slug === pair.b.slug)
  );
}

/** Other pairs that share one side with this pair - used for internal linking. */
export function relatedPairs(pair: IntegrationPair, n: number): IntegrationPair[] {
  return getIntegrationPairs()
    .filter((p) => sharesASide(p, pair))
    .slice(0, n);
}

/**
 * At or below this a pair page cannot stand on its inventory alone, so it earns
 * its place by being a good junction: it names the neighbouring pairs that do
 * have depth instead of leaving the visitor at a dead end.
 */
export const THIN_PAIR_TEMPLATES = 20;

/**
 * Neighbouring pairs with strictly more inventory, richest first. `getIntegrationPairs`
 * is already sorted by count, so this preserves that order.
 */
export function richerNeighbourPairs(pair: IntegrationPair, n: number): IntegrationPair[] {
  return getIntegrationPairs()
    .filter((p) => sharesASide(p, pair) && p.count > pair.count)
    .slice(0, n);
}

/** Pairs that include a given integration - used for internal linking. */
export function pairsForIntegration(slug: string, n: number): IntegrationPair[] {
  return getIntegrationPairs()
    .filter((p) => p.a.slug === slug || p.b.slug === slug)
    .slice(0, n);
}

/**
 * How well a template's *title* matches the pair the visitor searched for.
 *
 * Every template on a pair page genuinely contains both nodes - the filter is
 * on the node graph, not the wording. But titles name the most *prominent*
 * platforms, which often are not the pair, so the PostgreSQL + Slack page led
 * with cards reading "Telegram" and "Outlook". Someone arriving from "connect
 * slack to postgresql" reads the titles, not the node graphs, and bounces.
 *
 * 2 = the title names both tools, 1 = one of them, 0 = neither.
 */
export function pairTitleRelevance(title: string, pair: IntegrationPair): 0 | 1 | 2 {
  const t = title.toLowerCase();
  const hit = (name: string) => t.includes(name.toLowerCase());
  return ((hit(pair.a.name) ? 1 : 0) + (hit(pair.b.name) ? 1 : 0)) as 0 | 1 | 2;
}
