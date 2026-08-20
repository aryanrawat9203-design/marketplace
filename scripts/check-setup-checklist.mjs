/**
 * Asserts the setup checklist tells the truth about every template it describes.
 *
 * The checklist is the thing standing between a buyer and a silent failure, so
 * it has to be right in both directions:
 *
 *   soundness    - every step names a node, parameter path or value that is
 *                  genuinely in that template's JSON. A step pointing at a node
 *                  that does not exist is worse than no step: it sends someone
 *                  hunting for something that was never there.
 *   completeness - every trap the corpus is known to contain produces a step.
 *                  A missed WordPress draft or an undisclosed placeholder
 *                  sender is exactly the refund this work exists to prevent.
 *   no invention - a template with none of those traps gets none of those
 *                  steps. Manufacturing work makes the honest templates look
 *                  as broken as the rest and trains buyers to skip the list.
 *
 * The trap detectors here are written independently of the generator, against
 * the raw JSON, so this is a real cross-check rather than the rule agreeing
 * with itself.
 *
 * Usage: node scripts/check-setup-checklist.mjs [--sample N] [--all] [--verbose]
 * Exit code 1 on any failure.
 */
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const VERBOSE = argv.includes("--verbose");
const ALL = argv.includes("--all");
const SAMPLE = (() => {
  const i = argv.indexOf("--sample");
  return i === -1 ? 300 : Number(argv[i + 1]);
})();

// --- load the real generator ------------------------------------------------
// Compiled rather than reimplemented: a copy of the rule would drift and this
// script would then verify the copy instead of what ships.
const outDir = mkdtempSync(join(tmpdir(), "setup-check-"));
try {
  execFileSync(
    process.execPath,
    [
      join(ROOT, "node_modules/typescript/bin/tsc"),
      join(ROOT, "src/lib/setup-checklist.ts"),
      "--outDir", outDir,
      "--module", "commonjs",
      "--target", "es2022",
      "--moduleResolution", "node",
      "--skipLibCheck",
    ],
    { stdio: "pipe" },
  );
} catch (e) {
  console.error("could not compile setup-checklist.ts:\n" + (e.stdout?.toString() ?? e.message));
  process.exit(1);
}
// CommonJS output, loaded through createRequire: tsc emits bare relative
// specifiers ("./node-facts") which Node's ESM resolver rejects without an
// extension, and rewriting the emit would be a second place for this to break.
const { buildSetupChecklist } = createRequire(pathToFileURL(join(outDir, "_.cjs")).href)(
  join(outDir, "setup-checklist.js"),
);

const items = JSON.parse(readFileSync(join(ROOT, "src/data/catalog.json"), "utf8"));
const STICKY = "n8n-nodes-base.stickyNote";

// --- sample: every category represented -------------------------------------
function pickSample() {
  if (ALL) return items;
  const byCategory = new Map();
  for (const w of items) {
    const k = w.category ?? "(none)";
    if (!byCategory.has(k)) byCategory.set(k, []);
    byCategory.get(k).push(w);
  }
  const cats = [...byCategory.keys()].sort();
  const per = Math.max(1, Math.ceil(SAMPLE / cats.length));
  const out = [];
  for (const c of cats) {
    const list = byCategory.get(c);
    // Even stride through the category rather than the first N, so the sample
    // is not all consecutive ids from one generation run.
    const stride = Math.max(1, Math.floor(list.length / per));
    for (let i = 0, taken = 0; i < list.length && taken < per; i += stride, taken++) {
      out.push(list[i]);
    }
  }
  return out;
}

