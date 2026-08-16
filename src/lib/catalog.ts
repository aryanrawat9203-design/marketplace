import fs from "fs";
import path from "path";
import type { Screenshots } from "./screenshots";
import { selectFreeTier, applyFreeTier } from "./free-tier";
import { applyPriceModel } from "./price-model";

export type IndexItem = {
  id: string;
  route: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  subcategory: string | null;
  industry: string | null;
  difficulty: string | null;
  tier: string | null;
  platforms: string[];
  aiProviders: string[];
  trigger: string | null;
  demand: number | null;
  value: number | null;
  estValue: string | null;
  short: string | null;
  /** Carried on the index too, because lib/price-model prices from it. */
  totalNodes: number;
  price: number;
  mrp: number;
  off: number;
  free: boolean;
  /** Merged in at read time from Supabase; absent for the vast majority of templates. */
  screenshots?: Screenshots;
};

export type DetailItem = {
  id: string;
  route: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  category: string | null;
  subcategory: string | null;
  industry: string | null;
  difficulty: string | null;
  setup: string | null;
  tier: string | null;
  estValue: string | null;
  platforms: string[];
  aiProviders: string[];
  trigger: string | null;
  demand: number | null;
  value: number | null;
  sourceUrl?: string | null;
  shortDescription: string | null;
  description: string | null;
  longDescription: string | null;
  benefits: string[];
  useCases: string[];
  keywords: string[];
  price: number;
  mrp: number;
  off: number;
  free: boolean;
  workflowFile: string;
  owned?: boolean;
  totalNodes: number;
  /** Merged in at read time from Supabase; absent for the vast majority of templates. */
  screenshots?: Screenshots;
};

export type Taxo = { name: string; count: number };
export type Taxonomy = {
  industries: Taxo[];
  categories: Taxo[];
  subcategories: Taxo[];
  difficulties: Taxo[];
  tiers: Taxo[];
  triggers: Taxo[];
  total: number;
  platformsTop: Taxo[];
  subcategoriesByCategory: Record<string, Taxo[]>;
  categoryGradient: Record<string, string>;
};

export function gradientFor(category: string | null | undefined, taxo: Taxonomy): string {
  return (category && taxo.categoryGradient?.[category]) || "from-violet-500 to-fuchsia-500";
}

const dataDir = path.join(process.cwd(), "src", "data");
function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8")) as T;
}

// Cache across hot-reloads / requests so the big files load only once.
const g = globalThis as unknown as {
  __index?: IndexItem[];
  __catalog?: DetailItem[];
  __taxo?: Taxonomy;
  __byRoute?: Map<string, DetailItem>;
  __aliases?: Record<string, string>;
  __freeIds?: Set<string>;
};

/**
 * Both money rules, in the one order they may run in.
 *
 * The price model prices everything; the free tier then takes its selection
 * back down to zero. Reversed, a free template would be handed a price again.
 * Nothing else in the codebase writes `price`, `mrp`, `off` or `tier` - the
 * fields sitting in catalog.json are stale by design and overwritten here.
 */
function priceItems<T extends IndexItem | DetailItem>(items: T[], ids: Set<string>): T[] {
  return applyFreeTier(applyPriceModel(items), ids);
}

export function getIndex(): IndexItem[] {
  let index = g.__index;
  if (!index) {
    const items = readJson<IndexItem[]>("catalog-index.json");
    g.__freeIds = selectFreeTier(items);
    index = priceItems(items, g.__freeIds);
    g.__index = index;
  }
  return index;
}

/**
 * The free tier is derived from the index (see lib/free-tier.ts) and applied to
 * both records, so a template cannot be free on a listing card and chargeable on
 * its own page.
 */
function freeIds(): Set<string> {
  if (!g.__freeIds) getIndex();
  return g.__freeIds!;
}

export function getCatalog(): DetailItem[] {
  let catalog = g.__catalog;
  if (!catalog) {
    catalog = priceItems(readJson<DetailItem[]>("catalog.json"), freeIds());
    g.__catalog = catalog;
  }
  return catalog;
}
/** Cheapest first, so the tier filter reads as a ladder rather than a ranking. */
const TIER_ORDER = ["Free", "Starter", "Core", "Professional", "Premium", "Enterprise"];

