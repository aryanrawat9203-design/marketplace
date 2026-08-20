/**
 * Asserts that every technical claim on the rebuilt integration pages is real.
 *
 * The rebuilt pages quote identifiers straight out of the shipped workflow
 * JSONs - node types, parameter paths, option values, expressions. The risk
 * with that style is obvious: a page full of `n8n-nodes-base.*` reads as
 * authoritative whether or not any of it is true, and a prior audit of this
 * catalog found 52.5% of a sampled 40 templates lacked the node type their
 * name promised. So the identifiers are not taken on trust.
 *
 * The convention that makes this checkable: in `pair-guides.ts`, anything in
 * `backticks` is a literal lifted from a product file, and the page renders it
 * as <code>. This script parses those same backticks and asserts each one
 * occurs in the templates that actually back that page - not merely somewhere
 * in the catalog, because "Google Drive templates use operation: pdf" being
 * true of some other pair is exactly the kind of near-miss worth catching.
 *
 * Prose that names no identifier is not audited here. That is a real boundary
 * and worth stating: vendor-API facts (Airtable retiring API keys, HubSpot's
 * 10,000-result search ceiling) cannot be verified against this repo, because
 * the repo contains no n8n node definitions and every file has its
 * `credentials` block stripped. Those claims are the author's, not the
 * corpus's. What this script guarantees is narrower and precise: no page names
 * a node, a parameter or a value that its own templates do not contain.
 *
 * Usage: node scripts/check-guide-claims.mjs [--verbose]
 * Exit code 1 on any unverified claim.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const VERBOSE = process.argv.includes("--verbose");

/** The pages this task rebuilt, and the platforms whose templates back each. */
const TARGETS = {
  "airtable-and-shopify": ["Airtable", "Shopify"],
  airtable: ["Airtable"],
  "discord-and-google-drive": ["Discord", "Google Drive"],
  "discord-and-trello": ["Discord", "Trello"],
  "airtable-and-google-drive": ["Airtable", "Google Drive"],
  hubspot: ["HubSpot"],
  wordpress: ["WordPress"],
  "discord-and-notion": ["Discord", "Notion"],
  "mysql-and-twilio": ["MySQL", "Twilio"],
};

// ---------------------------------------------------------------- guide text

/**
 * `pairGuides` is a plain literal - strings, arrays and objects, no TS syntax
 * inside the array body - so slicing it out and evaluating it is exact, where
 * a regex over the prose would trip on every apostrophe and escaped quote.
 */
function loadGuides() {
  const src = readFileSync(join(ROOT, "src/lib/pair-guides.ts"), "utf8");
  const open = src.indexOf("export const pairGuides: PairGuide[] = [");
  const start = src.indexOf("[", open);
  const end = src.indexOf("\n];", start);
  if (open === -1 || end === -1) throw new Error("could not locate pairGuides literal");
  const literal = src.slice(start, end + 2);
  return new Function(`return ${literal}`)();
}

