/**
 * Rebuilds src/data/catalog-index.json from src/data/catalog.json.
 *
 * The index is the lightweight record every listing, search and collection
 * surface reads; catalog.json is the full detail record the product page
 * reads. They must never disagree — on 2026-08-06 they disagreed on `mrp`
 * and `off` for 10,514 of 10,524 templates, because a fake-discount cleanup
 * updated catalog.json only. The index kept serving mrp=499/off=60 against a
 * price of 199, so collection totals still summed a discount that no longer
 * existed anywhere else on the site.
 *
 * Deriving the index instead of hand-editing it makes that class of drift
 * impossible. Run this after any change to catalog.json:
 *
 *   node scripts/build-catalog-index.mjs
 *
 * Pass --check to fail without writing (useful before a commit).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, "..", "src", "data");
const CATALOG = path.join(DATA, "catalog.json");
const INDEX = path.join(DATA, "catalog-index.json");

const check = process.argv.includes("--check");

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

// Field set and order are load-bearing: they match the IndexItem type in
// src/lib/catalog.ts and keep the on-disk diff readable.
const index = catalog.map((w) => ({
  id: w.id,
  route: w.route,
  title: w.title,
  subtitle: w.subtitle,
  category: w.category,
  subcategory: w.subcategory,
  industry: w.industry,
  difficulty: w.difficulty,
  tier: w.tier,
  platforms: w.platforms,
  aiProviders: w.aiProviders,
  trigger: w.trigger,
  demand: w.demand,
  value: w.value,
  short: w.shortDescription,
  price: w.price,
  mrp: w.mrp,
  free: w.free,
  off: w.off,
}));

const next = JSON.stringify(index);
const prev = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, "utf8") : "";

if (next === prev) {
  console.log(`catalog-index.json already in sync (${index.length} records)`);
  process.exit(0);
}

if (check) {
  console.error(`catalog-index.json is STALE — run: node scripts/build-catalog-index.mjs`);
  process.exit(1);
}

fs.writeFileSync(INDEX, next);
console.log(`catalog-index.json rebuilt from catalog.json (${index.length} records)`);
