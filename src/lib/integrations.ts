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
 * Pair slugs with measured Search Console demand. These stay indexable however
 * thin the inventory gets, because a page that earns impressions is answering a
 * real query - the fix for it is more content, not removal from the index.
 *
 * Impressions are the 90 days to 2026-08-13. Add a slug here only with a number
 * from GSC behind it; a guess defeats the point of having a threshold at all.
 */
export const PAIR_DEMAND_SLUGS: ReadonlySet<string> = new Set([
  "asana-and-discord", // 58 impressions ("asana discord integration")
  "discord-and-trello", // 128 impressions ("discord trello" + "trello discord")
]);

/**
 * Below this a pair page is real but too thin to deserve a place in the index:
 * three or four templates plus boilerplate is the kind of page that dilutes a
 * site's average quality rather than adding to it. They stay reachable, linked
 * and crawlable (robots: noindex, follow) - they are just not submitted.
 *
 * Deliberately one above the top of the current thin tail: 11 pairs sit at 3-4
 * templates and the next rung up is 5. Set as a count rather than a hand-listed
 * set of slugs so it stays correct as inventory moves - a pair that grows past
 * the threshold becomes indexable on the next build with no code change.
 */
export const MIN_INDEXABLE_PAIR_TEMPLATES = 5;

/**
 * Whether a pair page should be indexed and listed in the sitemap.
 * Demand beats the threshold; otherwise inventory has to clear it.
 */
export function isPairIndexable(pair: IntegrationPair): boolean {
  return pair.count >= MIN_INDEXABLE_PAIR_TEMPLATES || PAIR_DEMAND_SLUGS.has(pair.slug);
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
