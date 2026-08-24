/**
 * Asserts Storage holds every product file the site can be asked to deliver.
 *
 * Since the corpus moved out of the repo and into a private Supabase bucket,
 * "the file is on disk next to the code" stopped being true by construction.
 * A catalog record whose object is missing from Storage is invisible until a
 * buyer's ZIP arrives short - and the full-library tier touches ~10k objects at
 * once, so a single gap is a paid download that is quietly incomplete.
 *
 * Checked in both directions:
 *   present  - every workflowFile on every catalog record (withdrawn included,
 *              because past orders must still download) has an object, and so
 *              does every lib in the manifest.
 *   sized    - the object is not zero bytes.
 *   orphans  - objects in the bucket that nothing references, reported rather
 *              than failed: they cost storage but break nothing.
 *
 * Usage: node --env-file-if-exists=.env.local scripts/check-storage-corpus.mjs
 * Exit code 1 on any missing or empty object.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "product-files";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "check-storage-corpus: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required\n" +
      "(product files live in Storage).\n" +
      "Run via: node --env-file-if-exists=.env.local scripts/check-storage-corpus.mjs",
  );
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const catalog = JSON.parse(readFileSync(join(ROOT, "src/data/catalog.json"), "utf-8"));
const libs = JSON.parse(readFileSync(join(ROOT, "src/data/libs.json"), "utf-8"));
const libFiles = (Array.isArray(libs) ? libs : (libs.items ?? []))
  .map((l) => (typeof l === "string" ? l : l.file))
  .filter(Boolean);
if (libFiles.length === 0) {
  console.error("check-storage-corpus: read 0 libs out of libs.json - the manifest shape changed.");
  process.exit(1);
}

/** Every object under a prefix; list() is per-directory and paged. */
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
    for (const e of data) {
      const full = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) for (const [k, v] of await listRemote(full)) out.set(k, v);
      else out.set(full, e.metadata?.size ?? -1);
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

console.log("Storage corpus assertion");
const remote = await listRemote("");

const required = new Set();
for (const r of catalog) if (r.workflowFile) required.add(r.workflowFile);
for (const f of libFiles) required.add(f.startsWith("lib/") ? f : `lib/${f}`);

const missing = [...required].filter((k) => !remote.has(k));
const empty = [...required].filter((k) => remote.has(k) && remote.get(k) === 0);
const orphans = [...remote.keys()].filter((k) => !required.has(k));

console.log(`  catalog records          ${catalog.length}`);
console.log(`  required objects         ${required.size}  (${libFiles.length} libs)`);
console.log(`  objects in bucket        ${remote.size}`);
console.log(`  missing from Storage     ${missing.length}`);
console.log(`  zero-byte objects        ${empty.length}`);
console.log(`  unreferenced in bucket   ${orphans.length}  (reported, not failed)`);

missing.slice(0, 15).forEach((m) => console.log("    MISSING:", m));
empty.slice(0, 15).forEach((m) => console.log("    EMPTY:", m));
orphans.slice(0, 10).forEach((m) => console.log("    orphan:", m));

const failures = missing.length + empty.length;
console.log(`  failures                 ${failures}`);
if (failures) process.exit(1);
