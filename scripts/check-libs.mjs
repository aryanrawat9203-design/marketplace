/**
 * Asserts the 45 `lib:` sub-workflows exist, are importable, honour the
 * contract their callers assume, and reach the buyer with the parent.
 *
 * The failure this guards against is the one the libs were written to end: a
 * template that names a dependency the buyer does not have. Getting that wrong
 * in the other direction - promising a file in the checklist that is not in the
 * ZIP - would be worse than the original problem, so both directions are
 * checked.
 *
 *   node scripts/check-libs.mjs [--all]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./lib/load-ts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const DATA = path.join(ROOT, "src", "data");
const ALL = process.argv.includes("--all");

const failures = [];
const fail = (m) => failures.push(m);

const items = JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(DATA, "libs.json"), "utf8"));
const specs = JSON.parse(fs.readFileSync(path.join(DATA, "lib-specs.json"), "utf8")).items;

const { exports: rule, dispose } = loadTsModule(ROOT, "src/lib/setup-checklist.ts");

const STICKY = "n8n-nodes-base.stickyNote";
const SUB = /(?:^|\.)(?:executeWorkflow|toolWorkflow)$/;
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, "product-files", rel), "utf8"));

// --- 1. every lib exists, parses, and is structurally importable ------------
const libByName = new Map();
let triggerCount = 0;
let libNodes = 0;
for (const entry of manifest.items) {
  const fp = path.join(ROOT, "product-files", entry.file);
  if (!fs.existsSync(fp)) {
    fail(`${entry.name}: file missing at ${entry.file}`);
    continue;
  }
  let j;
  try {
    j = read(entry.file);
  } catch (e) {
    fail(`${entry.name}: unparseable (${e.message})`);
    continue;
  }
  libByName.set(entry.name, j);

  if (j.name !== entry.name) fail(`${entry.name}: workflow.name is "${j.name}"`);
  for (const k of ["nodes", "connections", "settings", "pinData"]) {
    if (j[k] === undefined) fail(`${entry.name}: missing top-level "${k}"`);
  }
  const real = (j.nodes ?? []).filter((n) => n.type !== STICKY);
  libNodes += real.length;
  const triggers = real.filter((n) => n.type === "n8n-nodes-base.executeWorkflowTrigger");
  if (triggers.length !== 1) fail(`${entry.name}: ${triggers.length} Execute Workflow Triggers, expected 1`);
  else triggerCount++;

  const names = new Set(real.map((n) => n.name));
  for (const n of real) {
    if (!n.type || !n.name) fail(`${entry.name}: node missing type or name`);
    if (n.typeVersion === undefined) fail(`${entry.name}: ${n.name} has no typeVersion`);
    if (!Array.isArray(n.position) || n.position.length !== 2) {
      fail(`${entry.name}: ${n.name} has no valid position`);
    }
  }
  // every connection endpoint resolves, in both directions
  for (const [from, out] of Object.entries(j.connections ?? {})) {
    if (!names.has(from)) fail(`${entry.name}: connection from unknown node "${from}"`);
    for (const arr of Object.values(out)) {
      for (const conns of arr ?? []) {
        for (const c of conns ?? []) {
          if (!names.has(c.node)) fail(`${entry.name}: connection to unknown node "${c.node}"`);
        }
      }
    }
  }
  // every non-trigger node is reachable from the trigger
  const reachable = new Set(triggers.map((t) => t.name));
  let grew = true;
  while (grew) {
    grew = false;
    for (const [from, out] of Object.entries(j.connections ?? {})) {
      if (!reachable.has(from)) continue;
      for (const arr of Object.values(out)) {
        for (const conns of arr ?? []) {
          for (const c of conns ?? []) {
            if (!reachable.has(c.node)) {
              reachable.add(c.node);
              grew = true;
            }
          }
        }
      }
    }
  }
  // sub-nodes attach TO a node rather than being fed by it, so count them too
  for (const [from, out] of Object.entries(j.connections ?? {})) {
    if (Object.keys(out).some((k) => k.startsWith("ai_"))) reachable.add(from);
  }
  for (const n of real) {
    if (!reachable.has(n.name)) fail(`${entry.name}: node "${n.name}" is unreachable from the trigger`);
  }
}

// --- 2. no lib contains a foreign locator (the withdrawn predicate) ---------
let libsWithMalformed = 0;
for (const [name, j] of libByName) {
  const c = rule.buildSetupChecklist(j);
  if (c.malformedNodes.length > 0) {
    libsWithMalformed++;
    fail(`${name}: malformed node(s) ${c.malformedNodes.join(", ")}`);
  }
  if (c.missingSubWorkflows.length > 0) {
    fail(`${name}: references a sub-workflow of its own: ${c.missingSubWorkflows.join(", ")}`);
  }
}

// --- 3. every lib reference in every parent resolves ------------------------
function locators(value, out) {
  if (!value || typeof value !== "object") return;
  if (value.__rl === true) {
    out.push(value);
    return;
  }
  for (const v of Object.values(value)) if (v && typeof v === "object") locators(v, out);
}

let refSites = 0;
let parentsWithLibs = 0;
let unresolved = 0;
const callerReads = new Map(); // lib -> Set(field)
const callerDeclaredInputs = new Map(); // lib -> count of call sites declaring inputs
const parentsNeedingLibs = [];

for (const w of items) {
  let j;
  try {
    j = read(w.workflowFile);
  } catch {
    continue;
  }
  const real = (j.nodes ?? []).filter((n) => n.type !== STICKY);
  const byName = new Map(real.map((n) => [n.name, n]));
  const downstreamOf = new Map();
  for (const [from, out] of Object.entries(j.connections ?? {})) {
    downstreamOf.set(from, (out.main ?? []).flat().filter(Boolean).map((c) => c.node));
  }
  let has = false;
  for (const n of real) {
    if (!SUB.test(n.type ?? "")) continue;
    const locs = [];
    locators(n.parameters, locs);
    for (const l of locs) {
      const nm = l.cachedResultName;
      if (!nm || !/^lib:/i.test(nm)) continue;
      refSites++;
      has = true;
      if (!libByName.has(nm)) {
        unresolved++;
        fail(`${w.id}: references "${nm}", which no lib file provides`);
      }
      // do callers declare input fields? (passthrough is only safe if not)
      const declared = Object.keys(n.parameters?.workflowInputs?.value ?? {}).length;
      if (declared > 0) callerDeclaredInputs.set(nm, (callerDeclaredInputs.get(nm) ?? 0) + 1);
      // what the caller reads back
      const set = callerReads.get(nm) ?? new Set();
      for (const t of downstreamOf.get(n.name ?? "") ?? []) {
        const tn = byName.get(t);
        if (!tn) continue;
        const txt = JSON.stringify(tn.parameters ?? {});
        for (const m of txt.matchAll(/\$json\.([A-Za-z_][A-Za-z0-9_]*)/g)) set.add(m[1]);
      }
      callerReads.set(nm, set);
    }
  }
  if (has) {
    parentsWithLibs++;
    parentsNeedingLibs.push(w);
  }
}

// --- 4. the contract: inputs accepted, fields returned ----------------------
/**
 * Fields a lib actually emits.
 *
 * Only Set-node assignments count. An earlier version of this also accepted
 * "the Code node re-emits its input, so anything could flow through", which
 * made the check unfalsifiable - a lib that stopped emitting `status` would
 * still have passed. A field a caller reads has to be one this lib produces, or
 * one n8n's own error envelope provides. Nothing else.
 */
