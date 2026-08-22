/**
 * Generates src/data/withdrawn.json - the templates taken off sale.
 *
 * A template is withdrawn when it contains a node carrying a parameter set that
 * cannot belong to its node type: 52 nodes typed `n8n-nodes-base.mySql` hold
 * `documentId`, `sheetName` and `operation: "appendOrUpdate"`, the complete
 * Google Sheets parameter set, and no MySQL parameters at all. Such a node
 * cannot be configured, only rebuilt, so the template does not work and cannot
 * be made to work by following any setup instructions.
 *
 * Disclosing that on the product page and offering a refund is still selling a
 * knowingly non-functional product, at up to Rs 6,999. With no customers yet,
 * withdrawing costs nothing.
 *
 * The rule is not restated here. It runs `buildSetupChecklist` from
 * src/lib/setup-checklist.ts and takes the templates whose `malformedNodes` is
 * non-empty, so the withdrawal set and the on-page defect banner can never
 * disagree about which templates are broken.
 *
 * The result is a generated artifact rather than a runtime scan because the
 * predicate has to read `parameters` from every product file - far too slow to
 * do per request. Same contract as catalog-index.json: run after any change to
 * the corpus, and `--check` fails without writing.
 *
 *   node scripts/build-withdrawn.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./lib/load-ts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const DATA = path.join(ROOT, "src", "data");
const OUT = path.join(DATA, "withdrawn.json");

const check = process.argv.includes("--check");

const { exports: rule, dispose } = loadTsModule(ROOT, "src/lib/setup-checklist.ts");
const catalog = JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"));

const withdrawn = [];
let unreadable = 0;

for (const w of catalog) {
  let wf;
  try {
    wf = JSON.parse(fs.readFileSync(path.join(ROOT, "product-files", w.workflowFile), "utf8"));
  } catch {
    unreadable++;
    continue; // a file we cannot read is not evidence of a defect
  }
  const { malformedNodes } = rule.buildSetupChecklist(wf);
  if (malformedNodes.length > 0) {
    withdrawn.push({ id: w.id, route: w.route, nodes: malformedNodes });
  }
}
dispose();

withdrawn.sort((a, b) => a.id.localeCompare(b.id));

// `reason` is stored once rather than per row: every entry is withdrawn for the
// same rule, and repeating the sentence 496 times makes the diff unreadable.
const body =
  JSON.stringify(
    {
      reason: "node carries a parameter set belonging to a different n8n node type",
      generatedBy: "scripts/build-withdrawn.mjs",
      count: withdrawn.length,
      items: withdrawn,
    },
    null,
    2,
  ) + "\n";

const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";

if (check) {
  if (current !== body) {
    console.error(
      `src/data/withdrawn.json is stale (${withdrawn.length} templates detected) — run: node scripts/build-withdrawn.mjs`,
    );
    process.exit(1);
  }
  console.log(`withdrawn.json up to date — ${withdrawn.length} templates withdrawn.`);
} else {
  fs.writeFileSync(OUT, body);
  console.log(
    `withdrawn.json written — ${withdrawn.length} of ${catalog.length} templates withdrawn` +
      (unreadable ? ` (${unreadable} files unreadable, left on sale)` : ""),
  );
}
