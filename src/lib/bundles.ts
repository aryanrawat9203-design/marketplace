import fs from "fs";
import path from "path";
import { getIndex, getCatalog, type IndexItem, type DetailItem } from "./catalog";
import { PRICE_POINTS } from "./price-model";

export type BundleType = "full" | "lifetime" | "category" | "subcategory" | "practice";

export type Bundle = {
  slug: string;
  type: BundleType;
  name: string;
  tagline: string;
  count: number;
  price: number;
  mrp: number;
  off: number;
  gradient: string;
  category?: string;
  subcategory?: string;
  // "practice" bundles only: explicit curriculum order (simple -> complex),
  // not derivable from a category/subcategory filter.
  items?: string[];
  audience?: string;
  skillLevel?: string;
  learningOutcome?: string;
  sellingPosition?: string;
};

const g = globalThis as unknown as {
  __bundles?: Bundle[];
  __bundleBySlug?: Map<string, Bundle>;
};

/**
 * What a bundle costs, by how much is in it.
 *
 * Same reasoning as lib/price-model.ts: a bundle price stored on disk is a
 * price nobody re-checks. These are sized off the *resolved* member list, not
 * the `count` field on the record - `count` is a snapshot that has already
 * drifted from the catalog once.
 */
const SUBCATEGORY_BANDS = [
  { upTo: 25, price: 3999 },
  { upTo: 75, price: 6999 },
  { upTo: 200, price: 9999 },
  { upTo: Infinity, price: 12999 },
];
const CATEGORY_BANDS = [
  { upTo: 100, price: 14999 },
  { upTo: 400, price: 19999 },
  { upTo: 1000, price: 24999 },
  { upTo: Infinity, price: 29999 },
];
const FULL_LIBRARY_PRICE = 24999;
const LIFETIME_PRICE = 39999;

// Practice packs are a curriculum, not a filter: what they're worth tracks the
// distance travelled, not the file count, so each is priced by name.
const PRACTICE_PRICES: Record<string, number> = {
  "getting-started-pack": 1999,
  "skill-builder-pack": 4999,
  "job-ready-pack": 8999,
  "automation-architect-pack": 12999,
  "ai-agent-specialist-pack": 6999,
  "lead-gen-crm-specialist-pack": 5999,
  "complete-mastery-bundle": 17999,
};

function bandPrice(bands: Array<{ upTo: number; price: number }>, n: number): number {
  return (bands.find((b) => n <= b.upTo) ?? bands[bands.length - 1]).price;
}

/** Down to the nearest price ending in 9, the shape every other price here has. */
function roundDownTo9(n: number): number {
  return n < 9 ? 0 : Math.floor((n - 9) / 10) * 10 + 9;
}

/**
 * A bundle must never cost more than a decent discount on buying its members
 * one at a time. The bands alone don't guarantee that - a thin subcategory can
 * fall in the same band as one four times its size - so the band price is a
 * ceiling and 60% of the real member total is the other one. Without this a
 * one-template bundle would out-price the single template inside it, which is
 * the kind of thing a buyer notices and a spreadsheet doesn't.
 */
const BUNDLE_DISCOUNT = 0.6;

function priceBundle(b: Bundle, members: IndexItem[]): number {
  const memberSum = members.reduce((sum, w) => sum + w.price, 0);

  const ceiling =
    b.type === "full"
      ? FULL_LIBRARY_PRICE
      : b.type === "lifetime"
        ? LIFETIME_PRICE
        : b.type === "practice"
          ? (PRACTICE_PRICES[b.slug] ?? bandPrice(SUBCATEGORY_BANDS, members.length))
          : b.type === "category"
            ? bandPrice(CATEGORY_BANDS, members.length)
            : bandPrice(SUBCATEGORY_BANDS, members.length);

  // Floor at the cheapest single template: a bundle of entirely free templates
  // would otherwise price at zero and take a ₹0 order through checkout.
  return Math.max(PRICE_POINTS[0], Math.min(ceiling, roundDownTo9(memberSum * BUNDLE_DISCOUNT)));
}

/** `{n}` in a stored name or tagline, filled from the resolved member count. */
function withCount(s: string, n: number): string {
  return s.replace(/\{n\}/g, n.toLocaleString("en-IN"));
}

