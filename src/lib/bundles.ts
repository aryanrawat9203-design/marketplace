import fs from "fs";
import path from "path";
import { getIndex, getCatalog, type IndexItem, type DetailItem } from "./catalog";

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
  individualValue: number;
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

export function getBundles(): Bundle[] {
  if (!g.__bundles) {
    const p = path.join(process.cwd(), "src", "data", "bundles.json");
    g.__bundles = JSON.parse(fs.readFileSync(p, "utf-8")) as Bundle[];
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

// Mirrors the real tier/complexity bands from the catalog upgrade, so a
// bundle's stated progression always matches the actual template architecture.
export function bandFor(item: { tier: string | null; totalNodes: number }): SkillBand {
  if (item.tier === "Starter" || item.tier === "Free") return "Foundation";
  if (item.tier === "Professional") return item.totalNodes <= 14 ? "Core" : "Advanced";
  if (item.tier === "Premium") return "Production";
  return "Architect";
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
