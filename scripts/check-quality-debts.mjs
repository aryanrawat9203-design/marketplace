/**
 * Asserts the three data/copy fixes landed exactly, and nothing else moved.
 *
 * Each of these is the kind of change that is easy to get almost right: a
 * behaviour note that fires on templates it does not apply to, a default
 * written onto the wrong node, a curriculum whose replacement is itself
 * withdrawn. So each is checked in both directions - present where it should
 * be, absent where it should not.
 *
 *   node scripts/check-quality-debts.mjs [--all]
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
const bundles = JSON.parse(fs.readFileSync(path.join(DATA, "bundles.json"), "utf8"));
const withdrawn = new Set(
  JSON.parse(fs.readFileSync(path.join(DATA, "withdrawn.json"), "utf8")).items.map((w) => w.id),
);
const byId = new Map(items.map((w) => [w.id, w]));

const { exports: rule, dispose } = loadTsModule(ROOT, "src/lib/setup-checklist.ts");
const STICKY = "n8n-nodes-base.stickyNote";
const SUB = /(?:^|\.)(?:executeWorkflow|toolWorkflow)$/;
const ASYM_TITLE = /^The routed arms are not equivalent/;
const CAL_TITLE = /^Calendar events go to your own primary calendar/;

/** Independent re-derivation of the asymmetry, straight off the graph. */
const ACTING_TYPES = new Set([
  "n8n-nodes-base.slack",
  "n8n-nodes-base.discord",
  "n8n-nodes-base.telegram",
  "n8n-nodes-base.twilio",
  "n8n-nodes-base.gmail",
  "n8n-nodes-base.microsoftOutlook",
  "n8n-nodes-base.microsoftTeams",
  "n8n-nodes-base.whatsApp",
]);

function locators(value, out) {
  if (!value || typeof value !== "object") return;
  if (value.__rl === true) {
    out.push(value);
    return;
  }
  for (const v of Object.values(value)) if (v && typeof v === "object") locators(v, out);
}

function expectAsymmetry(wf) {
  const nodes = (wf.nodes ?? []).filter((n) => n.type && n.type !== STICKY);
  const byName = new Map(nodes.map((n) => [n.name, n]));
  for (const sw of nodes) {
    if (sw.type !== "n8n-nodes-base.switch") continue;
    let delegating = false;
    // A switch can have several acting arms - WF09930 routes 'billing' and
    // 'howto' to two different Discord nodes. The claim being checked is that
    // SOME sibling arm acts, so any of them is a truthful thing for the step to
    // name; pinning the assertion to one particular arm would fail the
    // generator for picking a different real one.
    const acting = [];
    for (const arm of wf.connections?.[sw.name]?.main ?? []) {
      for (const c of arm ?? []) {
        const t = byName.get(c?.node);
        if (!t?.type) continue;
        if (SUB.test(t.type)) {
          const locs = [];
          locators(t.parameters, locs);
          if (locs.some((l) => /^lib:/i.test(l.cachedResultName ?? ""))) delegating = true;
        } else if (ACTING_TYPES.has(t.type)) acting.push(t);
      }
    }
    if (delegating && acting.length) return { sw: sw.name, acting };
  }
  return null;
}

// --- 1 + 2. per-template checks --------------------------------------------
const stats = {
  scanned: 0,
  asymExpected: 0,
  asymEmitted: 0,
  calNodes: 0,
  calBound: 0,
  calNoteTemplates: 0,
  calBindingSteps: 0,
};

