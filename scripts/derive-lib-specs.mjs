/**
 * Derives src/data/lib-specs.json: what each `lib:` sub-workflow has to be,
 * read off the templates that call it.
 *
 * The 45 `lib:` names were referenced by 1,710 templates and never written. The
 * temptation is to guess what a "Research Specialist" should do from its name.
 * This reads the evidence instead:
 *
 *   - the calling node's type (`executeWorkflow` vs `toolWorkflow`), which says
 *     whether it is a pipeline step or an agent tool
 *   - the calling node's name, which for the switch-branch family carries the
 *     branch it handles: `Delegate 'standard' to Sub-workflow`
 *   - `options.waitForSubWorkflow`, which says whether the parent blocks on it
 *   - the node immediately upstream, which for that family is the switch
 *   - and decisively, every `$json.<field>` the nodes downstream of the call
 *     actually read, which is the only hard statement of the return contract
 *     anywhere in the corpus
 *
 * scripts/build-libs.mjs turns this into workflows. Keeping the two apart means
 * the specs can be reviewed as evidence before anything is built from them.
 *
 *   node scripts/derive-lib-specs.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const DATA = path.join(ROOT, "src", "data");
const OUT = path.join(DATA, "lib-specs.json");

const check = process.argv.includes("--check");

const items = JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"));
const withdrawn = new Set(
  JSON.parse(fs.readFileSync(path.join(DATA, "withdrawn.json"), "utf8")).items.map((w) => w.id),
);

const SUB = /(?:^|\.)(?:executeWorkflow|toolWorkflow)$/;
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);

function locators(value, out) {
  if (!value || typeof value !== "object") return;
  if (value.__rl === true) {
    out.push(value);
    return;
  }
  for (const v of Object.values(value)) if (v && typeof v === "object") locators(v, out);
}

const libs = new Map();
const get = (name) => {
  if (!libs.has(name)) {
    libs.set(name, {
      name,
      callers: 0,
      sellable: 0,
      types: new Map(),
      callNodeNames: new Map(),
      descriptions: new Set(),
      reads: new Map(),
      waitFor: new Map(),
      upstream: new Map(),
      parents: [],
    });
  }
  return libs.get(name);
};

for (const w of items) {
  let j;
  try {
    j = JSON.parse(fs.readFileSync(path.join(ROOT, "product-files", w.workflowFile), "utf8"));
  } catch {
    continue;
  }
  const real = (j.nodes ?? []).filter((n) => n.type !== "n8n-nodes-base.stickyNote");
  const byName = new Map(real.map((n) => [n.name, n]));

  const downstreamOf = new Map();
  const upstreamOf = new Map();
  for (const [from, out] of Object.entries(j.connections ?? {})) {
    const targets = (out.main ?? []).flat().filter(Boolean).map((c) => c.node);
    downstreamOf.set(from, targets);
    for (const t of targets) upstreamOf.set(t, from);
  }

  for (const n of real) {
    if (!SUB.test(n.type ?? "")) continue;
    const locs = [];
    locators(n.parameters, locs);
    for (const l of locs) {
      const name = l.cachedResultName;
      if (!name || !/^lib:/i.test(name)) continue;
      const e = get(name);
      e.callers++;
      if (!withdrawn.has(w.id)) e.sellable++;
      bump(e.types, n.type.replace(/^.*\./, ""));
      bump(e.callNodeNames, n.name ?? "");
      if (typeof n.parameters?.description === "string") e.descriptions.add(n.parameters.description);
      if (n.parameters?.options?.waitForSubWorkflow !== undefined) {
        bump(e.waitFor, String(n.parameters.options.waitForSubWorkflow));
      }
      const up = upstreamOf.get(n.name);
      if (up) bump(e.upstream, `${up} [${byName.get(up)?.type.replace(/^.*\./, "") ?? "?"}]`);
      for (const t of downstreamOf.get(n.name ?? "") ?? []) {
        const tn = byName.get(t);
        if (!tn) continue;
        const txt = JSON.stringify(tn.parameters ?? {});
        for (const m of txt.matchAll(/\$json\.([A-Za-z_][A-Za-z0-9_]*)/g)) bump(e.reads, m[1]);
        for (const m of txt.matchAll(/\$json\[['"]([^'"]+)['"]\]/g)) bump(e.reads, m[1]);
      }
      if (e.parents.length < 8) e.parents.push(w.id);
    }
  }
}

const specs = [...libs.values()]
  .sort((a, b) => b.callers - a.callers || a.name.localeCompare(b.name))
  .map((e) => {
    const family = /Specialist$/.test(e.name)
      ? "A-specialist"
      : /^lib: Post-Process/.test(e.name)
        ? "B-postprocess"
        : "C-branch";
    // `Delegate 'standard' to Sub-workflow` -> standard
    const branches = [
      ...new Set([...e.callNodeNames.keys()].map((n) => n.match(/'([^']+)'/)?.[1]).filter(Boolean)),
    ];
    return {
      name: e.name,
      family,
      callers: e.callers,
      sellable: e.sellable,
      callType: [...e.types.keys()].sort().join("+"),
      branch: branches.length === 1 ? branches[0] : null,
      branchesSeen: branches,
      callNodeNames: [...e.callNodeNames.keys()].sort(),
      upstream: [...e.upstream.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      waitForSubWorkflow: Object.fromEntries(e.waitFor),
      reads: [...e.reads.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k}:${c}`),
      descriptionVariants: e.descriptions.size,
      sampleParents: e.parents.slice(0, 4),
    };
  });

const body =
  JSON.stringify(
    {
      generatedBy: "scripts/derive-lib-specs.mjs",
      note: "Contracts read off the parents that call each lib. `reads` is the decisive field: it lists every $json key the nodes downstream of the call actually consume, with how many call sites consume it.",
      count: specs.length,
      items: specs,
    },
    null,
    2,
  ) + "\n";

const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (check) {
  if (current !== body) {
    console.error(`src/data/lib-specs.json is stale — run: node scripts/derive-lib-specs.mjs`);
    process.exit(1);
  }
  console.log(`lib-specs.json up to date — ${specs.length} specs.`);
} else {
  fs.writeFileSync(OUT, body);
  const byFamily = specs.reduce((a, s) => ({ ...a, [s.family]: (a[s.family] ?? 0) + 1 }), {});
  console.log(
    `wrote ${specs.length} specs (${JSON.stringify(byFamily)}), ${specs.reduce((s, x) => s + x.callers, 0)} call sites.`,
  );
}