// --- independent trap detectors, straight off the JSON ----------------------
function realNodes(wf) {
  return (wf.nodes ?? []).filter((n) => n.type && n.type !== STICKY);
}
function scalars(node) {
  const out = [];
  const walk = (v, path) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, path));
    if (typeof v === "object") {
      for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
      return;
    }
    out.push({ path, value: String(v) });
  };
  walk(node.parameters ?? {}, "");
  return out;
}
function locators(node) {
  const out = [];
  const walk = (v, path) => {
    if (!v || typeof v !== "object") return;
    if (v.__rl === true) {
      out.push({ path, value: v.value, name: v.cachedResultName ?? "" });
      return;
    }
    for (const [k, x] of Object.entries(v)) {
      if (x && typeof x === "object") walk(x, path ? `${path}.${k}` : k);
    }
  };
  walk(node.parameters ?? {}, "");
  return out;
}

const EXAMPLE_HOST = /https?:\/\/[a-z0-9.-]*\bexample\.com\b/i;
const PLACEHOLDER_FALLBACK = /\|\|\s*'(YOUR_[A-Z0-9_]+|ONCALL_NUMBER|[A-Z][A-Z0-9_]{4,})'/;
const ENV_REF = /\$env\.([A-Z0-9_]+)/;
const IDEMPOTENT_NAME = /\b(upsert|sync|update)\b/i;
const CREATE_OPS = new Set(["create", "insert", "append", "post", "send"]);
const SUBWORKFLOW = /(?:^|\.)(?:executeWorkflow|toolWorkflow)$/;
// Mirrors CANONICAL_LOCATORS in the generator. Duplicated deliberately: if the
// two disagree the assertion fails, which is the point of a cross-check.
const CANONICAL = {
  "n8n-nodes-base.googleSheets": ["documentId", "sheetName"],
  "n8n-nodes-base.notion": ["databaseId", "pageId", "blockId"],
  "n8n-nodes-base.airtable": ["base", "table"],
  "n8n-nodes-base.airtableTrigger": ["base", "table"],
  "n8n-nodes-base.googleDrive": ["driveId", "folderId", "fileId"],
  "n8n-nodes-base.googleCalendar": ["calendar"],
  "n8n-nodes-base.mySql": ["table"],
  "n8n-nodes-base.postgres": ["table", "schema"],
  "n8n-nodes-base.slack": ["channelId", "user"],
  "n8n-nodes-base.discord": ["channelId", "guildId"],
  "n8n-nodes-base.telegram": ["chatId"],
  "n8n-nodes-base.hubspot": [],
};
const isForeign = (type, path) => {
  const c = CANONICAL[type];
  return c ? !c.includes(path.split(".").pop()) : false;
};

/** The traps we expect the generator to have found, named by step title. */
function expectedTraps(wf) {
  const t = new Set();
  for (const n of realNodes(wf)) {
    const sc = scalars(n);
    if (
      n.type === "n8n-nodes-base.wordpress" &&
      sc.some((s) => s.path === "additionalFields.status" && s.value === "draft")
    ) {
      t.add("Decide whether posts should publish");
    }
    if (
      n.type === "n8n-nodes-base.twilio" &&
      sc.some((s) => s.path === "from" && s.value === "+15550100000")
    ) {
      t.add("Replace the Twilio sender number");
    }
    if (sc.some((s) => PLACEHOLDER_FALLBACK.test(s.value))) {
      t.add("Set a real fallback for the placeholder expressions");
    }
    if (sc.some((s) => EXAMPLE_HOST.test(s.value))) {
      t.add("Point the HTTP calls at your own endpoint");
    }
    if (sc.some((s) => ENV_REF.test(s.value))) {
      t.add("Set the environment variables, or inline the values");
    }
    const op = n.parameters?.operation;
    if (
      typeof op === "string" &&
      IDEMPOTENT_NAME.test(n.name ?? "") &&
      CREATE_OPS.has(op.toLowerCase())
    ) {
      t.add("Re-running will duplicate rows, despite the node name");
    }
  }
  if (Object.keys(wf.pinData ?? {}).length > 0) {
    t.add("Clear the pinned sample data before going live");
  }
  return t;
}