export function getBundles(): Bundle[] {
  if (!g.__bundles) {
    const p = path.join(process.cwd(), "src", "data", "bundles.json");
    const bundles = JSON.parse(fs.readFileSync(p, "utf-8")) as Bundle[];
    for (const b of bundles) {
      const members = bundleMembersIndex(b);
      // `count` on disk is a snapshot, and it had already gone stale: the
      // full-library record claimed 10,463 against a catalog of 10,489, and 12
      // category bundles were off by a handful each. Every surface that prints
      // a bundle size reads this field, and the counts written into the names
      // and taglines came from the same snapshot - so all three are resolved
      // here from the real member list rather than trusted from the file.
      b.count = members.length;
      b.name = withCount(b.name, b.count);
      b.tagline = withCount(b.tagline, b.count);
      b.price = priceBundle(b, members);
      b.mrp = b.price;
      b.off = 0;
    }
    g.__bundles = bundles;
  }
  return g.__bundles;
}

export function getBundle(slug: string): Bundle | undefined {
  if (!g.__bundleBySlug) g.__bundleBySlug = new Map(getBundles().map((b) => [b.slug, b]));
  return g.__bundleBySlug.get(slug);
}

export function bundlesByType(type: BundleType): Bundle[] {
  return getBundles().filter((b) => b.type === type);
}

export function categoryBundles(): Bundle[] {
  return bundlesByType("category").sort((a, b) => b.count - a.count);
}

export function subcategoryBundles(): Bundle[] {
  return bundlesByType("subcategory").sort((a, b) => b.count - a.count);
}

export function subcategoryBundlesFor(category: string): Bundle[] {
  return bundlesByType("subcategory")
    .filter((b) => b.category === category)
    .sort((a, b) => b.count - a.count);
}

export function bundleForCategory(category: string): Bundle | undefined {
  return getBundles().find((b) => b.type === "category" && b.category === category);
}

export function bundleForSubcategory(category: string, subcategory: string): Bundle | undefined {
  return getBundles().find(
    (b) => b.type === "subcategory" && b.category === category && b.subcategory === subcategory,
  );
}

export function fullLibrary(): Bundle | undefined {
  return getBundles().find((b) => b.type === "full");
}
export function lifetime(): Bundle | undefined {
  return getBundles().find((b) => b.type === "lifetime");
}

export function practiceBundles(): Bundle[] {
  return bundlesByType("practice");
}

export type SkillBand = "Foundation" | "Core" | "Advanced" | "Production" | "Architect";

// One band per price tier. The tiers come out of lib/price-model.ts, which
// scores difficulty, node count, value and demand - so a template's stated
// place in the curriculum is the same judgement that set its price, and the
// two cannot say different things about the same workflow.
const BAND_BY_TIER: Record<string, SkillBand> = {
  Free: "Foundation",
  Starter: "Foundation",
  Core: "Core",
  Professional: "Advanced",
  Premium: "Production",
  Enterprise: "Architect",
};

export function bandFor(item: { tier: string | null }): SkillBand {
  return BAND_BY_TIER[item.tier ?? ""] ?? "Architect";
}

function byCurriculumOrder<T extends { id: string }>(items: string[], all: T[]): T[] {
  const order = new Map(items.map((id, i) => [id, i]));
  return all.filter((w) => order.has(w.id)).sort((a, z) => order.get(a.id)! - order.get(z.id)!);
}

export function bundleMembersIndex(b: Bundle): IndexItem[] {
  const idx = getIndex();
  if (b.type === "practice") return byCurriculumOrder(b.items ?? [], idx);
  if (b.type === "full" || b.type === "lifetime") return idx;
  if (b.type === "category") return idx.filter((w) => w.category === b.category);
  return idx.filter((w) => w.category === b.category && w.subcategory === b.subcategory);
}

export function bundlePreview(b: Bundle, n: number): IndexItem[] {
  if (b.type === "practice") return bundleMembersIndex(b).slice(0, n);
  return [...bundleMembersIndex(b)]
    .sort((a, z) => (z.demand ?? 0) - (a.demand ?? 0))
    .slice(0, n);
}

export function bundleMembersDetail(b: Bundle): DetailItem[] {
  const all = getCatalog();
  if (b.type === "practice") return byCurriculumOrder(b.items ?? [], all);
  if (b.type === "full" || b.type === "lifetime") return all;
  if (b.type === "category") return all.filter((w) => w.category === b.category);
  return all.filter((w) => w.category === b.category && w.subcategory === b.subcategory);
}
