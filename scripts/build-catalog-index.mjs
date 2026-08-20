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
 * impossible.
 *
 * Note that `price`/`mrp`/`off`/`tier`/`free` are copied through but are no
 * longer what the site charges: src/lib/price-model.ts and src/lib/free-tier.ts
 * recompute all five at load, for both files, from the same rule. What still
 * matters here is that the *inputs* to those rules - difficulty, totalNodes,
 * value, demand, category, platforms - reach the index intact.
 *
 * Run this after any change to catalog.json:
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
const COUNT = path.join(DATA, "catalog-count.json");

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
  // Carried even though no listing renders it: src/lib/price-model.ts prices
  // from the node count, and the index has to reach the same price as the
  // detail record or a card and its product page disagree.
  totalNodes: w.totalNodes,
  price: w.price,
  mrp: w.mrp,
  free: w.free,
  off: w.off,
}));

// src/lib/site.ts reads this instead of declaring the catalog size as a
// literal, which is how it came to claim 10,463 templates against a catalog
// of 10,489 for weeks. A number nobody has to remember to update cannot drift.
const outputs = [
  { file: INDEX, name: "catalog-index.json", body: JSON.stringify(index) },
  { file: COUNT, name: "catalog-count.json", body: JSON.stringify({ total: catalog.length }) },
];

const stale = outputs.filter(
  (o) => (fs.existsSync(o.file) ? fs.readFileSync(o.file, "utf8") : "") !== o.body,
);

if (stale.length === 0) {
  console.log(`catalog data already in sync (${index.length} records)`);
  process.exit(0);
}

if (check) {
  console.error(
    `${stale.map((o) => o.name).join(", ")} is STALE — run: node scripts/build-catalog-index.mjs`,
  );
  process.exit(1);
}

for (const o of stale) fs.writeFileSync(o.file, o.body);
console.log(`rebuilt ${stale.map((o) => o.name).join(", ")} from catalog.json (${index.length} records)`);
