/**
 * Fails if anything in the source tree states a template count the catalog
 * contradicts.
 *
 * This used to compare one literal in src/lib/site.ts against catalog.json,
 * which is why it caught nothing when the same stale 10,463 was also sitting
 * in the full-library bundle's name, in its `count`, and in a dozen category
 * taglines. The count is now generated (src/data/catalog-count.json) and the
 * bundle records carry a `{n}` token instead of a number, so the job here is
 * to make sure nobody quietly types a catalog-sized figure back in.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const DATA = path.join(root, "src", "data");

const catalog = JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"));
const total = catalog.length;

const failures = [];

// 1. The generated count.
const counted = JSON.parse(fs.readFileSync(path.join(DATA, "catalog-count.json"), "utf8")).total;
if (counted !== total) {
  failures.push(
    `src/data/catalog-count.json says ${counted}, catalog.json has ${total} — run: node scripts/build-catalog-index.mjs`,
  );
}

// 2. Any catalog-sized number written into source or bundle copy as a claim
//    about how many templates there are.
//
//    Scoped deliberately: a bare number in this band is usually a price or an
//    SVG entity, and a "templates" nearby is usually preceded by a bundle-sized
//    number that has nothing to do with the catalog total. What is being caught
//    is the intersection - catalog-sized AND described as templates. A trailing
//    "+" marks a rounded claim ("10,000+ templates"), which stays true as the
//    catalog grows and so is not compared against the exact size. The lookbehind
//    drops numeric character references - `&#10003;` is a checkmark, and the
//    word after it is very often "templates".
const CATALOG_CLAIM = /(?<!&#)\b(10,?\d{3})(\+?)[^\n]{0,40}?templates?\b/gi;

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // The catalog itself is data, not a claim about the catalog.
      if (p === DATA) continue;
      out.push(...sourceFiles(p));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = [...sourceFiles(path.join(root, "src")), path.join(DATA, "bundles.json")];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(CATALOG_CLAIM)) {
    if (m[2] === "+") continue;
    if (Number(m[1].replace(/,/g, "")) === total) continue;
    const line = text.slice(0, m.index).split("\n").length;
    failures.push(
      `${path.relative(root, file).replace(/\\/g, "/")}:${line} states "${m[1]}" but the catalog has ${total}`,
    );
  }
}

if (failures.length > 0) {
  for (const f of failures) console.error(f);
  process.exit(1);
}
console.log(`template counts agree with the catalog (${total})`);
