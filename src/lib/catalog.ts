import fs from "fs";
import path from "path";

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
  price: number;
  mrp: number;
  off: number;
  free: boolean;
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
};

export function getIndex(): IndexItem[] {
  if (!g.__index) g.__index = readJson<IndexItem[]>("catalog-index.json");
  return g.__index;
}
export function getCatalog(): DetailItem[] {
  if (!g.__catalog) g.__catalog = readJson<DetailItem[]>("catalog.json");
  return g.__catalog;
}
export function getTaxonomy(): Taxonomy {
  if (!g.__taxo) g.__taxo = readJson<Taxonomy>("taxonomy.json");
  return g.__taxo;
}
export function getByRoute(route: string): DetailItem | undefined {
  if (!g.__byRoute) g.__byRoute = new Map(getCatalog().map((w) => [w.route, w]));
  return g.__byRoute.get(route);
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
  sort?: string;
  page?: number;
  perPage?: number;
};

export function queryCatalog(f: Filters) {
  let items = getIndex();
  const q = f.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        (w.short?.toLowerCase().includes(q) ?? false) ||
        (w.category?.toLowerCase().includes(q) ?? false) ||
        (w.industry?.toLowerCase().includes(q) ?? false) ||
        w.platforms.some((p) => p.toLowerCase().includes(q)),
    );
  }
  if (f.industry) items = items.filter((w) => w.industry === f.industry);
  if (f.category) items = items.filter((w) => w.category === f.category);
  if (f.subcategory) items = items.filter((w) => w.subcategory === f.subcategory);
  if (f.difficulty) items = items.filter((w) => w.difficulty === f.difficulty);
  if (f.tier) items = items.filter((w) => w.tier === f.tier);
  if (f.trigger) items = items.filter((w) => w.trigger === f.trigger);
  if (f.platform) items = items.filter((w) => w.platforms.includes(f.platform!));

  const sort = f.sort || "demand";
  items = [...items].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "value") return (b.value ?? 0) - (a.value ?? 0);
    if (sort === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
    if (sort === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
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

export function related(item: DetailItem, n: number): IndexItem[] {
  return getIndex()
    .filter((w) => w.id !== item.id && (w.category === item.category || w.industry === item.industry))
    .sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0))
    .slice(0, n);
}
