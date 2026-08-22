/**
 * Binds the Google Calendar `calendar` locator to `primary`.
 *
 * Of the 39,022 unbound resource locators in the corpus, almost all name
 * something only the buyer can supply - their spreadsheet, their Airtable base,
 * their Drive folder. 127 are different: the Google Calendar node's `calendar`
 * parameter accepts the literal `primary`, which Google defines as the
 * authenticated account's default calendar. Every Google account has one, so
 * this is a value that is correct for every buyer without knowing anything
 * about them. It is the only slice of the unbound problem that is genuinely
 * fixable in the data rather than documentable.
 *
 * The label goes too. Each of these ships as
 *
 *   { __rl: true, mode: "list", value: "", cachedResultName: "Team Calendar" }
 *
 * and binding the value while leaving that label would recreate the exact
 * defect this work exists to remove: a dropdown reading "Team Calendar" while
 * pointing at the user's personal calendar. `mode: "id"` with no
 * cachedResultName is the corpus's own shape for a literal value (340 existing
 * locators use it) and it claims nothing it cannot back up.
 *
 * Writing to the buyer's own calendar rather than a shared team one is a real
 * behavioural difference from what the node was named for, so it is not left
 * silent: setup-checklist.ts emits a behaviour step for it. The template now
 * runs on import, and the buyer is told where the events are going.
 *
 * Idempotent - re-running changes nothing. Pass --check to fail without writing.
 *
 *   node scripts/apply-calendar-default.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const DATA = path.join(ROOT, "src", "data");
const check = process.argv.includes("--check");

const CALENDAR_NODE = "n8n-nodes-base.googleCalendar";
/** Google's documented alias for the authenticated account's own calendar. */
const PRIMARY = "primary";

const items = JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"));

/**
 * Rewrites the calendar locator in place. Deliberately narrow: only a locator
 * named exactly `calendar`, only on a Google Calendar node, only when it has no
 * value. Anything else - a different node, a different parameter, a locator
 * someone has already bound - is left alone.
 */
function bindCalendar(value, key, onChange) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) bindCalendar(v, key, onChange);
    return;
  }
  const obj = value;
  if (obj.__rl === true) {
    if (key === "calendar" && (obj.value === "" || obj.value === null || obj.value === undefined)) {
      const before = JSON.stringify(obj);
      for (const k of Object.keys(obj)) delete obj[k];
      obj.__rl = true;
      obj.mode = "id";
      obj.value = PRIMARY;
      onChange(before);
    }
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") bindCalendar(v, k, onChange);
  }
}

let filesChanged = 0;
let locatorsBound = 0;
let nodesTouched = 0;
const stale = [];

for (const w of items) {
  const fp = path.join(ROOT, "product-files", w.workflowFile);
  let raw;
  try {
    raw = fs.readFileSync(fp, "utf8");
  } catch {
    continue;
  }
  const j = JSON.parse(raw);
  let changedHere = 0;
  for (const n of j.nodes ?? []) {
    if (n.type !== CALENDAR_NODE) continue;
    let nodeChanged = 0;
    bindCalendar(n.parameters, "", () => {
      nodeChanged++;
      changedHere++;
    });
    if (nodeChanged) nodesTouched++;
  }
  if (!changedHere) continue;

  const out = JSON.stringify(j);
  if (out === raw) continue;
  filesChanged++;
  locatorsBound += changedHere;
  if (check) stale.push(w.id);
  else fs.writeFileSync(fp, out);
}

if (check) {
  if (stale.length) {
    console.error(
      `${stale.length} files still have an unbound Google Calendar locator — run: node scripts/apply-calendar-default.mjs`,
    );
    process.exit(1);
  }
  console.log("Google Calendar locators already bound to primary.");
} else {
  console.log(
    filesChanged === 0
      ? "nothing to do — every Google Calendar locator is already bound."
      : `bound ${locatorsBound} calendar locators to "${PRIMARY}" across ${nodesTouched} nodes in ${filesChanged} files.`,
  );
}