function returnedFields(j) {
  const out = new Set();
  for (const n of (j.nodes ?? []).filter((x) => x.type !== STICKY)) {
    if (n.type === "n8n-nodes-base.set") {
      for (const a of n.parameters?.assignments?.assignments ?? []) out.add(a.name);
    }
  }
  return out;
}

// n8n supplies this envelope itself on the error output of an Execute Workflow
// node; it is not something the sub-workflow returns.
const N8N_PROVIDED = new Set(["error"]);

let contractChecks = 0;
let passthroughOk = 0;
for (const [name, j] of libByName) {
  const out = returnedFields(j);
  // inputs: passthrough accepts anything, and is only the right choice while
  // no caller declares fields
  const declaring = callerDeclaredInputs.get(name) ?? 0;
  const trig = (j.nodes ?? []).find((n) => n.type === "n8n-nodes-base.executeWorkflowTrigger");
  const src = trig?.parameters?.inputSource;
  if (src === "passthrough") {
    if (declaring > 0) {
      fail(`${name}: trigger is passthrough but ${declaring} call sites declare input fields`);
    } else passthroughOk++;
  } else if (!src) {
    fail(`${name}: trigger has no inputSource`);
  }
  // outputs
  for (const field of callerReads.get(name) ?? []) {
    contractChecks++;
    if (N8N_PROVIDED.has(field)) continue;
    if (!out.has(field)) {
      fail(`${name}: callers read "${field}" but the lib never returns it`);
    }
  }
}

