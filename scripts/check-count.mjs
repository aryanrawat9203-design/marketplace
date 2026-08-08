/**
 * Fails if TEMPLATE_COUNT in src/lib/site.ts disagrees with catalog.json.
 * Marketing copy quotes the catalog size in several places; this keeps the
 * quoted number honest after templates are added or retired.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  fs.readFileSync(path.join(here, "..", "src", "data", "catalog.json"), "utf8"),
);
const site = fs.readFileSync(path.join(here, "..", "src", "lib", "site.ts"), "utf8");
const declared = Number(site.match(/TEMPLATE_COUNT\s*=\s*(\d+)/)?.[1]);

if (declared !== catalog.length) {
  console.error(
    `TEMPLATE_COUNT is ${declared} but catalog.json has ${catalog.length} records — update src/lib/site.ts`,
  );
  process.exit(1);
}
console.log(`TEMPLATE_COUNT matches catalog (${catalog.length})`);
