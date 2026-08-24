/**
 * One-off: uploads product-files/ into the private `product-files` Storage bucket.
 *
 * The storage key is the repo-relative path verbatim, e.g.
 *   workflows/AI Agents/Conversational AI/Advanced/00456_....json
 * which is exactly the `workflowFile` value already stored on every catalog
 * record. Nothing has to be mapped or rewritten: the catalog is the index.
 *
 * Idempotent - an object already present with the same byte length is skipped,
 * so a partial run can simply be re-run. Nothing local is ever deleted.
 *
 * Usage (service-role key comes from the env file, never hardcoded):
 *   node --env-file=.env.local scripts/migrate-product-files-to-storage.mjs
 *   node --env-file=.env.local scripts/migrate-product-files-to-storage.mjs --verify
 *   node --env-file=.env.local scripts/migrate-product-files-to-storage.mjs --only <prefix>
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCT_ROOT = join(ROOT, "product-files");
const BUCKET = "product-files";

const argv = process.argv.slice(2);
const VERIFY_ONLY = argv.includes("--verify");
const ONLY = (() => {
  const i = argv.indexOf("--only");
  return i === -1 ? null : argv[i + 1];
})();
const SAMPLE = (() => {
  const i = argv.indexOf("--sample");
  return i === -1 ? 50 : Number(argv[i + 1]);
})();
const CONCURRENCY = 12;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("Run with: node --env-file=.env.local scripts/migrate-product-files-to-storage.mjs");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// --- local inventory --------------------------------------------------------
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(relative(PRODUCT_ROOT, p).split(sep).join("/"));
  }
  return out;
}
let localKeys = walk(PRODUCT_ROOT).sort();
if (ONLY) localKeys = localKeys.filter((k) => k.startsWith(ONLY));
const localSize = new Map(localKeys.map((k) => [k, statSync(join(PRODUCT_ROOT, k)).size]));
console.log(`local: ${localKeys.length} files, ${(
  [...localSize.values()].reduce((a, b) => a + b, 0) / 1048576
).toFixed(1)} MB`);

// --- bucket -----------------------------------------------------------------
async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw new Error(`listBuckets: ${error.message}`);
  const found = buckets.find((b) => b.name === BUCKET);
  if (found) {
    console.log(`bucket "${BUCKET}" exists (public=${found.public})`);
    if (found.public) console.warn("  WARNING: bucket is PUBLIC - it must be private.");
    return;
  }
  // Private: the whole point is that nobody can enumerate or fetch the corpus
  // without going through the signed-token download route.
  const { error: ce } = await sb.storage.createBucket(BUCKET, { public: false });
  if (ce) throw new Error(`createBucket: ${ce.message}`);
  console.log(`bucket "${BUCKET}" created (private)`);
}

/**
 * Every object under a prefix. Storage list() is per-directory and capped, so
 * this recurses and pages. Returns Map<key, size>.
 */
async function listRemote(prefix = "") {
  const out = new Map();
  const PAGE = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A "folder" comes back with a null id; a real object carries metadata.
      if (entry.id === null) {
        for (const [k, v] of await listRemote(full)) out.set(k, v);
      } else {
        out.set(full, entry.metadata?.size ?? -1);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

/** Runs `fn` over `items` with a fixed number of workers. */
async function pool(items, fn, n = CONCURRENCY, label = "") {
  let i = 0;
  let done = 0;
  const errors = [];
  async function worker() {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        await fn(items[idx]);
      } catch (e) {
        errors.push({ item: items[idx], message: e?.message ?? String(e) });
      }
      done++;
      if (done % 250 === 0 || done === items.length) {
        process.stdout.write(`\r  ${label} ${done}/${items.length}   `);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  if (items.length) process.stdout.write("\n");
  return errors;
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function main() {
  await ensureBucket();

  console.log("listing remote objects (this walks the whole prefix tree)...");
  const remote = await listRemote(ONLY ?? "");
  console.log(`remote: ${remote.size} objects`);

  if (!VERIFY_ONLY) {
    const todo = localKeys.filter((k) => remote.get(k) !== localSize.get(k));
    console.log(`to upload: ${todo.length} (skipping ${localKeys.length - todo.length} already present with matching size)`);

    const errors = await pool(
      todo,
      async (k) => {
        const body = readFileSync(join(PRODUCT_ROOT, k));
        const { error } = await sb.storage.from(BUCKET).upload(k, body, {
          contentType: "application/json",
          upsert: true,
        });
        if (error) throw new Error(error.message);
      },
      CONCURRENCY,
      "uploaded",
    );
    if (errors.length) {
      console.error(`\n${errors.length} upload errors. First 10:`);
      errors.slice(0, 10).forEach((e) => console.error("  ", e.item, "->", e.message));
      process.exitCode = 1;
    }
  }

  // --- integrity ------------------------------------------------------------
  console.log("\nre-listing to verify counts...");
  const after = await listRemote(ONLY ?? "");
  const missing = localKeys.filter((k) => !after.has(k));
  const sizeMismatch = localKeys.filter((k) => after.has(k) && after.get(k) !== localSize.get(k));

  console.log(`  local files        ${localKeys.length}`);
  console.log(`  remote objects     ${after.size}`);
  console.log(`  missing remotely   ${missing.length}`);
  console.log(`  size mismatches    ${sizeMismatch.length}`);
  missing.slice(0, 10).forEach((m) => console.log("    MISSING:", m));
  sizeMismatch.slice(0, 10).forEach((m) =>
    console.log("    SIZE:", m, `local=${localSize.get(m)} remote=${after.get(m)}`),
  );

  // Byte-level check on a deterministic spread, not the first N.
  const step = Math.max(1, Math.floor(localKeys.length / SAMPLE));
  const sampleKeys = localKeys.filter((_, i) => i % step === 0).slice(0, SAMPLE);
  let ok = 0;
  const bad = [];
  const hashErrors = await pool(
    sampleKeys,
    async (k) => {
      const { data, error } = await sb.storage.from(BUCKET).download(k);
      if (error) throw new Error(error.message);
      const remoteBuf = Buffer.from(await data.arrayBuffer());
      const localBuf = readFileSync(join(PRODUCT_ROOT, k));
      if (sha256(remoteBuf) === sha256(localBuf)) ok++;
      else bad.push(k);
    },
    8,
    "hashed",
  );
  console.log(`  sha256 sample      ${ok}/${sampleKeys.length} match`);
  bad.forEach((b) => console.log("    HASH MISMATCH:", b));
  hashErrors.forEach((e) => console.log("    HASH ERROR:", e.item, e.message));

  const clean =
    missing.length === 0 && sizeMismatch.length === 0 && bad.length === 0 && hashErrors.length === 0;
  console.log(clean ? "\nINTEGRITY OK" : "\nINTEGRITY FAILED");
  if (!clean) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