// --- 5. the download carries the libs ---------------------------------------
// Product files now come from Supabase Storage, so this assertion is a real
// end-to-end check of the download path rather than a local disk read. It needs
// the service-role credentials; without them every ZIP would come back empty
// and the failures would be misleading.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "check-libs: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to\n" +
      "assemble download ZIPs (product files live in Storage).\n" +
      "Run via: node --env-file-if-exists=.env.local scripts/check-libs.mjs",
  );
  process.exit(1);
}
const { exports: commerce, dispose: d2 } = loadTsModule(ROOT, "src/lib/commerce.ts");
const sample = ALL ? parentsNeedingLibs : parentsNeedingLibs.filter((_, i) => i % 40 === 0);
let zipsChecked = 0;
let zipsOk = 0;
for (const w of sample) {
  const out = await commerce.workflowDownload(w.route);
  if (!out) {
    // withdrawn templates still download; a missing one is a real failure
    fail(`${w.id}: no download produced`);
    continue;
  }
  zipsChecked++;
  const body = out.body.toString("latin1");
  const wf = read(w.workflowFile);
  const needed = rule.requiredLibFiles(wf);
  if (needed.length === 0) {
    fail(`${w.id}: calls a lib but requiredLibFiles returned nothing`);
    continue;
  }
  const missing = needed.filter((f) => !body.includes(f));
  const hasParent = body.includes(".json") && body.includes("SETUP.md");
  if (missing.length) fail(`${w.id}: ZIP is missing ${missing.join(", ")}`);
  else if (!hasParent) fail(`${w.id}: ZIP has libs but not the parent + SETUP.md`);
  else zipsOk++;
}
d2();

// --- 6. the checklist no longer tells anyone to build a lib ----------------
let checklistChecked = 0;
let stillSaysBuild = 0;
for (const w of sample) {
  const wf = read(w.workflowFile);
  const c = rule.buildSetupChecklist(wf);
  checklistChecked++;
  if (c.missingSubWorkflows.length > 0) {
    stillSaysBuild++;
    fail(`${w.id}: still reports missing sub-workflows ${c.missingSubWorkflows.join(", ")}`);
  }
  for (const s of c.bindings) {
    if (/yourself/i.test(s.title)) {
      stillSaysBuild++;
      fail(`${w.id}: checklist still says "${s.title}"`);
    }
  }
}

dispose();

// --- report -----------------------------------------------------------------
if (failures.length) {
  console.error("\nFAILURES\n");
  for (const f of failures.slice(0, 40)) console.error("  " + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
}

const byFamily = specs.reduce((a, s) => ({ ...a, [s.family]: (a[s.family] ?? 0) + 1 }), {});
console.log(`
Lib assertion
  libs in manifest         ${manifest.items.length}   ${JSON.stringify(byFamily)}
  libs on disk + parseable ${libByName.size}
  functional nodes in libs ${libNodes}, each with exactly one Execute Workflow Trigger (${triggerCount}/${manifest.items.length})
  libs with a foreign-param node   ${libsWithMalformed}   (withdrawn predicate, reused)
  lib reference sites      ${refSites} across ${parentsWithLibs} parent templates
  unresolved references    ${unresolved}
  trigger/caller input fit ${passthroughOk}/${libByName.size} passthrough, 0 call sites declaring fields
  return-contract checks   ${contractChecks} caller-read fields, all satisfied or n8n-provided
  ZIPs checked             ${zipsOk}/${zipsChecked} contain parent + SETUP.md + every required lib${ALL ? "" : "  (sample; --all for every parent)"}
  checklists checked       ${checklistChecked}, still saying "build it yourself": ${stillSaysBuild}
  failures                 ${failures.length}
`);
process.exit(failures.length ? 1 : 0);