// --- checks -----------------------------------------------------------------
const sample = pickSample();
const stats = {
  templates: 0,
  categories: new Set(),
  steps: 0,
  credentialSteps: 0,
  bindingSteps: 0,
  behaviourSteps: 0,
  nodeRefs: 0,
  paramRefs: 0,
  placeholderRefs: 0,
  trapsExpected: 0,
  bindingFree: 0,
  missingSubWorkflow: 0,
  malformed: 0,
};
const failures = [];
const fail = (w, msg) => failures.push(`${w.id} (${w.category}) ${w.title}\n      ${msg}`);

for (const w of sample) {
  let wf;
  try {
    wf = JSON.parse(readFileSync(join(ROOT, "product-files", w.workflowFile), "utf8"));
  } catch {
    fail(w, "workflow file missing or unparseable");
    continue;
  }
  const c = buildSetupChecklist(wf);
  stats.templates++;
  stats.categories.add(w.category ?? "(none)");
  stats.steps += c.stepCount;
  stats.credentialSteps += c.credentials.length;
  stats.bindingSteps += c.bindings.length;
  stats.behaviourSteps += c.behaviour.length;
  if (c.bindingFree) stats.bindingFree++;
  if (c.missingSubWorkflows.length) stats.missingSubWorkflow++;
  if (c.malformedNodes.length) stats.malformed++;

  const nodes = realNodes(wf);
  const nodeNames = new Set(nodes.map((n) => n.name));
  const stickyHeadings = new Set(
    (wf.nodes ?? [])
      .filter((n) => n.type === STICKY)
      .map((n) => (n.parameters?.content ?? "").match(/^###\s+(.+)$/m)?.[1]?.trim())
      .filter(Boolean),
  );
  const allPaths = new Set();
  const allLocators = [];
  for (const n of nodes) {
    for (const s of scalars(n)) allPaths.add(s.path);
    for (const l of locators(n)) {
      allPaths.add(l.path);
      allLocators.push({ node: n.name, ...l });
    }
  }
  const unbound = allLocators.filter((l) => l.value === "" || l.value == null);

  // 1. SOUNDNESS - every node named in a step exists in this file.
  for (const step of [...c.credentials, ...c.bindings, ...c.behaviour]) {
    for (const name of step.nodes) {
      stats.nodeRefs++;
      // Credential steps and the pinned-data step name sticky headings and
      // pinData keys respectively; both are node names in practice, but allow
      // either source rather than assuming.
      const ok = nodeNames.has(name) || stickyHeadings.has(name) || name in (wf.pinData ?? {});
      if (!ok) fail(w, `step "${step.title}" names node "${name}", which is not in the file`);
    }
    if (step.param) {
      stats.paramRefs++;
      if (!allPaths.has(step.param)) {
        fail(w, `step "${step.title}" cites parameter "${step.param}", not present in the file`);
      }
    }
  }

  // 2. SOUNDNESS - every string a binding step puts in quotes is a real thing
  //    in this file. Three kinds are legitimate and each is checked against the
  //    JSON: a locator's placeholder label ("Request Tracker"), a node name,
  //    and a parameter leaf a malformed-node step names ("documentId"). Nothing
  //    else may appear in quotes, so an invented token still fails.
  const leafNames = new Set([...allPaths].map((p) => p.split(".").pop()));
  for (const step of c.bindings) {
    const quoted = [...step.detail.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    for (const q of quoted) {
      if (nodeNames.has(q)) continue; // the step also names its nodes
      stats.placeholderRefs++;
      const isPlaceholder = allLocators.some((l) => l.name === q);
      const isParamLeaf = leafNames.has(q);
      if (!isPlaceholder && !isParamLeaf) {
        fail(
          w,
          `binding step quotes "${q}", which is neither a locator placeholder nor a parameter in the file`,
        );
      }
    }
  }

  // 3. COMPLETENESS - every unbound locator is addressed by some binding step.
  //    A locator on a malformed node counts as addressed by that node's rebuild
  //    step: it covers the whole node, so naming each foreign parameter as a
  //    separate "pick this" would contradict the advice to replace the node.
  for (const u of unbound) {
    const coveredByPick = c.bindings.some(
      (s) => s.nodes.includes(u.node) && (s.param === u.path || s.param === undefined),
    );
    const coveredByRebuild = c.malformedNodes.includes(u.node);
    if (!coveredByPick && !coveredByRebuild) {
      fail(w, `unbound locator ${u.node} / ${u.path} ("${u.name}") has no binding step`);
    }
  }

  // 4. COMPLETENESS - every known trap produces its step.
  const expected = expectedTraps(wf);
  stats.trapsExpected += expected.size;
  const titles = new Set(c.behaviour.map((s) => s.title));
  for (const e of expected) {
    if (!titles.has(e)) fail(w, `trap present in the file but missing from the checklist: "${e}"`);
  }

  // 5. NO INVENTION - no behaviour step without a trap behind it.
  for (const t of titles) {
    if (!expected.has(t)) fail(w, `checklist invents a behaviour step with no basis: "${t}"`);
  }

  // 6. NO INVENTION - a template with no unbound locators gets no binding steps.
  if (unbound.length === 0 && c.bindings.length > 0) {
    fail(w, `${c.bindings.length} binding step(s) on a template with nothing unbound`);
  }

  // 7. Malformed-node claims match the independent foreign-locator test, both
  //    ways: nothing claimed that is not foreign, nothing foreign left unclaimed.
  const foreignNodes = new Set(
    allLocators
      .filter((l) => (l.value === "" || l.value == null))
      .filter((l) => {
        const n = nodes.find((x) => x.name === l.node);
        return n && isForeign(n.type, l.path);
      })
      .map((l) => l.node),
  );
  for (const name of c.malformedNodes) {
    if (!foreignNodes.has(name)) fail(w, `claims node "${name}" is malformed, but it is not`);
  }
  for (const name of foreignNodes) {
    if (!c.malformedNodes.includes(name)) {
      fail(w, `node "${name}" carries a foreign locator but is not reported as malformed`);
    }
  }

  // 8. Sub-workflow claims: only for references the catalog genuinely lacks.
  const catalogTitles = new Set(items.map((x) => x.title.toLowerCase().trim()));
  for (const name of c.missingSubWorkflows) {
    const referenced = allLocators.some(
      (l) => l.name === name && nodes.some((n) => n.name === l.node && SUBWORKFLOW.test(n.type)),
    );
    if (!referenced) fail(w, `claims missing sub-workflow "${name}" that no node references`);
    if (catalogTitles.has(name.replace(/^lib:\s*/i, "").toLowerCase().trim())) {
      fail(w, `claims "${name}" is missing, but a catalog template has that title`);
    }
  }

  if (VERBOSE) {
    console.log(
      `  ${w.id} ${String(c.stepCount).padStart(2)} steps  ` +
        `${c.credentials.length}c/${c.bindings.length}b/${c.behaviour.length}x  ${w.category}`,
    );
  }
}

rmSync(outDir, { recursive: true, force: true });

// --- report -----------------------------------------------------------------
if (failures.length) {
  console.error("\nFAILURES\n");
  for (const f of failures.slice(0, 40)) console.error("  " + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
}

console.log(`
Setup-checklist assertion
  templates checked      ${stats.templates}
  categories covered     ${stats.categories.size}
  checklist steps        ${stats.steps}  (${stats.credentialSteps} credential, ${stats.bindingSteps} binding, ${stats.behaviourSteps} behaviour)
  node references        ${stats.nodeRefs}  - all verified present in the file
  parameter references   ${stats.paramRefs}  - all verified present in the file
  placeholder quotes     ${stats.placeholderRefs}  - all verified against real locators
  traps expected + found ${stats.trapsExpected}
  binding-free templates ${stats.bindingFree}
  missing sub-workflows  ${stats.missingSubWorkflow} templates
  malformed-node defects ${stats.malformed} templates
  failures               ${failures.length}
`);
process.exit(failures.length ? 1 : 0);