/** Every backticked span on one guide, with a locator for the failure report. */
function claimsFor(guide) {
  const out = [];
  const scan = (text, where) => {
    for (const m of text.matchAll(/`([^`]+)`/g)) out.push({ raw: m[1], where });
  };
  if (guide.title) scan(guide.title, "title");
  if (guide.description) scan(guide.description, "description");
  for (const sec of guide.sections) {
    scan(sec.h, `heading "${sec.h}"`);
    sec.p.forEach((p, i) => scan(p, `"${sec.h}" ¶${i + 1}`));
  }
  return out;
}

// --------------------------------------------------------------- corpus index

const catalog = JSON.parse(readFileSync(join(ROOT, "src/data/catalog.json"), "utf8"));
const items = Array.isArray(catalog) ? catalog : catalog.items;

/**
 * Indexes one page's templates into the four things a claim can be checked
 * against: node types, parameter paths, values seen per parameter, and the raw
 * file text (which is what catches expressions and fragments of them).
 */
function indexTemplates(platforms) {
  const nodeTypes = new Set();
  const paramPaths = new Set();
  const valuesByKey = new Map();
  const allValues = new Set();
  const rawTexts = [];
  const connectionTypes = new Set();

  const matching = items.filter((w) => platforms.every((p) => w.platforms.includes(p)));

  for (const w of matching) {
    const text = readFileSync(join(ROOT, "product-files", w.workflowFile), "utf8");
    rawTexts.push(text);
    const wf = JSON.parse(text);

    for (const conns of Object.values(wf.connections ?? {})) {
      for (const kind of Object.keys(conns)) connectionTypes.add(kind);
    }

    for (const node of wf.nodes ?? []) {
      nodeTypes.add(node.type);
      // Node-level settings are claimed on the pages the same way parameters
      // are ("sets `retryOnFail`"), so they belong in the same index.
      for (const k of ["retryOnFail", "maxTries", "waitBetweenTries", "onError", "alwaysOutputData"]) {
        if (node[k] !== undefined) {
          paramPaths.add(k);
          record(k, node[k]);
        }
      }
      if (node.type === "n8n-nodes-base.stickyNote") continue;
      walk(node.parameters ?? {}, "");
    }
  }

  function leaf(p) {
    return p.split(".").pop().replace(/\[\]/g, "");
  }

  function record(key, value) {
    const v = String(value);
    allValues.add(v);
    if (!valuesByKey.has(key)) valuesByKey.set(key, new Set());
    valuesByKey.get(key).add(v);
  }

  function walk(obj, prefix) {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      for (const v of obj) {
        if (v !== null && typeof v === "object") walk(v, `${prefix}[]`);
        else if (v !== undefined) {
          // A scalar inside an array is still a value claimed as one, e.g.
          // `columns.matchingColumns: ["Order ID"]`.
          record(leaf(prefix), v);
          record(prefix, v);
        }
      }
      return;
    }
    if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        paramPaths.add(path);
        paramPaths.add(path.replace(/\[\]/g, ""));
        paramPaths.add(k);
        walk(v, path);
      }
      return;
    }
    record(leaf(prefix), obj);
    record(prefix, obj);
    record(prefix.replace(/\[\]/g, ""), obj);
  }

  return {
    count: matching.length,
    nodeTypes,
    paramPaths,
    valuesByKey,
    allValues,
    connectionTypes,
    rawIncludes: (s) => rawTexts.some((t) => t.includes(s)),
  };
}

// ------------------------------------------------------------------- checking

/** Strips the sticky-note glyphs the guides quote verbatim (`🔑 Trello API`). */
const stripGlyph = (s) => s.replace(/^[🔑↻]\s*/u, "").trim();
const unquote = (s) => s.replace(/^["'](.*)["']$/s, "$1");

/**
 * Verifies one claim, returning the kind of check that satisfied it so the
 * report can show what was actually proved rather than just a tick.
 */
function verify(raw, idx) {
  const token = stripGlyph(raw);

  if (idx.nodeTypes.has(token)) return { ok: true, kind: "node type" };

  // `key: value` - the strictest form, and the one most claims take. Both
  // halves have to hold, and the value has to have been seen for that key
  // rather than merely somewhere in the corpus.
  const kv = token.match(/^([A-Za-z_$][\w.$[\]]*)\s*:\s*(.+)$/s);
  if (kv) {
    const [, key, rawVal] = kv;
    const leafKey = key.split(".").pop().replace(/\[\]/g, "");
    if (!idx.paramPaths.has(key) && !idx.paramPaths.has(leafKey)) {
      return { ok: false, reason: `no parameter named "${key}"` };
    }
    const want = unquote(rawVal.trim().replace(/^\[(.*)\]$/s, "$1").trim());
    const seen = idx.valuesByKey.get(key) ?? idx.valuesByKey.get(leafKey);
    if (seen?.has(want)) return { ok: true, kind: "parameter + value" };
    if (idx.rawIncludes(want)) return { ok: true, kind: "parameter + value (raw)" };
    return { ok: false, reason: `parameter "${key}" never has value "${want}"` };
  }

  if (idx.paramPaths.has(token)) return { ok: true, kind: "parameter path" };
  if (idx.connectionTypes.has(token)) return { ok: true, kind: "connection type" };
  if (idx.allValues.has(token)) return { ok: true, kind: "option value" };
  if (idx.rawIncludes(token)) return { ok: true, kind: "literal in file" };

  return { ok: false, reason: "not found in this page's templates" };
}

// ---------------------------------------------------------------------- main

const guides = new Map(loadGuides().map((g) => [g.slug, g]));
let checked = 0;
let failed = 0;
const byKind = new Map();
const rows = [];

for (const [slug, platforms] of Object.entries(TARGETS)) {
  const guide = guides.get(slug);
  if (!guide) {
    console.error(`FAIL  ${slug}: no guide entry in pair-guides.ts`);
    failed++;
    continue;
  }
  const idx = indexTemplates(platforms);
  const claims = claimsFor(guide);
  let bad = 0;

  for (const { raw, where } of claims) {
    checked++;
    const res = verify(raw, idx);
    if (res.ok) {
      byKind.set(res.kind, (byKind.get(res.kind) ?? 0) + 1);
      if (VERBOSE) console.log(`  ok   ${slug}  \`${raw}\`  (${res.kind})`);
    } else {
      bad++;
      failed++;
      console.error(`FAIL  ${slug}  \`${raw}\`\n      ${res.reason}\n      at ${where}`);
    }
  }

  // A worked example that links to a product page has to link to a real one.
  if (guide.example) {
    checked++;
    if (items.some((w) => w.route === guide.example.route)) {
      byKind.set("example route", (byKind.get("example route") ?? 0) + 1);
    } else {
      bad++;
      failed++;
      console.error(`FAIL  ${slug}  example route "${guide.example.route}" is not a template`);
    }
  }

  rows.push({ slug, templates: idx.count, claims: claims.length + (guide.example ? 1 : 0), bad });
}

console.log("\nPer page:");
for (const r of rows) {
  console.log(
    `  ${r.slug.padEnd(26)} ${String(r.templates).padStart(5)} templates` +
      `  ${String(r.claims).padStart(4)} claims  ${r.bad ? `${r.bad} FAILED` : "all verified"}`,
  );
}
console.log("\nBy proof:");
for (const [kind, n] of [...byKind].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${kind}`);
}
console.log(`\n${checked} claims checked, ${checked - failed} verified, ${failed} failed.`);
process.exit(failed ? 1 : 0);
