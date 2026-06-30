import fs from "fs";
import path from "path";
import { getIndex, getCatalog, type IndexItem, type DetailItem } from "./catalog";

export type BundleType = "full" | "lifetime" | "category" | "subcategory";

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

export function bundleMembersIndex(b: Bundle): IndexItem[] {
  const idx = getIndex();
  if (b.type === "full" || b.type === "lifetime") return idx;
  if (b.type === "category") return idx.filter((w) => w.category === b.category);
  return idx.filter((w) => w.category === b.category && w.subcategory === b.subcategory);
}

export function bundlePreview(b: Bundle, n: number): IndexItem[] {
  return [...bundleMembersIndex(b)]
    .sort((a, z) => (z.demand ?? 0) - (a.demand ?? 0))
    .slice(0, n);
}

export function bundleMembersDetail(b: Bundle): DetailItem[] {
  const all = getCatalog();
  if (b.type === "full" || b.type === "lifetime") return all;
  if (b.type === "category") return all.filter((w) => w.category === b.category);
  return all.filter((w) => w.category === b.category && w.subcategory === b.subcategory);
}
