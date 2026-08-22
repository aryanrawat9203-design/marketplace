/**
 * Generates the 45 `lib:` sub-workflows that 1,710 templates call and nobody
 * ever wrote, plus src/data/libs.json mapping each name to its file.
 *
 * WHERE THE SPECS COME FROM
 *
 * Nothing here is invented. Every contract is read off the parents that call
 * the lib: the calling node's name and sticky note, whether it is an
 * `executeWorkflow` or a `toolWorkflow`, the `waitForSubWorkflow` flag, and -
 * decisively - which `$json` fields the nodes downstream of the call actually
 * read. That produces three families, and the families are clean:
 *
 *   A. Specialists (3 libs, 1,121 call sites) - wired to a Coordinator Agent
 *      through `ai_tool`. The agent consumes the output as text; no downstream
 *      node reads a named field. Each parent's tool description says what it
 *      delegates ("Delegate research sub-tasks for a request ...").
 *
 *   B. Post-Process <Noun> (22 libs, 1,222 call sites) - `executeWorkflow` with
 *      waitForSubWorkflow. The success branch is an executionData node reading
 *      `{{ $json.status || 'done' }}`; the failure branch reads
 *      `$json.error.node.name` and `$json.error.message`, which is n8n's own
 *      error envelope rather than anything the lib returns. So the contract is
 *      exactly: return items carrying `status`.
 *
 *   C. Process <Branch> <Noun> (20 libs, 156 call sites) - `executeWorkflow`
 *      hanging off a `Route by Work Type` switch, called from a node named
 *      `Delegate '<branch>' to Sub-workflow`, feeding a `Merge Routed Work`
 *      node in append mode. Only the error rail is read. Contract: take the
 *      routed items, return them handled.
 *
 * DESIGN CHOICES, AND WHY
 *
 * - `inputSource: "passthrough"` on every trigger. Every existing caller has
 *   `workflowInputs.value = {}` with an empty schema - they declare no inputs.
 *   Declaring fields here would mean re-configuring 2,499 call sites to match,
 *   which is a bigger edit than this task should make. Passthrough accepts
 *   whatever the parent emits and therefore cannot mismatch a caller.
 *
 * - Families B and C use no credentials and call nothing external. 58 of the
 *   Post-Process parents contain no model node at all, so a lib that needed one
 *   would be unusable in those. Deterministic normalisation is what the
 *   evidence supports and it imports and runs with nothing configured.
 *
 * - The three specialists need a model, and the parents do not agree on one:
 *   across their 1,121 call sites the provider splits roughly evenly between
 *   Gemini, OpenAI, OpenRouter, Anthropic and Groq. There is no convention to
 *   follow, so they ship with the modal provider (Gemini) and say plainly, in
 *   the node note and in the setup checklist, that it should be swapped to
 *   whatever the parent uses. That is the disagreement made visible rather than
 *   decided silently.
 *
 *   node scripts/build-libs.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const DATA = path.join(ROOT, "src", "data");
const LIB_DIR = path.join(ROOT, "product-files", "lib");
const MANIFEST = path.join(DATA, "libs.json");

const check = process.argv.includes("--check");

// ---------------------------------------------------------------- house style
// typeVersions match what the corpus already ships, so a lib and a template
// import into the same n8n without one of them being a version outlier.
const TV = {
  trigger: 1.1, // executeWorkflowTrigger - the one node type the corpus lacks
  set: 3.4,
  code: 2,
  sticky: 1,
  chainLlm: 1.7,
  gemini: 1,
};

/** Stable ids: regeneration must produce a byte-identical file or --check lies. */
function uuid(seed) {
  const h = crypto.createHash("sha1").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function sticky(name, body, pos, { width = 300, height = 240, color = 5 } = {}) {
  return {
    parameters: { content: body.trim(), width, height, color },
    type: "n8n-nodes-base.stickyNote",
    typeVersion: TV.sticky,
    position: pos,
    id: uuid("sticky:" + name + body.slice(0, 40)),
    name: `Note: ${name}`,
  };
}

function trigger(libName, pos) {
  return {
    parameters: { inputSource: "passthrough" },
    type: "n8n-nodes-base.executeWorkflowTrigger",
    typeVersion: TV.trigger,
    position: pos,
    id: uuid("trigger:" + libName),
    name: "When Executed by Parent Workflow",
    notes:
      "Entry point when a parent workflow calls this one. Set to passthrough: the calling nodes in the catalog declare no input fields, so whatever the parent emits arrives here unchanged.",
  };
}

function setNode(libName, name, assignments, pos, notes) {
  return {
    parameters: {
      assignments: {
        assignments: assignments.map((a, i) => ({
          id: uuid(`set:${libName}:${name}:${a.name}:${i}`),
          name: a.name,
          value: a.value,
          type: a.type ?? "string",
        })),
      },
      options: {},
    },
    type: "n8n-nodes-base.set",
    typeVersion: TV.set,
    position: pos,
    id: uuid("setnode:" + libName + name),
    name,
    notes,
  };
}

function codeNode(libName, name, jsCode, pos, notes) {
  return {
    parameters: { mode: "runOnceForAllItems", jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: TV.code,
    position: pos,
    id: uuid("code:" + libName + name),
    name,
    notes,
  };
}

function wf(libName, nodes, connections, { note }) {
  return {
    name: libName,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    meta: { templateCredsSetupCompleted: false },
    tags: [],
    pinData: {},
    versionId: uuid("version:" + libName),
    id: uuid("workflow:" + libName).replace(/-/g, "").slice(0, 16),
    __note: note, // stripped before write; kept for the manifest
  };
}

/** Common closing documentation panels, in the catalog's own house style. */
function docPanels(libName, summary, contract, credentials, troubleshooting, x) {
  return [
    sticky(
      libName + " overview",
      `## ${libName}\n\n${summary}\n\n**Called by:** parent templates that reference \`${libName}\` in an Execute Workflow or Workflow Tool node.`,
      [x, -260],
      { width: 460, height: 220, color: 4 },
    ),
    sticky(
      libName + " contract",
      `### Contract\n\n${contract}`,
      [x, -20],
      { width: 460, height: 240, color: 7 },
    ),
    sticky(
      libName + " credentials",
      `### Credentials setup\n\n${credentials}`,
      [x, 240],
      { width: 460, height: 200, color: 3 },
    ),
    sticky(
      libName + " troubleshooting",
      `### Troubleshooting\n\n${troubleshooting}`,
      [x, 460],
      { width: 460, height: 260, color: 6 },
    ),
  ];
}

// ------------------------------------------------------------ family builders

/** A. Specialist tool: agent delegates a sub-task, gets text back. */
function buildSpecialist(libName, kind) {
  const verb = { Research: "research", Draft: "draft", Review: "review" }[kind];
  const brief = {
    Research:
      "Gather and summarise what is known about the assignment. Return findings only - no drafting, no recommendations beyond what the sources support. If you are unsure, say so rather than filling the gap.",
    Draft:
      "Write the requested piece from the assignment and any findings supplied with it. Match the register asked for. Return the draft only, with no preamble and no commentary about the draft.",
    Review:
      "Assess the supplied work against the assignment. Return concrete, specific corrections - what is wrong, where, and what to change. If it is fit to ship, say that plainly instead of inventing objections.",
  }[kind];

  const nodes = [
    trigger(libName, [-560, 300]),
    setNode(
      libName,
      "Read the Assignment",
      [
        {
          name: "assignment",
          value:
            "={{ $json.query || $json.task || $json.assignment || $json.chatInput || $json.input || JSON.stringify($json) }}",
        },
        { name: "specialist", value: kind },
      ],
      [-300, 300],
      "Normalises whatever the agent passed into a single `assignment` string. The tool node in the parent declares no input schema, so the field name it arrives under varies - this accepts the ones the corpus actually uses and falls back to the whole payload.",
    ),
    {
      parameters: {
        promptType: "define",
        text: `=${brief}\n\nAssignment:\n{{ $json.assignment }}`,
        options: {},
      },
      type: "@n8n/n8n-nodes-langchain.chainLlm",
      typeVersion: TV.chainLlm,
      position: [-40, 300],
      id: uuid("chain:" + libName),
      name: `${kind} the Assignment`,
      notes:
        "Single fixed LLM step rather than a nested agent: this workflow is already the specialist the coordinator delegated to, so it needs no tool choice of its own.",
    },
    {
      parameters: { model: "models/gemini-2.5-flash", options: {} },
      type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      typeVersion: TV.gemini,
      position: [-40, 520],
      id: uuid("model:" + libName),
      name: "Google Gemini Chat Model",
      notes:
        "Swap this for the provider your parent workflow uses. The templates calling this lib are split roughly evenly across Gemini, OpenAI, OpenRouter, Anthropic and Groq, so there is no single right default - this is the most common one, not a requirement. Credential: Google AI API key (aistudio.google.com/apikey).",
    },
    setNode(
      libName,
      "Return the Result",
      [
        { name: "specialist", value: `={{ $('Read the Assignment').item.json.specialist }}` },
        { name: "assignment", value: `={{ $('Read the Assignment').item.json.assignment }}` },
        { name: "result", value: "={{ $json.text }}" },
        { name: "status", value: "done" },
      ],
      [220, 300],
      "The agent reads this back as the tool's answer. `result` carries the text; `status` is included so this lib can also be called from an Execute Workflow node, whose callers read `$json.status`.",
    ),
  ];

  const connections = {
    "When Executed by Parent Workflow": { main: [[{ node: "Read the Assignment", type: "main", index: 0 }]] },
    "Read the Assignment": { main: [[{ node: `${kind} the Assignment`, type: "main", index: 0 }]] },
    [`${kind} the Assignment`]: { main: [[{ node: "Return the Result", type: "main", index: 0 }]] },
    "Google Gemini Chat Model": {
      ai_languageModel: [[{ node: `${kind} the Assignment`, type: "ai_languageModel", index: 0 }]],
    },
  };

  nodes.push(
    sticky(
      "When Executed by Parent Workflow",
      "### When Executed by Parent Workflow\n\nEntry point. Passthrough, so the agent's tool input arrives unchanged.\n\nNext: Read the Assignment",
      [-620, 60],
      { height: 200 },
    ),
    sticky(
      "Read the Assignment",
      "### Read the Assignment\n\nCollapses the incoming payload to one `assignment` string.\n\nNext: " +
        kind +
        " the Assignment",
      [-310, 60],
      { height: 200 },
    ),
    sticky(
      kind + " the Assignment",
      `### ${kind} the Assignment\n\nOne fixed LLM call, scoped to ${verb} only.\n\n🔑 Google AI API key\n\nNext: Return the Result`,
      [-50, 60],
      { height: 200 },
    ),
    sticky(
      "Return the Result",
      "### Return the Result\n\nShapes `{ specialist, assignment, result, status }` for the caller.",
      [210, 60],
      { height: 200 },
    ),
    ...docPanels(
      libName,
      `The ${verb} specialist a Coordinator Agent delegates to. ${nodes.length} nodes, one LLM call, no branching - it does one job so the coordinator can compose it with others.`,
      `**In:** whatever the agent sends. Read from \`query\`, \`task\`, \`assignment\`, \`chatInput\` or \`input\`, falling back to the whole payload.\n\n**Out:** \`{ specialist, assignment, result, status }\`. The agent reads \`result\`; \`status\` is there for Execute Workflow callers.`,
      "🔑 **Google AI API key** on the chat model node - aistudio.google.com/apikey → Create API key.\n\nIf your parent workflow uses a different provider, replace the model node with the one it already has configured and reuse that credential instead of creating a second one.",
      "**The agent never calls this tool.** Check the tool node in the parent has this workflow selected in its Workflow dropdown - the selector is empty until you pick it.\n\n**Empty `result`.** The model returned nothing for the assignment. Look at the assignment string this workflow received; if the agent sent an empty query the fault is upstream.",
      560,
    ),
  );

  return { workflow: wf(libName, nodes, connections, { note: `${kind} specialist` }), credentials: ["Google AI API key"] };
}

/** B. Post-Process <Noun>: deterministic tidy-up, returns items carrying status. */
function buildPostProcess(libName, noun) {
  const lower = noun.toLowerCase();
  const singular = noun.replace(/ies$/, "y").replace(/s$/, "");

  const jsCode = `// Normalise ${lower} coming back from the main pipeline.
// Deterministic and dependency-free on purpose: this lib is called by parents
// that have no credentials of their own configured, so it must run as imported.
const out = [];
for (const item of $input.all()) {
  const src = item.json ?? {};
  const clean = {};
  for (const [key, value] of Object.entries(src)) {
    if (value === undefined) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      clean[key] = trimmed === '' ? null : trimmed;
    } else {
      clean[key] = value;
    }
  }
  out.push({ json: clean });
}
return out;`;

  const nodes = [
    trigger(libName, [-560, 300]),
    codeNode(
      libName,
      `Normalise ${noun}`,
      jsCode,
      [-300, 300],
      "Trims every string field and turns blanks into null, so a downstream equality check does not treat '' and ' ' as different values. Drops undefined keys. Does not invent fields.",
    ),
    setNode(
      libName,
      "Stamp Post-Processing",
      [
        { name: "status", value: "done" },
        { name: "postProcessedBy", value: libName },
        { name: "postProcessedAt", value: "={{ $now.toISO() }}" },
      ],
      [-40, 300],
      "`status` is the field the caller reads: the parent's Record Sub-workflow Result node evaluates {{ $json.status || 'done' }}. The other two are provenance for anyone reading the run afterwards.",
    ),
  ];

  const connections = {
    "When Executed by Parent Workflow": { main: [[{ node: `Normalise ${noun}`, type: "main", index: 0 }]] },
    [`Normalise ${noun}`]: { main: [[{ node: "Stamp Post-Processing", type: "main", index: 0 }]] },
  };

  nodes.push(
    sticky(
      "When Executed by Parent Workflow",
      "### When Executed by Parent Workflow\n\nEntry point. Passthrough, so the parent's items arrive unchanged.\n\nNext: Normalise " +
        noun,
      [-620, 60],
      { height: 200 },
    ),
    sticky(
      "Normalise " + noun,
      `### Normalise ${noun}\n\nTrims strings, blanks become null, undefined keys dropped. No external calls.\n\nNext: Stamp Post-Processing`,
      [-310, 60],
      { height: 200 },
    ),
    sticky(
      "Stamp Post-Processing",
      "### Stamp Post-Processing\n\nWrites `status`, `postProcessedBy`, `postProcessedAt`.\n\nReturns to the calling workflow.",
      [-50, 60],
      { height: 200 },
    ),
    ...docPanels(
      libName,
      `Post-processing for ${lower}. Runs after the parent's main work, tidies the ${singular.toLowerCase()} records, and reports back. Deterministic: no credentials, no network.`,
      `**In:** the items the parent was holding when it called. No fields required.\n\n**Out:** the same items, each with \`status: "done"\`, \`postProcessedBy\` and \`postProcessedAt\` added. The parent reads \`status\`; the item count is preserved so nothing downstream sees fewer rows than it sent.`,
      "**None.** This lib calls nothing external, so it runs as imported.",
      "**Parent reports no status.** The Execute Workflow node in the parent must have `Wait For Sub-Workflow Completion` on - it is on by default in every template that calls this - otherwise the parent continues before this returns.\n\n**Fewer items than expected.** This lib never drops items. If the count fell, it fell upstream in the parent.",
      360,
    ),
  );

  return { workflow: wf(libName, nodes, connections, { note: `post-process ${lower}` }), credentials: [] };
}

/** C. Process <Branch> <Noun>: one arm of the parent's Route by Work Type switch. */
function buildBranch(libName, branch, noun) {
  const lower = noun.toLowerCase();
  const jsCode = `// Handle the '${branch}' arm of the parent's Route by Work Type switch.
// Deterministic: the parents that route here have no credentials configured for
// this step, so it must run as imported.
const out = [];
for (const item of $input.all()) {
  const src = item.json ?? {};
  const clean = {};
  for (const [key, value] of Object.entries(src)) {
    if (value === undefined) continue;
    clean[key] = typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;
  }
  clean.route = '${branch}';
  out.push({ json: clean });
}
return out;`;

  const nodes = [
    trigger(libName, [-560, 300]),
    codeNode(
      libName,
      `Apply '${branch}' Handling`,
      jsCode,
      [-300, 300],
      `Normalises the routed ${lower} and records which switch arm handled them. Add the '${branch}'-specific work here - this is the extension point the parent's switch was built around.`,
    ),
    setNode(
      libName,
      `Return Handled ${noun}`,
      [
        { name: "status", value: "done" },
        { name: "handledBy", value: libName },
        { name: "route", value: branch },
      ],
      [-40, 300],
      "Returns to the parent's Merge Routed Work node, which appends this arm's items alongside the others. `status` is set for consistency with the Post-Process libs; the branch callers only read the error rail.",
    ),
  ];

  const connections = {
    "When Executed by Parent Workflow": {
      main: [[{ node: `Apply '${branch}' Handling`, type: "main", index: 0 }]],
    },
    [`Apply '${branch}' Handling`]: { main: [[{ node: `Return Handled ${noun}`, type: "main", index: 0 }]] },
  };

  nodes.push(
    sticky(
      "When Executed by Parent Workflow",
      `### When Executed by Parent Workflow\n\nEntry point. Receives only the ${lower} the parent's switch sent down the '${branch}' arm.\n\nNext: Apply '${branch}' Handling`,
      [-620, 60],
      { height: 210 },
    ),
    sticky(
      `Apply '${branch}' Handling`,
      `### Apply '${branch}' Handling\n\nNormalises the items and tags \`route: '${branch}'\`.\n\n🛠 This is where '${branch}'-specific logic goes.\n\nNext: Return Handled ${noun}`,
      [-310, 60],
      { height: 210 },
    ),
    sticky(
      `Return Handled ${noun}`,
      `### Return Handled ${noun}\n\nWrites \`status\`, \`handledBy\`, \`route\`, then returns to the parent's Merge Routed Work.`,
      [-50, 60],
      { height: 210 },
    ),
    ...docPanels(
      libName,
      `The '${branch}' arm of a parent's **Route by Work Type** switch, for ${lower}. Shipped as a working passthrough so the branch completes end to end; the branch-specific rules are yours to add.`,
      `**In:** the ${lower} the switch routed to '${branch}'. No fields required.\n\n**Out:** the same items with \`route\`, \`handledBy\` and \`status\` added, appended by the parent's Merge Routed Work node. Callers read only the error rail, so any additional field you add here flows on untouched.`,
      "**None.** This lib calls nothing external, so it runs as imported.",
      `**The branch does nothing useful yet.** By design - the parents establish that '${branch}' is routed separately, but none of them documents what should happen to it. Put that logic in the Apply '${branch}' Handling node.\n\n**Items appear twice after the merge.** The parent's Merge Routed Work is in append mode across all arms; check the switch is not sending the same item down two arms.`,
      360,
    ),
  );

  return { workflow: wf(libName, nodes, connections, { note: `'${branch}' branch for ${lower}` }), credentials: [] };
}

// ---------------------------------------------------------------------- drive
const evidence = JSON.parse(fs.readFileSync(path.join(DATA, "lib-specs.json"), "utf8")).items;

const built = [];
for (const spec of evidence) {
  let out;
  if (spec.family === "A-specialist") {
    out = buildSpecialist(spec.name, spec.name.replace(/^lib:\s*/, "").replace(/\s+Specialist$/, ""));
  } else if (spec.family === "B-postprocess") {
    out = buildPostProcess(spec.name, spec.name.replace(/^lib:\s*Post-Process\s*/, ""));
  } else {
    const rest = spec.name.replace(/^lib:\s*Process\s*/, "");
    const noun = rest.split(/\s+/).slice(-1)[0];
    out = buildBranch(spec.name, spec.branch, noun);
  }
  const file = `lib/${spec.name.replace(/^lib:\s*/, "lib-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}.json`;
  const { __note, ...workflow } = out.workflow;
  built.push({
    name: spec.name,
    file,
    family: spec.family,
    callers: spec.callers,
    credentials: out.credentials,
    note: __note,
    json: workflow,
  });
}

// ------------------------------------------------------------- write / verify
const manifest =
  JSON.stringify(
    {
      generatedBy: "scripts/build-libs.mjs",
      count: built.length,
      items: built.map(({ name, file, family, callers, credentials }) => ({
        name,
        file,
        family,
        callers,
        credentials,
      })),
    },
    null,
    2,
  ) + "\n";

if (check) {
  let stale = 0;
  for (const b of built) {
    const p = path.join(ROOT, "product-files", b.file);
    if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== JSON.stringify(b.json)) stale++;
  }
  const manifestStale = !fs.existsSync(MANIFEST) || fs.readFileSync(MANIFEST, "utf8") !== manifest;
  if (stale || manifestStale) {
    console.error(
      `lib files stale (${stale} workflow${stale === 1 ? "" : "s"}${manifestStale ? " + manifest" : ""}) — run: node scripts/build-libs.mjs`,
    );
    process.exit(1);
  }
  console.log(`lib workflows up to date — ${built.length} libs.`);
} else {
  fs.mkdirSync(LIB_DIR, { recursive: true });
  for (const b of built) {
    // Compact on disk, same as every other product file: the download path
    // re-indents on the way out.
    fs.writeFileSync(path.join(ROOT, "product-files", b.file), JSON.stringify(b.json));
  }
  fs.writeFileSync(MANIFEST, manifest);
  const withCreds = built.filter((b) => b.credentials.length).length;
  console.log(
    `wrote ${built.length} libs to product-files/lib/ — ${withCreds} need a credential, ${built.length - withCreds} run as imported.`,
  );
}