export function getTaxonomy(): Taxonomy {
  if (!g.__taxo) {
    const taxo = readJson<Taxonomy>("taxonomy.json");
    // Tier is derived from the price model now, so the counts stored on disk
    // describe a tier set that no longer exists. Recount from the live index -
    // otherwise the /workflows tier filter offers bands nothing is in, and
    // hides the one band that most of the catalog sits in.
    const counts = new Map<string, number>();
    for (const w of getIndex()) {
      if (w.tier) counts.set(w.tier, (counts.get(w.tier) ?? 0) + 1);
    }
    taxo.tiers = TIER_ORDER.filter((name) => counts.has(name)).map((name) => ({
      name,
      count: counts.get(name)!,
    }));
    g.__taxo = taxo;
  }
  return g.__taxo;
}
// Historical route slugs that named a tool the template does not actually use.
// The catalog's truthfulness rebuild corrected `title` and `platforms` from the
// real node graphs but left `route` frozen, so a slice of URLs contradicted
// their own page. Renaming the route alone would 404 already-indexed URLs and
// break the download links on past orders (both resolve through getByRoute),
// so every rename is recorded here: lookups still succeed on the old slug,
// while the page 301s to the corrected one.
export function routeAliases(): Record<string, string> {
  if (!g.__aliases) g.__aliases = readJson<Record<string, string>>("route-aliases.json");
  return g.__aliases;
}

/** The current slug for a route, following one alias hop. */
export function canonicalRoute(route: string): string {
  return routeAliases()[route] ?? route;
}

export function getByRoute(route: string): DetailItem | undefined {
  if (!g.__byRoute) g.__byRoute = new Map(getCatalog().map((w) => [w.route, w]));
  return g.__byRoute.get(route) ?? g.__byRoute.get(canonicalRoute(route));
}

export type Filters = {
  q?: string;
  industry?: string;
  category?: string;
  subcategory?: string;
  difficulty?: string;
  tier?: string;
  trigger?: string;
  platform?: string;
  /** Second platform filter - powers the /integrations/<a>-and-<b> pair pages. */
  platform2?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

// Query size caps: keep worst-case scoring cost bounded on a public endpoint
// (the scorer runs over the full 10k index per request).
const MAX_QUERY_CHARS = 100;
const MAX_TERMS = 6;

type SearchTerm = { term: string; wordRe: RegExp };

// Regexes are compiled once per query, never per item.
export function prepareTerms(q: string): SearchTerm[] {
  return q
    .slice(0, MAX_QUERY_CHARS)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((term) => ({
      term,
      wordRe: new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    }));
}

// Weighted relevance for one search term against one item. 0 = no match.
function termScore(w: IndexItem, t: SearchTerm): number {
  let score = 0;
  const title = w.title.toLowerCase();
  if (title.includes(t.term)) {
    score += title.startsWith(t.term) ? 25 : 10;
    // extra when the term starts a word ("mail" matching "Gmail" scores lower
    // than matching "Mail merge")
    if (t.wordRe.test(title)) score += 5;
  }
  if (w.platforms.some((p) => p.toLowerCase() === t.term)) score += 12;
  else if (w.platforms.some((p) => p.toLowerCase().includes(t.term))) score += 7;
  if (w.aiProviders.some((p) => p.toLowerCase().includes(t.term))) score += 7;
  if (w.category?.toLowerCase().includes(t.term)) score += 6;
  if (w.subcategory?.toLowerCase().includes(t.term)) score += 6;
  if (w.industry?.toLowerCase().includes(t.term)) score += 5;
  if (w.short?.toLowerCase().includes(t.term)) score += 4;
  if (w.trigger?.toLowerCase().includes(t.term)) score += 2;
  return score;
}

// Every term must match somewhere (AND); relevance is the summed term scores
// with a small popularity tiebreak.
export function searchScore(w: IndexItem, terms: SearchTerm[]): number {
  let total = 0;
  for (const t of terms) {
    const s = termScore(w, t);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

export function queryCatalog(f: Filters) {
  let items = getIndex();
  const q = f.q?.trim().toLowerCase();
  let scores: Map<string, number> | undefined;
  if (q) {
    const terms = prepareTerms(q);
    scores = new Map();
    items = items.filter((w) => {
      const s = searchScore(w, terms);
      if (s > 0) scores!.set(w.id, s);
      return s > 0;
    });
  }
  if (f.industry) items = items.filter((w) => w.industry === f.industry);
  if (f.category) items = items.filter((w) => w.category === f.category);
  if (f.subcategory) items = items.filter((w) => w.subcategory === f.subcategory);
  if (f.difficulty) items = items.filter((w) => w.difficulty === f.difficulty);
  if (f.tier) items = items.filter((w) => w.tier === f.tier);
  if (f.trigger) items = items.filter((w) => w.trigger === f.trigger);
  if (f.platform) items = items.filter((w) => w.platforms.includes(f.platform!));
  if (f.platform2) items = items.filter((w) => w.platforms.includes(f.platform2!));

  // With a search query and no explicit sort, order by relevance.
  const sort = f.sort || (scores ? "relevance" : "demand");
  items = [...items].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "value") return (b.value ?? 0) - (a.value ?? 0);
    if (sort === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
    if (sort === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
    if (sort === "relevance" && scores) {
      const d = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
      if (d !== 0) return d;
    }
    return (b.demand ?? 0) - (a.demand ?? 0);
  });

  const total = items.length;
  const perPage = f.perPage ?? 24;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, f.page ?? 1), pages);
  const start = (page - 1) * perPage;
  return { items: items.slice(start, start + perPage), total, page, pages, perPage };
}

