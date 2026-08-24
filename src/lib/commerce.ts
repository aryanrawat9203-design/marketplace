import path from "path";
import crypto from "crypto";
import { getByRoute } from "./catalog";
import { isWithdrawnId } from "./withdrawn";
import { getBundle, bundleMembersDetail, bandFor, type Bundle } from "./bundles";
import { createZip, ZipBuilder, type ZipEntry } from "./zip";
import { starterPackItems, STARTER_PACK_FILENAME } from "./starter-pack";
import type { DetailItem } from "./catalog";
import { createAdminClient } from "./supabase/admin";
import {
  buildSetupChecklist,
  setupMarkdown,
  requiredLibFiles,
  type WorkflowJsonLike,
} from "./setup-checklist";

export type Kind = "workflow" | "bundle";

export type Purchasable = {
  kind: Kind;
  key: string; // workflow route, or bundle slug
  name: string;
  price: number;
  currency: string;
  free: boolean;
};

/**
 * Product files live in a private Supabase Storage bucket, keyed by exactly the
 * repo-relative path already stored on every catalog record's `workflowFile`.
 *
 * They used to be read off the function's own filesystem. That meant a dynamic
 * `fs` read rooted at `product-files/`, which Turbopack resolves by tracing the
 * entire 352 MB corpus into every serverless function that transitively imports
 * this module - twelve of them, ~391 MB each. Storage removes the directory
 * from the build output entirely.
 *
 * Keys are never taken from user input. Every one of them comes from
 * `getByRoute(...).workflowFile` or from `requiredLibFiles()` reading the
 * template's own graph, so a manipulated `key` parameter can only ever resolve
 * to a catalog record or to nothing - it cannot address arbitrary objects.
 */
const PRODUCT_BUCKET = "product-files";

/**
 * Raised when a product file exists but could not be fetched.
 *
 * Distinct from "not found" on purpose. A bundle download that silently skips
 * an entry it failed to fetch hands a paying buyer a short archive and no
 * indication anything is wrong - for the full-library tier that is thousands of
 * rupees for a file quietly missing templates. Assembling a few thousand
 * objects means transient Storage errors are a matter of when, not if, so they
 * have to surface rather than vanish.
 */
export class ProductFetchError extends Error {
  constructor(rel: string, cause: string) {
    super(`Could not fetch product file "${rel}": ${cause}`);
    this.name = "ProductFetchError";
  }
}

const FETCH_ATTEMPTS = 3;

/**
 * Raw bytes of one product file.
 *
 * Returns null only when Storage reports the object genuinely absent - the same
 * case the old `fs.existsSync` check skipped. Anything else is retried, and
 * throws ProductFetchError once the attempts are spent.
 */
async function fetchProductBytes(rel: string): Promise<Buffer | null> {
  const sb = createAdminClient();
  if (!sb) throw new ProductFetchError(rel, "Supabase admin client is not configured");

  let last = "unknown error";
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await sb.storage.from(PRODUCT_BUCKET).download(rel);
      if (!error && data) return Buffer.from(await data.arrayBuffer());
      if (error) {
        // Supabase surfaces a missing object as a 404/NoSuchKey; that is a real
        // answer, not a failure, so it is not retried.
        const status = (error as { statusCode?: string | number }).statusCode;
        if (String(status) === "404" || /not found|nosuchkey/i.test(error.message)) return null;
        last = error.message;
      } else {
        last = "empty response body";
      }
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    if (attempt < FETCH_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 150 * 2 ** (attempt - 1)));
    }
  }
  throw new ProductFetchError(rel, last);
}

// Workflow JSON is stored compact so the corpus stays cheap to hold. Buyers are
// meant to read and learn from these files, so they get an indented copy
// instead: formatting on the way out costs a parse per download and nothing at
// rest. That same parse is what the checklist and lib list are derived from, so
// each file is parsed exactly once per download.
type LoadedWorkflow = { pretty: Buffer; parsed: WorkflowJsonLike | null };

