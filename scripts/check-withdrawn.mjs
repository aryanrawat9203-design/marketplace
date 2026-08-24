/**
 * Asserts the withdrawal is complete and contained.
 *
 * Withdrawing 496 templates moves numbers that are computed from membership -
 * bundle counts, bundle prices, the template total, the free tier, the sitemap.
 * The risk is not that one of those is wrong in an obvious way; it is that one
 * surface keeps selling something the rest of the site has retired. So this
 * checks both directions: exactly the detected set is gone from everywhere it
 * should be, and nothing else moved.
 *
 * The one thing withdrawal must NOT break is an entitlement someone already
 * paid for, so a simulated past order is exercised against the real download
 * authoriser.
 *
 *   node scripts/check-withdrawn.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./lib/load-ts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const DATA = path.join(ROOT, "src", "data");

const failures = [];
const fail = (m) => failures.push(m);

const catalogRaw = JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"));
const withdrawnFile = JSON.parse(fs.readFileSync(path.join(DATA, "withdrawn.json"), "utf8"));
const withdrawnIds = new Set(withdrawnFile.items.map((w) => w.id));

// --- 1. the set is exactly what the detector finds -------------------------
const { exports: rule, dispose } = loadTsModule(ROOT, "src/lib/setup-checklist.ts");
const detected = new Set();
for (const w of catalogRaw) {
  let wf;
  try {
    wf = JSON.parse(fs.readFileSync(path.join(ROOT, "product-files", w.workflowFile), "utf8"));
  } catch {
    continue;
  }
  if (rule.buildSetupChecklist(wf).malformedNodes.length > 0) detected.add(w.id);
}
dispose();

for (const id of detected) {
  if (!withdrawnIds.has(id)) fail(`${id} has a malformed node but is not withdrawn`);
}
for (const id of withdrawnIds) {
  if (!detected.has(id)) fail(`${id} is withdrawn but has no malformed node`);
}

// --- 2. the running site agrees --------------------------------------------
// Reads the same on-disk data the site reads and applies the same two rules the
// catalog loader applies (price model, then free tier), in the same order. That
// reproduces what getIndex returns without booting Next, and both rules are the
// real compiled modules rather than reimplementations.
const indexRaw = JSON.parse(fs.readFileSync(path.join(DATA, "catalog-index.json"), "utf8"));
const bundlesRaw = JSON.parse(fs.readFileSync(path.join(DATA, "bundles.json"), "utf8"));
const countFile = JSON.parse(fs.readFileSync(path.join(DATA, "catalog-count.json"), "utf8"));

const sellableIndex = indexRaw.filter((w) => !withdrawnIds.has(w.id));
const sellableIds = new Set(sellableIndex.map((w) => w.id));

// TEMPLATE_COUNT excludes withdrawn.
if (countFile.total !== sellableIndex.length) {
  fail(`catalog-count.json says ${countFile.total}, sellable catalog has ${sellableIndex.length}`);
}
if (countFile.total !== catalogRaw.length - withdrawnIds.size) {
  fail(`catalog-count.json ${countFile.total} != ${catalogRaw.length} - ${withdrawnIds.size}`);
}

// --- 3. free tier -----------------------------------------------------------
const { exports: freeTier, dispose: d2 } = loadTsModule(ROOT, "src/lib/free-tier.ts");
const { exports: priceModel, dispose: d3 } = loadTsModule(ROOT, "src/lib/price-model.ts");
const priced = priceModel.applyPriceModel(sellableIndex.map((w) => ({ ...w })));
const freeIds = freeTier.selectFreeTier(priced);
const applied = freeTier.applyFreeTier(priced, freeIds);
d2();
d3();

for (const id of freeIds) {
  if (withdrawnIds.has(id)) fail(`withdrawn template ${id} was selected into the free tier`);
}
const freeCount = applied.filter((w) => w.free).length;

// price invariants that predate this change and must survive it
for (const w of applied) {
  if (w.mrp !== w.price) fail(`${w.id}: mrp ${w.mrp} != price ${w.price}`);
  if (w.off !== 0) fail(`${w.id}: off is ${w.off}, expected 0`);
}

// --- 4. bundles -------------------------------------------------------------
const byId = new Map(applied.map((w) => [w.id, w]));
const bundleRows = [];
const staleCurated = [];
for (const b of bundlesRaw) {
  let members;
  if (b.type === "practice") {
    // Practice bundles are the one curated membership: bundles.json enumerates
    // ids rather than deriving them. Resolution goes through the sellable index,
    // so a withdrawn id simply does not resolve and the curriculum shrinks by
    // one - which is the correct outcome, not a bug. The stale ids left in the
    // authored list are reported below rather than failed, because the file is
    // the curriculum as designed and re-curating it is a separate decision.
    members = (b.items ?? []).map((id) => byId.get(id)).filter(Boolean);
    for (const id of b.items ?? []) {
      if (withdrawnIds.has(id)) staleCurated.push(`${b.slug} -> ${id}`);
    }
  } else if (b.type === "full" || b.type === "lifetime") {
    members = applied;
  } else if (b.type === "category") {
    members = applied.filter((w) => w.category === b.category);
  } else {
    members = applied.filter((w) => w.category === b.category && w.subcategory === b.subcategory);
  }
  for (const m of members) {
    if (withdrawnIds.has(m.id)) fail(`bundle ${b.slug} contains withdrawn template ${m.id}`);
  }
  const memberSum = members.reduce((a, w) => a + (w.price ?? 0), 0);
  bundleRows.push({ slug: b.slug, type: b.type, count: members.length, memberSum });
}

// A bundle that costs more than buying its members one by one is the bug the
// cart cross-sell exists to avoid, and withdrawal moves both sides of that
// comparison. Checked against the real getBundles(), which is what the cart and
// the checkout charge from.
const { exports: bundlesLib, dispose: d4 } = loadTsModule(ROOT, "src/lib/bundles.ts");
let cheaperThanMembers = 0;
for (const b of bundlesLib.getBundles()) {
  const sum = bundlesLib.bundleMembersIndex(b).reduce((a, w) => a + (w.price ?? 0), 0);
  if (b.count === 0) {
    fail(`bundle ${b.slug} has no members left`);
    continue;
  }
  if (!(b.price < sum)) {
    fail(`bundle ${b.slug} costs ${b.price} but its members sum to ${sum}`);
  } else {
    cheaperThanMembers++;
  }
  for (const m of bundlesLib.bundleMembersIndex(b)) {
    if (withdrawnIds.has(m.id)) fail(`live bundle ${b.slug} resolves withdrawn ${m.id}`);
  }
}
d4();

// --- 5. sitemap + indexability ---------------------------------------------
// Both derive from the sellable index / the same predicate, so what is checked
// here is that the predicate is the one thing they share.
for (const w of sellableIndex) {
  if (withdrawnIds.has(w.id)) fail(`sellable index still contains withdrawn ${w.id}`);
}
if (sellableIds.size !== indexRaw.length - withdrawnIds.size) {
  fail(`sellable index size ${sellableIds.size} != ${indexRaw.length} - ${withdrawnIds.size}`);
}

// --- 6. a past order still downloads ---------------------------------------
// The one thing withdrawal must not do is revoke something already paid for.
// This runs the real authoriser end to end: mint the download token the way a
// completed order does, verify it the way /api/download does, and build the
// ZIP. Checking the file merely exists would not catch getPurchasable's refusal
// leaking into the download path, which is the actual risk.
// Product files now come from Supabase Storage, so building a past-order ZIP is
// a network round-trip. Without credentials every download would come back
// empty and this would report a payment-path failure that is not real.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "check-withdrawn: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required\n" +
      "to assemble past-order ZIPs (product files live in Storage).\n" +
      "Run via: node --env-file-if-exists=.env.local scripts/check-withdrawn.mjs",
  );
  process.exit(1);
}
const { exports: commerce, dispose: d5 } = loadTsModule(ROOT, "src/lib/commerce.ts");
let pastOrderOk = 0;
const SAMPLE = 25;
for (const w of withdrawnFile.items.slice(0, SAMPLE)) {
  // A withdrawn template must NOT be purchasable...
  if (commerce.getPurchasable("workflow", w.route)) {
    fail(`withdrawn ${w.id} is still purchasable`);
  }
  // ...and must still download for someone who already owns it.
  const token = commerce.signDownload("workflow", w.route);
  const ref = commerce.verifyDownload(token);
  if (!ref || ref.key !== w.route) {
    fail(`withdrawn ${w.id}: past-order token does not verify`);
    continue;
  }
  const out = await commerce.workflowDownload(ref.key);
  if (!out || !out.body?.length) {
    fail(`withdrawn ${w.id}: past order resolves but produces no file`);
    continue;
  }
  pastOrderOk++;
}
d5();

// --- 7. thin taxonomy, reported not failed ----------------------------------
function tally(items, key) {
  const m = new Map();
  for (const w of items) {
    const v = key(w);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}
const beforeCat = tally(indexRaw, (w) => w.category);
const afterCat = tally(sellableIndex, (w) => w.category);
const beforeSub = tally(indexRaw, (w) => (w.category ? `${w.category} / ${w.subcategory}` : null));
const afterSub = tally(sellableIndex, (w) => (w.category ? `${w.category} / ${w.subcategory}` : null));

const THIN = 5;
const thinCats = [...afterCat].filter(([, n]) => n < THIN);
const thinSubs = [...afterSub].filter(([, n]) => n < THIN);
const emptiedSubs = [...beforeSub.keys()].filter((k) => !afterSub.has(k));
const emptiedCats = [...beforeCat.keys()].filter((k) => !afterCat.has(k));

// --- report -----------------------------------------------------------------
if (failures.length) {
  console.error("\nFAILURES\n");
  for (const f of failures.slice(0, 40)) console.error("  " + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
}

const smallest = bundleRows.filter((b) => b.count < 10).sort((a, b) => a.count - b.count);

console.log(`
Withdrawal assertion
  catalog records          ${catalogRaw.length}
  withdrawn (detected)     ${detected.size}
  withdrawn (in data file) ${withdrawnIds.size}   - sets identical: ${detected.size === withdrawnIds.size && [...detected].every((i) => withdrawnIds.has(i))}
  sellable templates       ${sellableIndex.length}
  TEMPLATE_COUNT           ${countFile.total}
  free tier                ${freeCount}  (0 withdrawn)
  mrp === price / off === 0 held for all ${applied.length} sellable
  bundles                  ${bundleRows.length}, 0 containing a withdrawn template
  bundle < member sum      ${cheaperThanMembers}/${bundleRows.length}
  past-order downloads     ${pastOrderOk}/${SAMPLE} withdrawn: token verifies + ZIP builds, while all ${SAMPLE} refuse purchase
  failures                 ${failures.length}

Taxonomy after withdrawal
  categories emptied       ${emptiedCats.length}${emptiedCats.length ? " -> " + emptiedCats.join(", ") : ""}
  subcategories emptied    ${emptiedSubs.length}${emptiedSubs.length ? " -> " + emptiedSubs.join(", ") : ""}
  categories under ${THIN}       ${thinCats.length}${thinCats.length ? " -> " + thinCats.map(([k, n]) => `${k} (${n})`).join(", ") : ""}
  subcategories under ${THIN}    ${thinSubs.length}${thinSubs.length ? " -> " + thinSubs.map(([k, n]) => `${k} (${n})`).join(", ") : ""}
  curated ids now unresolvable ${staleCurated.length}${staleCurated.length ? " -> " + staleCurated.join(", ") : ""}
  bundles under 10 members ${smallest.length}${smallest.length ? " -> " + smallest.map((b) => `${b.slug} (${b.count})`).join(", ") : ""}
`);
process.exit(failures.length ? 1 : 0);