const sample = ALL ? items : items.filter((_, i) => i % 7 === 0);
for (const w of sample) {
  let wf;
  try {
    wf = JSON.parse(fs.readFileSync(path.join(ROOT, "product-files", w.workflowFile), "utf8"));
  } catch {
    continue;
  }
  stats.scanned++;
  const c = rule.buildSetupChecklist(wf);
  const emitted = c.behaviour.filter((s) => ASYM_TITLE.test(s.title));
  const expected = expectAsymmetry(wf);

  if (expected) stats.asymExpected++;
  if (emitted.length) stats.asymEmitted++;

  if (expected && emitted.length === 0) fail(`${w.id}: has a switch asymmetry but no step`);
  if (!expected && emitted.length > 0) fail(`${w.id}: emits an asymmetry step with no asymmetry`);

  // the step must name an action that genuinely exists in this file
  for (const s of emitted) {
    const names = new Set((wf.nodes ?? []).map((n) => n.name));
    for (const n of s.nodes) if (!names.has(n)) fail(`${w.id}: asymmetry step names absent node "${n}"`);
    const named = expected?.acting.find((a) => s.detail.includes(a.name));
    if (expected && !named) {
      fail(
        `${w.id}: asymmetry step names no acting arm (file has ${expected.acting.map((a) => a.name).join(", ")})`,
      );
    }
    // the quoted destination, if any, must be a literal in the arm it named
    const dest = s.detail.match(/ to (#[^\s.]+|[^\s.]+@[^\s.]+)/)?.[1];
    if (dest && named && !JSON.stringify(named.parameters ?? {}).includes(dest)) {
      fail(`${w.id}: asymmetry step quotes destination "${dest}" absent from ${named.name}`);
    }
  }

  // Calendar: every calendar locator bound to primary, mode id, no stale label
  let hasCal = false;
  for (const n of (wf.nodes ?? []).filter((x) => x.type === "n8n-nodes-base.googleCalendar")) {
    stats.calNodes++;
    const locs = [];
    locators(n.parameters, locs);
    for (const l of locs) {
      if (l.value !== "primary") continue;
      hasCal = true;
      stats.calBound++;
      if (l.mode !== "id") fail(`${w.id}: calendar bound to primary but mode is "${l.mode}"`);
      if (l.cachedResultName !== undefined) {
        fail(`${w.id}: calendar bound to primary still carries cachedResultName "${l.cachedResultName}"`);
      }
    }
  }
  // "primary" must appear on Calendar nodes only
  for (const n of (wf.nodes ?? []).filter((x) => x.type && x.type !== STICKY)) {
    if (n.type === "n8n-nodes-base.googleCalendar") continue;
    const locs = [];
    locators(n.parameters, locs);
    for (const l of locs) {
      if (l.value === "primary") fail(`${w.id}: non-calendar node "${n.name}" has a locator set to "primary"`);
    }
  }

  const calNotes = c.behaviour.filter((s) => CAL_TITLE.test(s.title)).length;
  const calBindings = c.bindings.filter((s) => /Calendar/i.test(s.title)).length;
  stats.calBindingSteps += calBindings;
  if (calNotes) stats.calNoteTemplates++;
  if (hasCal && calNotes === 0) fail(`${w.id}: calendar bound to primary but no behaviour note`);
  if (!hasCal && calNotes > 0) fail(`${w.id}: primary-calendar note with no bound calendar`);
  if (calBindings > 0) fail(`${w.id}: still has a Google Calendar binding step`);
}

// --- 3. practice bundles ----------------------------------------------------
let practiceIds = 0, deadIds = 0, dupes = 0;
for (const p of bundles.filter((b) => b.type === "practice")) {
  const seen = new Set();
  for (const id of p.items ?? []) {
    practiceIds++;
    if (!byId.has(id)) { deadIds++; fail(`${p.slug}: id ${id} is not in the catalog`); }
    else if (withdrawn.has(id)) { deadIds++; fail(`${p.slug}: id ${id} is withdrawn`); }
    if (seen.has(id)) { dupes++; fail(`${p.slug}: id ${id} appears twice`); }
    seen.add(id);
  }
}

// --- 4. invariants that must survive ---------------------------------------
const { exports: bundlesLib, dispose: d2 } = loadTsModule(ROOT, "src/lib/bundles.ts");
let cheaper = 0, bundleCount = 0;
for (const b of bundlesLib.getBundles()) {
  bundleCount++;
  const members = bundlesLib.bundleMembersIndex(b);
  const sum = members.reduce((a, w) => a + (w.price ?? 0), 0);
  if (b.count === 0) fail(`bundle ${b.slug} has no members`);
  if (!(b.price < sum)) fail(`bundle ${b.slug} costs ${b.price} vs member sum ${sum}`);
  else cheaper++;
  for (const m of members) {
    if (withdrawn.has(m.id)) fail(`bundle ${b.slug} resolves withdrawn ${m.id}`);
    if (m.mrp !== m.price) fail(`${m.id}: mrp ${m.mrp} != price ${m.price}`);
    if (m.off !== 0) fail(`${m.id}: off is ${m.off}`);
  }
}
d2();
dispose();

if (failures.length) {
  console.error("\nFAILURES\n");
  for (const f of failures.slice(0, 30)) console.error("  " + f);
  if (failures.length > 30) console.error(`  ... and ${failures.length - 30} more`);
}

console.log(`
Quality-debt assertion${ALL ? " (full corpus)" : " (1-in-7 sample)"}
  templates scanned            ${stats.scanned}
  switch asymmetry: expected   ${stats.asymExpected}, emitted ${stats.asymEmitted}  - sets identical
  asymmetry steps name only nodes and destinations present in the file
  Google Calendar nodes seen   ${stats.calNodes}, locators bound to primary ${stats.calBound}
   - all mode "id", none carrying a stale cachedResultName
   - "primary" appears on no non-Calendar locator
  templates with the primary-calendar note   ${stats.calNoteTemplates}
  remaining Calendar binding steps           ${stats.calBindingSteps}
  practice-bundle ids           ${practiceIds}, withdrawn or missing ${deadIds}, duplicated ${dupes}
  bundles cheaper than members  ${cheaper}/${bundleCount}   (mrp === price, off === 0 held throughout)
  failures                      ${failures.length}
`);
process.exit(failures.length ? 1 : 0);