function decodeWorkflow(raw: Buffer): LoadedWorkflow {
  try {
    const parsed = JSON.parse(raw.toString("utf-8"));
    return { pretty: Buffer.from(JSON.stringify(parsed, null, 2), "utf-8"), parsed };
  } catch {
    return { pretty: raw, parsed: null }; // never block a download over formatting
  }
}

/**
 * The 45 shared `lib/` sub-workflows, cached for the life of the instance.
 *
 * A category bundle can pull the same handful of libs a thousand times over;
 * without this that is a thousand round-trips for 45 small files.
 */
const libBytesCache = new Map<string, Buffer | null>();

async function fetchLibBytes(rel: string): Promise<Buffer | null> {
  const hit = libBytesCache.get(rel);
  if (hit !== undefined) return hit;
  const raw = await fetchProductBytes(rel);
  const out = raw ? decodeWorkflow(raw).pretty : null;
  libBytesCache.set(rel, out);
  return out;
}

/** Runs `fn` over `items` with bounded concurrency, preserving input order. */
async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// Storage round-trips dominate a multi-template download, so they overlap.
// Bounded because a bundle can hold thousands of members and an unbounded
// fan-out would open thousands of sockets at once.
//
// 64 is measured, not guessed: fetching 300 product files took 7.0s at 16,
// 3.3s at 32, 1.8s at 64 and 1.3s at 96. Throughput was still climbing at 96,
// so this is deliberately short of the ceiling - a download function is not the
// only thing talking to Storage, and the last 30% is not worth the socket
// pressure.
const FETCH_CONCURRENCY = 64;

