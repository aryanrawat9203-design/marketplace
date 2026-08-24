/**
 * Precomputes everything a product page renders from its workflow file.
 *
 * Why this exists: `/workflows/[route]` used to call previewWorkflow,
 * workflowGraphData and workflowSetupChecklist, each of which opened the
 * template's JSON with `fs.readFileSync`. That single coupling traced all
 * 352 MB of `product-files/` into twelve serverless functions - Turbopack sees
 * a dynamic `fs` read rooted at a directory and conservatively bundles every
 * file under it into any route that transitively imports the module.
 *
 * Moving the product files to Supabase Storage fixes the download path, but a
 * page cannot afford a network round-trip per render across ~10.5k templates.
 * So the derivation happens once, here, at build time.
 *
 * Two shape decisions worth knowing:
 *
 *  - **Sharded, not one file.** The whole payload is ~78 MB. As a single JSON
 *    the page would parse all of it on cold start to answer one request. It is
 *    split into 256 buckets (~300 KB each) keyed by a hash of the route, so a
 *    render parses one shard and memoises it.
 *  - **Outside `src/data/`.** `next.config.ts` traces `./src/data/**` into ~20
 *    functions. Shards live in `render-payloads/` at the repo root so only the
 *    one route that reads them carries the weight.
 *
 * `label` is not stored: it is always identical to the node `id`, so it is
 * dropped here and rehydrated by the reader.
 *
 * The rule itself is loaded from `src/lib/workflow-derive.ts` rather than
 * reimplemented - a copy is exactly how generated data and the site drift.
 *
 * Usage:
 *   node scripts/build-render-payloads.mjs            # write the shards
 *   node scripts/build-render-payloads.mjs --check    # fail if stale
 *   node scripts/build-render-payloads.mjs --sample N # size probe, writes nothing
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./lib/load-ts.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");
const SAMPLE = (() => {
  const i = argv.indexOf("--sample");
  return i === -1 ? 0 : Number(argv[i + 1]);
})();

const OUT_DIR = join(ROOT, "render-payloads");
const PRODUCT_ROOT = join(ROOT, "product-files");

// Must stay in lockstep with shardFor() in src/lib/render-payloads.ts.
export const SHARD_COUNT = 256;
function shardFor(route) {
  let h = 2166136261;
  for (let i = 0; i < route.length; i++) {
    h ^= route.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % SHARD_COUNT;
}

const catalog = JSON.parse(readFileSync(join(ROOT, "src/data/catalog.json"), "utf-8"));
const { exports: derive, dispose } = loadTsModule(ROOT, "src/lib/workflow-derive.ts");

let records = catalog.filter((r) => r.workflowFile);
if (SAMPLE > 0) {
  const step = Math.max(1, Math.floor(records.length / SAMPLE));
  records = records.filter((_, i) => i % step === 0).slice(0, SAMPLE);
}

const shards = Array.from({ length: SHARD_COUNT }, () => ({}));
let missing = 0;
let unparseable = 0;
let noGraph = 0;
let noSetup = 0;
let count = 0;

for (const r of records) {
  const fp = join(PRODUCT_ROOT, r.workflowFile);
  if (!existsSync(fp)) {
    missing++;
    continue;
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(fp, "utf-8"));
  } catch {
    unparseable++;
    continue;
  }
  const p = derive.deriveRenderPayload(raw);
  if (!p.graph) noGraph++;
  if (!p.setup) noSetup++;
  // Drop `label` (=== id) on the way out; the reader puts it back.
  const graph = p.graph
    ? {
        nodes: p.graph.nodes.map((n) => ({
          id: n.id,
          typeLabel: n.typeLabel,
          kind: n.kind,
          x: n.x,
          y: n.y,
        })),
        edges: p.graph.edges,
        width: p.graph.width,
        height: p.graph.height,
      }
    : null;
  shards[shardFor(r.route)][r.route] = {
    preview: p.preview,
    graph,
    setup: p.setup,
    libFiles: p.libFiles,
  };
  count++;
}

dispose();

const serialised = shards.map((s) => JSON.stringify(s));
const totalBytes = serialised.reduce((a, s) => a + s.length, 0);
const mb = (totalBytes / 1048576).toFixed(1);
const sizes = serialised.map((s) => s.length);

function report() {
  console.log(`  templates          ${count}`);
  console.log(`  shards             ${SHARD_COUNT}`);
  console.log(`  total              ${mb} MB`);
  console.log(
    `  shard size         min ${(Math.min(...sizes) / 1024).toFixed(0)} KB / ` +
      `mean ${(totalBytes / SHARD_COUNT / 1024).toFixed(0)} KB / ` +
      `max ${(Math.max(...sizes) / 1024).toFixed(0)} KB`,
  );
  console.log(`  files missing      ${missing}`);
  console.log(`  files unparseable  ${unparseable}`);
  console.log(`  templates w/o graph ${noGraph} (fewer than 2 positioned nodes)`);
  console.log(`  templates w/o setup ${noSetup}`);
}

if (SAMPLE > 0) {
  console.log(`sample of ${count} templates`);
  console.log(`  mean per template  ${Math.round(totalBytes / Math.max(1, count))} bytes`);
  console.log(`  extrapolated full  ${((totalBytes / Math.max(1, count)) * catalog.length / 1048576).toFixed(1)} MB`);
  process.exit(0);
}

const shardPath = (i) => join(OUT_DIR, `${String(i).padStart(3, "0")}.json`);

if (CHECK) {
  if (!existsSync(OUT_DIR)) {
    console.error("render-payloads/ is missing - run: node scripts/build-render-payloads.mjs");
    process.exit(1);
  }
  const stale = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const p = shardPath(i);
    if (!existsSync(p) || readFileSync(p, "utf-8") !== serialised[i]) stale.push(i);
  }
  const extra = readdirSync(OUT_DIR).filter(
    (f) => !/^\d{3}\.json$/.test(f) || Number(f.slice(0, 3)) >= SHARD_COUNT,
  );
  if (stale.length || extra.length) {
    console.error(
      `render-payloads/ is stale: ${stale.length} shard(s) differ` +
        (extra.length ? `, ${extra.length} unexpected file(s)` : "") +
        "\nRun: node scripts/build-render-payloads.mjs",
    );
    process.exit(1);
  }
  console.log("Render payloads current.");
  report();
  process.exit(0);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
for (let i = 0; i < SHARD_COUNT; i++) writeFileSync(shardPath(i), serialised[i]);

console.log("Wrote render-payloads/");
report();
