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

/** Other pairs that share one side with this pair - used for internal linking. */
export function relatedPairs(pair: IntegrationPair, n: number): IntegrationPair[] {
  return getIntegrationPairs()
    .filter(
      (p) =>
        p.slug !== pair.slug &&
        (p.a.slug === pair.a.slug ||
          p.b.slug === pair.a.slug ||
          p.a.slug === pair.b.slug ||
          p.b.slug === pair.b.slug),
    )
    .slice(0, n);
}

/** Pairs that include a given integration - used for internal linking. */
export function pairsForIntegration(slug: string, n: number): IntegrationPair[] {
  return getIntegrationPairs()
    .filter((p) => p.a.slug === slug || p.b.slug === slug)
    .slice(0, n);
}