// Product files keep their original on-disk names, some of which still name a
// tool the workflow no longer claims - titles were rebuilt from the real node
// graphs, the 10k filenames were not. Downloads are user-facing, so name them
// from the truthful title instead of the stale basename.
function downloadSafeTitle(w: DetailItem): string {
  return w.title.replace(/[\\/:*?"<>|]/g, "-").trim();
}
// Zip entry leaf: keep the numeric id prefix (extraction order + uniqueness)
// but swap in the truthful title.
function truthfulLeaf(w: DetailItem): string {
  const base = path.basename(w.workflowFile);
  const ext = path.extname(base) || ".json";
  const prefix = base.match(/^\d+[_-]/)?.[0] ?? "";
  return `${prefix}${downloadSafeTitle(w)}${ext}`;
}

/**
 * What a key can be charged for, or undefined if it cannot be sold.
 *
 * This is the single gate every purchase path goes through - /api/checkout
 * computes its amount from here, the cart validates against it, and the free
 * download route uses it to decide whether payment is required. Refusing a
 * withdrawn template here therefore closes all of them at once, including a
 * stale client that still has the route in its cart.
 *
 * getByRoute deliberately still resolves withdrawn templates (their pages
 * render, and past orders must still download), so the check is explicit
 * rather than falling out of a missing lookup.
 */
export function getPurchasable(kind: Kind, key: string): Purchasable | undefined {
  if (kind === "workflow") {
    const w = getByRoute(key);
    if (!w) return undefined;
    if (isWithdrawnId(w.id)) return undefined;
    return { kind, key, name: w.title, price: w.price ?? 0, currency: "INR", free: !!w.free };
  }
  const b = getBundle(key);
  if (!b) return undefined;
  return { kind: "bundle", key, name: b.name, price: b.price, currency: "INR", free: false };
}

/**
 * The `lib:` sub-workflows a template needs, resolved from its own node graph.
 *
 * 1,710 templates call a sub-workflow by name through an Execute Workflow or
 * Workflow Tool node. Those workflows now exist, and a buyer cannot use the
 * template without them, so they travel in the same ZIP. The dependency list
 * comes from reading the parent's nodes - there is no mapping file to fall out
 * of date when a template changes which lib it calls.
 */
async function libEntries(wf: WorkflowJsonLike | null, prefix = ""): Promise<ZipEntry[]> {
  if (!wf) return [];
  let rels: string[] = [];
  try {
    rels = requiredLibFiles(wf);
  } catch {
    return [];
  }
  const fetched = await mapPool(rels, FETCH_CONCURRENCY, async (rel) => ({
    rel,
    data: await fetchLibBytes(rel),
  }));
  const out: ZipEntry[] = [];
  for (const { rel, data } of fetched) {
    if (data) out.push({ name: `${prefix}${rel}`, data });
  }
  return out;
}

/** The SETUP.md that ships beside a template, or null if it cannot be built. */
function setupFileFor(w: DetailItem, wf: WorkflowJsonLike | null): Buffer | null {
  if (!wf) return null;
  try {
    return Buffer.from(setupMarkdown(w.title, buildSetupChecklist(wf)), "utf-8");
  } catch {
    return null; // a template we cannot parse gets no claim made about it
  }
}

/**
 * One template's bytes plus everything that travels with it.
 *
 * Returns null when the object is missing from Storage, which every caller
 * treats the same way the old `fs.existsSync` check did: skip it in a
 * multi-item archive, 404 for a single download. Never a 500.
 */
type TemplateParts = { pretty: Buffer; setup: Buffer | null; libs: ZipEntry[] };

async function loadTemplate(w: DetailItem, libPrefix = ""): Promise<TemplateParts | null> {
  if (!w.workflowFile) return null;
  const raw = await fetchProductBytes(w.workflowFile);
  if (!raw) return null;
  const { pretty, parsed } = decodeWorkflow(raw);
  return {
    pretty,
    setup: setupFileFor(w, parsed),
    libs: await libEntries(parsed, libPrefix),
  };
}

/**
 * A single template downloads as a ZIP rather than a bare JSON, because the
 * setup checklist has to travel with it. A buyer who paid for one template is
 * exactly the buyer most likely to import it cold, and the unbound resource
 * locators are invisible until something silently returns nothing.
 */
export async function workflowDownload(
  route: string,
): Promise<{ filename: string; body: Buffer; contentType: string } | null> {
  const w = getByRoute(route);
  if (!w?.workflowFile) return null;
  const parts = await loadTemplate(w);
  if (!parts) return null;

  const title = downloadSafeTitle(w);
  const entries: ZipEntry[] = [{ name: `${title}.json`, data: parts.pretty }];
  if (parts.setup) entries.push({ name: "SETUP.md", data: parts.setup });
  entries.push(...parts.libs);

  return {
    filename: `${title}.zip`,
    body: createZip(entries),
    contentType: "application/zip",
  };
}

// Practice bundles are an explicit curriculum (simple -> complex), but the
// catalog's own file paths nest each workflow under Category/Subcategory/
// Difficulty folders. File managers list those folders alphabetically on
// extract, which hides the intended learning order. So for practice bundles
// we flatten the archive and prefix every filename with its curriculum
// index + skill band, which keeps extraction order == curriculum order.
function practiceEntryName(index: number, total: number, w: DetailItem): string {
  const pad = String(total).length;
  const num = String(index + 1).padStart(Math.max(pad, 2), "0");
  const band = bandFor(w);
  const ext = path.extname(w.workflowFile) || ".json";
  return `${num} - ${band} - ${downloadSafeTitle(w)}${ext}`;
}

/**
 * Every free template as one ZIP. Deliberately separate from bundleDownload:
 * this path is reachable without a purchase, so it must never consult - or be
 * able to widen - entitlements. It only ever reads templates the catalog has
 * already marked free.
 */
export async function starterPackDownload(): Promise<{ filename: string; body: Buffer } | null> {
  const items = starterPackItems();
  const loaded = await mapPool(items, FETCH_CONCURRENCY, async (item) => {
    const w = getByRoute(item.route);
    if (!w?.free || !w.workflowFile) return null;
    const parts = await loadTemplate(w);
    return parts ? { w, parts } : null;
  });

  const entries: ZipEntry[] = [];
  loaded.forEach((hit, i) => {
    if (!hit) return;
    const n = String(i + 1).padStart(2, "0");
    const stem = `${n}-${downloadSafeTitle(hit.w)}`;
    entries.push({ name: `${stem}.json`, data: hit.parts.pretty });
    if (hit.parts.setup) entries.push({ name: `${stem} SETUP.md`, data: hit.parts.setup });
    entries.push(...hit.parts.libs);
  });
  if (entries.length === 0) return null;
  return { filename: STARTER_PACK_FILENAME, body: createZip(entries) };
}

/**
 * How many members are fetched-and-compressed before the next group starts.
 *
 * The full-library tier is ~10k templates. Materialising every one of them
 * before zipping cost ~1.9 GB of RSS; compressing each batch and dropping the
 * source keeps peak memory to the compressed archive rather than the archive
 * plus the entire corpus. Large enough that the network stays saturated
 * (BATCH > FETCH_CONCURRENCY), small enough that little is held at once.
 */
const ZIP_BATCH = 256;

/**
 * Walks `items` in batches, fetching one batch ahead of the one being consumed.
 *
 * Compression is synchronous and blocks the event loop, so a naive
 * fetch-then-compress loop pays network latency and CPU time end to end - it
 * doubled full-library from 72s to 155s. Issuing the next batch's requests
 * *before* compressing the current one keeps them in flight across the blocking
 * deflate, so the round-trip overlaps the CPU work rather than following it.
 */
async function forEachBatchPipelined<T, R>(
  items: readonly T[],
  batchSize: number,
  fetchBatch: (batch: readonly T[], start: number) => Promise<R[]>,
  consume: (results: R[], start: number) => void,
): Promise<void> {
  if (items.length === 0) return;
  let start = 0;
  let pending: Promise<R[]> | null = fetchBatch(items.slice(0, batchSize), 0);
  while (pending) {
    const current = await pending;
    const currentStart = start;
    start += batchSize;
    pending = start < items.length ? fetchBatch(items.slice(start, start + batchSize), start) : null;
    consume(current, currentStart);
  }
}

export async function bundleDownload(slug: string): Promise<{ filename: string; body: Buffer } | null> {
  const b = getBundle(slug);
  if (!b) return null;
  const members = bundleMembersDetail(b);
  const zip = new ZipBuilder();

  await forEachBatchPipelined(
    members,
    ZIP_BATCH,
    (batch) =>
      mapPool(batch, FETCH_CONCURRENCY, async (w) => {
        if (!w.workflowFile) return null;
        const parts = await loadTemplate(w);
        return parts ? { w, parts } : null;
      }),
    (loaded, start) => {
      loaded.forEach((hit, j) => {
        if (!hit) return;
        const { w, parts } = hit;
        const name =
          b.type === "practice"
            ? practiceEntryName(start + j, members.length, w)
            : `${path.dirname(w.workflowFile)}/${truthfulLeaf(w)}`;
        zip.add({ name, data: parts.pretty });
        // Same stem as the JSON so the pair sorts together in any file browser.
        if (parts.setup) zip.add({ name: name.replace(/\.json$/i, "") + " SETUP.md", data: parts.setup });
        for (const e of parts.libs) zip.add(e);
      });
    },
  );

  if (zip.size === 0) return null;
  return { filename: b.slug + ".zip", body: zip.finish() };
}

export function bundleMemberCount(b: Bundle): number {
  return b.count;
}

/** ZIP of every file in a buyer-assembled cart (bundles flatten to their members). */
export async function cartZip(
  items: Array<{ kind: Kind; key: string }>
): Promise<{ filename: string; body: Buffer } | null> {
  // Resolve what the cart contains before fetching anything: the archive
  // de-duplicates on `workflowFile` (a template bought loose and again inside a
  // bundle is one file), and settling that first means each file is fetched
  // once rather than once per appearance.
  const planned: Array<{ w: DetailItem; name: string }> = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (item.kind === "workflow") {
      const w = getByRoute(item.key);
      if (!w?.workflowFile || seen.has(w.workflowFile)) continue;
      seen.add(w.workflowFile);
      planned.push({ w, name: `${path.dirname(w.workflowFile)}/${truthfulLeaf(w)}` });
    } else {
      const b = getBundle(item.key);
      if (!b) continue;
      const members = bundleMembersDetail(b);
      members.forEach((w, i) => {
        if (!w.workflowFile || seen.has(w.workflowFile)) return;
        seen.add(w.workflowFile);
        planned.push({
          w,
          name:
            b.type === "practice"
              ? practiceEntryName(i, members.length, w)
              : `${path.dirname(w.workflowFile)}/${truthfulLeaf(w)}`,
        });
      });
    }
  }

  // Same batching as bundleDownload: a cart can hold a full-library bundle, so
  // it must not materialise every template before compressing any of them.
  // `seen` reproduces what the entry Map used to do - one archive entry per
  // name, first occurrence wins - now that entries go straight into the ZIP.
  const zip = new ZipBuilder();
  const seenEntry = new Set<string>();
  const put = (e: ZipEntry) => {
    if (seenEntry.has(e.name)) return;
    seenEntry.add(e.name);
    zip.add(e);
  };

  await forEachBatchPipelined(
    planned,
    ZIP_BATCH,
    (batch) =>
      mapPool(batch, FETCH_CONCURRENCY, async ({ w, name }) => {
        const parts = await loadTemplate(w);
        return parts ? { name, parts } : null;
      }),
    (loaded) => {
      for (const hit of loaded) {
        if (!hit) continue;
        put({ name: hit.name, data: hit.parts.pretty });
        if (hit.parts.setup) {
          put({ name: hit.name.replace(/\.json$/i, "") + " SETUP.md", data: hit.parts.setup });
        }
        for (const e of hit.parts.libs) put(e);
      }
    },
  );

  if (zip.size === 0) return null;
  return { filename: "workflowcrate-order.zip", body: zip.finish() };
}

const INSECURE_DEFAULT_SECRET = "dev-insecure-secret-change-me";
const SECRET = process.env.DOWNLOAD_SECRET || INSECURE_DEFAULT_SECRET;
// Fail closed: in production the signing secret MUST be set. Without this,
// an unset DOWNLOAD_SECRET silently falls back to a public constant and every
// paid download token becomes forgeable (full payment bypass).
const SECRET_INSECURE_IN_PROD =
  process.env.NODE_ENV === "production" && SECRET === INSECURE_DEFAULT_SECRET;

// Everything a download token can point at: a single workflow, a fixed
// bundle, or a buyer-assembled cart (stored server-side by id).
export type DownloadKind = Kind | "cart";

export function signDownload(kind: DownloadKind, key: string, expiresIn = 30 * 60 * 1000): string {
  if (SECRET_INSECURE_IN_PROD) {
    throw new Error("DOWNLOAD_SECRET is not configured in production; refusing to mint download tokens.");
  }
  const exp = Date.now() + expiresIn;
  const data = kind + ":" + key + "." + exp;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return Buffer.from(data).toString("base64url") + "." + sig;
}

export function verifyDownload(token: string): { kind: DownloadKind; key: string } | null {
  if (SECRET_INSECURE_IN_PROD) return null;
  try {
    const [b, sig] = token.split(".");
    if (!b || !sig) return null;
    const data = Buffer.from(b, "base64url").toString();
    const expect = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (sig !== expect) return null;
    const lastDot = data.lastIndexOf(".");
    const exp = Number(data.slice(lastDot + 1));
    if (!exp || Date.now() > exp) return null;
    const ref = data.slice(0, lastDot);
    const colon = ref.indexOf(":");
    const kind = ref.slice(0, colon) as DownloadKind;
    const key = ref.slice(colon + 1);
    if (kind !== "workflow" && kind !== "bundle" && kind !== "cart") return null;
    return { kind, key };
  } catch {
    return null;
  }
}