export function topByDemand(n: number): IndexItem[] {
  return [...getIndex()].sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0)).slice(0, n);
}

export function freeSamples(n: number): IndexItem[] {
  return getIndex()
    .filter((w) => w.free)
    .sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0))
    .slice(0, n);
}

export type Suggestions = {
  templates: Array<{
    route: string;
    title: string;
    category: string | null;
    price: number;
    free: boolean;
  }>;
  categories: Taxo[];
  platforms: Taxo[];
  total: number;
};

/** Lightweight typeahead lookup backing the search box dropdown. */
export function suggest(qRaw: string): Suggestions {
  const q = qRaw.trim().toLowerCase().slice(0, MAX_QUERY_CHARS);
  const empty: Suggestions = { templates: [], categories: [], platforms: [], total: 0 };
  if (q.length < 2) return empty;
  const terms = prepareTerms(q);

  const scored: Array<{ w: IndexItem; s: number }> = [];
  for (const w of getIndex()) {
    const s = searchScore(w, terms);
    if (s > 0) scored.push({ w, s });
  }
  scored.sort((a, b) => b.s - a.s || (b.w.demand ?? 0) - (a.w.demand ?? 0));

  const taxo = getTaxonomy();
  return {
    templates: scored.slice(0, 6).map(({ w }) => ({
      route: w.route,
      title: w.title,
      category: w.category,
      price: w.price,
      free: w.free,
    })),
    categories: taxo.categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3),
    platforms: taxo.platformsTop.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 3),
    total: scored.length,
  };
}

/**
 * Related templates for a product page.
 *
 * Category and industry alone produced recommendations that shared a theme but
 * none of the tools: a Trello -> Discord page suggested four HubSpot/Sheets/Slack
 * workflows. Someone reading a Trello page is, by revealed preference, a Trello
 * user, so shared platforms are weighted above everything except an exact
 * subcategory match. Demand only breaks ties.
 */
export function related(item: DetailItem, n: number): IndexItem[] {
  const own = new Set(item.platforms);
  const score = (w: IndexItem) => {
    const shared = w.platforms.reduce((acc, p) => acc + (own.has(p) ? 1 : 0), 0);
    return (
      shared * 10 +
      (w.subcategory && w.subcategory === item.subcategory ? 6 : 0) +
      (w.category === item.category ? 3 : 0) +
      (w.industry === item.industry ? 1 : 0)
    );
  };
  return getIndex()
    .filter(
      (w) =>
        w.id !== item.id &&
        (w.category === item.category ||
          w.industry === item.industry ||
          w.platforms.some((p) => own.has(p))),
    )
    .sort((a, b) => score(b) - score(a) || (b.demand ?? 0) - (a.demand ?? 0))
    .slice(0, n);
}
