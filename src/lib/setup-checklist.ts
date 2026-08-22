/**
 * What a buyer has to do before a template will actually run, derived from the
 * template's own JSON.
 *
 * This exists because the corpus has a specific, systematic dishonesty in it.
 * Every resource locator the generator emitted with `mode: "list"` carries an
 * empty `value` and a `cachedResultName` placeholder, so the n8n editor renders
 * a dropdown showing a plausible name - "Email Automation Base", "Request
 * Tracker" - while nothing is bound. The node does not look unconfigured. It
 * looks configured and is not, which is the worst version of this problem:
 * the UI misleads the buyer rather than prompting them. 9,264 of 10,489
 * templates have at least one.
 *
 * There are other traps of the same shape - endpoints pointing at example.com,
 * a Twilio sender in the reserved fictional range, node names that promise an
 * upsert while the parameter says create. At a median price of Rs 2,499 and a
 * top band of Rs 6,999, shipping those undisclosed is a refund and a
 * consumer-protection problem, not a support ticket.
 *
 * So this is a rule over the file, in the same spirit as the price model and
 * the free tier: no hand-written per-template data, nothing that can drift out
 * of sync with what is actually in the JSON. One generator feeds both the
 * pre-purchase section on the product page and the SETUP.md in the download,
 * so the two cannot disagree.
 *
 * Pre-purchase disclosure note: this reads `parameters`, which previewWorkflow
 * deliberately does not. What it emits is confined to node names (already
 * public via the graph), parameter paths, placeholder labels and credential
 * names - never expressions, SQL, prompts or code. That is the minimum needed
 * to tell someone what they are buying into, and no more.
 */
import { SERVICE_NODES, friendlyNodeType } from "./node-facts";
// Relative, not the "@/" alias: this module is compiled and run outside Next by
// the data-checking scripts, and the emitted CommonJS keeps an alias verbatim.
import libsData from "../data/libs.json";

/** The `lib:` sub-workflows now shipped alongside the templates that call them. */
const SHIPPED_LIBS: ReadonlyMap<string, string> = new Map(
  (libsData as { items: Array<{ name: string; file: string }> }).items.map((l) => [l.name, l.file]),
);

/** The product-file path a shipped lib is packaged at, for the checklist text. */
export function libFileFor(placeholder: string): string {
  return SHIPPED_LIBS.get(placeholder.trim()) ?? "";
}

/** True when a referenced sub-workflow is one we now include in the download. */
export function isShippedLib(placeholder: string): boolean {
  return SHIPPED_LIBS.has(placeholder.trim());
}

/** Every `lib:` sub-workflow this workflow calls, as product-file paths. */
export function requiredLibFiles(wf: WorkflowJsonLike): string[] {
  const out = new Set<string>();
  for (const n of wf.nodes ?? []) {
    if (!n.type || n.type === STICKY || !SUBWORKFLOW_TYPES.test(n.type)) continue;
    const rows: Unbound[] = [];
    collectUnbound(n.parameters, "", n.name ?? "", n.type, rows);
    for (const r of rows) {
      const file = SHIPPED_LIBS.get(r.placeholder.trim());
      if (file) out.add(file);
    }
  }
  return [...out].sort();
}

export type SetupStepKind = "credential" | "binding" | "behaviour";

export type SetupStep = {
  kind: SetupStepKind;
  /** Imperative, one line, specific enough to act on. */
  title: string;
  /** Why it matters, and what the buyer will see on screen. */
  detail: string;
  /** Nodes in the workflow this applies to, by their canvas names. */
  nodes: string[];
  /** Parameter path, where the step is about one. */
  param?: string;
};

export type SetupChecklist = {
  /** Credentials to create first - nothing else can be done without them. */
  credentials: SetupStep[];
  /** Values the file leaves unbound; the node fails or no-ops until picked. */
  bindings: SetupStep[];
  /** Things that will run but not do what the buyer expects. */
  behaviour: SetupStep[];
  stepCount: number;
  /**
   * Nothing to bind, and no trap beyond the pinned sample data every template
   * ships with. Kept as a flag rather than inferred at each call site so the
   * page and the SETUP.md make the same judgement.
   */
  bindingFree: boolean;
  /**
   * Sub-workflows this template calls that the catalog does not contain. These
   * are the one thing on the list a buyer cannot finish on their own with the
   * download in hand, so callers surface them separately and up front.
   */
  missingSubWorkflows: string[];
  /**
   * Nodes whose parameters belong to a different node type. These are template
   * defects rather than setup, and a page that has any should say so plainly.
   */
  malformedNodes: string[];
};

/** The subset of the workflow JSON this rule reads. */
export type WorkflowJsonLike = {
  nodes?: Array<{
    name?: string;
    type?: string;
    parameters?: unknown;
  }>;
  /** Needed to tell a switch's delegating arm from its acting arm. */
  connections?: Record<string, Record<string, Array<Array<{ node?: string }> | null> | undefined>>;
  pinData?: Record<string, unknown>;
};

const STICKY = "n8n-nodes-base.stickyNote";

/** Referenced in two places (emit + the bindingFree test), so it is named once. */
const PINNED_DATA_TITLE = "Clear the pinned sample data before going live";

/** Service label for a node type, preferring the catalog's own platform names. */
function serviceLabel(type: string): string {
  return SERVICE_NODES[type] ?? friendlyNodeType(type);
}

/** Last segment of a dotted parameter path, for prose that reads naturally. */
function leafOf(param: string): string {
  return param.split(".").pop() ?? param;
}

/** Groups steps that differ only by which node they sit on. */
function groupBy<T>(rows: T[], key: (r: T) => string) {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const cur = out.get(k);
    if (cur) cur.push(r);
    else out.set(k, [r]);
  }
  return out;
}

// ---------------------------------------------------------------- credentials

/**
 * Credentials come from the `🔑` markers on the node cards, not from a lookup
 * table keyed on node type.
 *
 * That is deliberate. Every workflow file in the catalog has its `credentials`
 * block stripped before packaging, so the JSON itself cannot say what a node
 * needs. The sticky note authored beside each node can, it names the
 * credential the way the person who built the template named it, and it
 * travels with the file. A type-keyed table would be a second source of truth
 * that silently rots when a node changes.
 */
function credentialSteps(wf: WorkflowJsonLike): SetupStep[] {
  const byCredential = new Map<string, Set<string>>();

  for (const n of wf.nodes ?? []) {
    if (n.type !== STICKY) continue;
    const content = (n.parameters as { content?: string } | undefined)?.content ?? "";
    // The card's heading is the node it documents; the marker is on the same card.
    const heading = content.match(/^###\s+(.+)$/m)?.[1]?.trim();
    for (const m of content.matchAll(/🔑\s*([^\n·]+)/g)) {
      const name = m[1].trim();
      // Overview panels reuse the glyph inside a sentence; a credential name is
      // short. Anything long is prose that happens to contain the character.
      if (!name || name.length > 60) continue;
      const set = byCredential.get(name) ?? new Set<string>();
      if (heading) set.add(heading);
      byCredential.set(name, set);
    }
  }

  return [...byCredential.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .map(([name, nodes]) => ({
      kind: "credential" as const,
      // "Set up X" rather than "Create the X credential": the marker vocabulary
      // already ends in a credential noun about half the time ("WordPress
      // credentials", "Twilio SID + token", "Postgres connection"), and the
      // longer phrasing produced "Create the WordPress credentials credential".
      title: `Set up ${name}`,
      detail:
        nodes.size > 0
          ? `Needed by ${nodes.size === 1 ? "the node" : `${nodes.size} nodes`}: ${[...nodes].sort().join(", ")}. The file ships with no credentials attached, so the selector on each of these is empty on import.`
          : "The file ships with no credentials attached, so the selector is empty on import.",
      nodes: [...nodes].sort(),
    }));
}

// ------------------------------------------------------------------- bindings

type Unbound = { node: string; type: string; param: string; placeholder: string };

/** Walks a node's parameters for resource locators left with an empty value. */
function collectUnbound(value: unknown, param: string, node: string, type: string, out: Unbound[]) {
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (obj.__rl === true) {
    const v = obj.value;
    if (v === "" || v === null || v === undefined) {
      out.push({
        node,
        type,
        param,
        placeholder: typeof obj.cachedResultName === "string" ? obj.cachedResultName : "",
      });
    }
    return; // a locator's internals are not themselves parameters
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") collectUnbound(v, param ? `${param}.${k}` : k, node, type, out);
  }
}

/**
 * A sub-workflow reference is a binding you cannot satisfy by picking.
 *
 * 1,710 templates call a sub-workflow through `executeWorkflow` or
 * `toolWorkflow`, and every reference in the catalog is a `lib:`-prefixed
 * placeholder - "lib: Research Specialist", "lib: Post-Process Orders". None
 * of the 45 distinct names corresponds to any template in the catalog, so the
 * dependency is not something the buyer forgot to buy; it was never written.
 * Presenting that as "pick it from the dropdown" would be false, because the
 * dropdown is empty and stays empty.
 */
const SUBWORKFLOW_TYPES = /(?:^|\.)(?:executeWorkflow|toolWorkflow)$/;
const LIB_PLACEHOLDER = /^lib:\s*/i;

/**
 * The resource-locator parameters each node type actually has.
 *
 * This exists to catch a defect worse than an unbound value: nodes whose
 * parameters belong to a different node type entirely. 52 nodes typed
 * `n8n-nodes-base.mySql` carry `documentId`, `sheetName` and
 * `operation: "appendOrUpdate"` - the complete Google Sheets parameter set -
 * and no MySQL parameters at all. Around 666 locators across the catalog are
 * like this.
 *
 * Without the check, the checklist would tell someone to "pick the real
 * documentId from the list" on a MySQL node, where no such dropdown exists.
 * Wrong instructions are worse than the silent failure they were meant to
 * prevent, so a locator that is foreign to its node gets told the truth
 * instead: the node is malformed and will not work as shipped.
 *
 * Types absent from this map are not judged either way - they fall through to
 * the ordinary "select this" wording, which claims nothing about validity.
 */
const CANONICAL_LOCATORS: Record<string, ReadonlySet<string>> = {
  "n8n-nodes-base.googleSheets": new Set(["documentId", "sheetName"]),
  "n8n-nodes-base.notion": new Set(["databaseId", "pageId", "blockId"]),
  "n8n-nodes-base.airtable": new Set(["base", "table"]),
  "n8n-nodes-base.airtableTrigger": new Set(["base", "table"]),
  "n8n-nodes-base.googleDrive": new Set(["driveId", "folderId", "fileId"]),
  "n8n-nodes-base.googleCalendar": new Set(["calendar"]),
  "n8n-nodes-base.mySql": new Set(["table"]),
  "n8n-nodes-base.postgres": new Set(["table", "schema"]),
  "n8n-nodes-base.slack": new Set(["channelId", "user"]),
  "n8n-nodes-base.discord": new Set(["channelId", "guildId"]),
  "n8n-nodes-base.telegram": new Set(["chatId"]),
  "n8n-nodes-base.hubspot": new Set([]),
};

/** True when this locator cannot exist on this node type. */
function isForeignLocator(type: string, param: string): boolean {
  const canon = CANONICAL_LOCATORS[type];
  if (!canon) return false;
  return !canon.has(leafOf(param));
}

function isLibReference(r: Unbound): boolean {
  return SUBWORKFLOW_TYPES.test(r.type) && LIB_PLACEHOLDER.test(r.placeholder);
}

/**
 * A lib reference we do NOT ship. Every one of the 45 names in the catalog is
 * shipped now, so this is empty in practice - it stays because the predicate,
 * not the current inventory, is what decides whether a buyer is being told to
 * build something. A new template referencing a lib nobody wrote would light
 * this up again rather than quietly promising a file that is not in the ZIP.
 */
function isMissingSubWorkflow(r: Unbound): boolean {
  return isLibReference(r) && !isShippedLib(r.placeholder);
}

/** A lib reference that ships with the download and only needs selecting. */
function isShippedSubWorkflow(r: Unbound): boolean {
  return isLibReference(r) && isShippedLib(r.placeholder);
}

function bindingSteps(wf: WorkflowJsonLike): {
  steps: SetupStep[];
  missingSubWorkflows: string[];
  malformedNodes: string[];
} {
  const rows: Unbound[] = [];
  for (const n of wf.nodes ?? []) {
    if (!n.type || n.type === STICKY) continue;
    collectUnbound(n.parameters, "", n.name ?? "(unnamed)", n.type, rows);
  }

  const missing = rows.filter(isMissingSubWorkflow);
  const shippedLibs = rows.filter(isShippedSubWorkflow);
  const foreign = rows.filter(
    (r) => !isLibReference(r) && isForeignLocator(r.type, r.param),
  );
  const ordinary = rows.filter(
    (r) => !isLibReference(r) && !isForeignLocator(r.type, r.param),
  );

  const steps: SetupStep[] = [];

  // A node carrying another node type's parameters cannot be configured, only
  // rebuilt. Say that rather than pointing at a dropdown that is not there.
  if (foreign.length > 0) {
    const byNode = groupBy(foreign, (r) => r.node);
    for (const [node, group] of byNode) {
      const type = group[0].type;
      const params = [...new Set(group.map((g) => leafOf(g.param)))].sort();
      steps.push({
        kind: "binding",
        title: `Rebuild the ${serviceLabel(type)} node "${node}"`,
        detail: `This node is typed as ${serviceLabel(type)} but carries ${params.map((p) => `"${p}"`).join(", ")}, which ${params.length === 1 ? "is not a parameter" : "are not parameters"} that node has - ${params.length === 1 ? "it belongs" : "they belong"} to a different n8n node. The node will import, show none of these fields, and do nothing useful. Replace it with the node the parameters imply, or with a ${serviceLabel(type)} node configured from scratch. This is a defect in the template; tell us and we will fix or refund it.`,
        nodes: [node],
        param: group[0].param,
      });
    }
  }

  // Missing dependencies lead, because no amount of work on the rest of the
  // list makes the workflow run without them.
  if (missing.length > 0) {
    const byName = groupBy(missing, (r) => r.placeholder);
    for (const [placeholder, group] of byName) {
      const nodes = [...new Set(group.map((g) => g.node))].sort();
      steps.push({
        kind: "binding",
        title: `Build the sub-workflow "${placeholder}" yourself`,
        detail: `${nodes.length === 1 ? nodes[0] : nodes.join(", ")} calls a separate n8n workflow under this name, and it is not part of this download - no template in the catalog provides it. The dropdown will be empty until you create a workflow to fill the role and select it. Read the node's sticky note for what it is expected to take in and return.`,
        nodes,
        param: group[0].param,
      });
    }
  }

  // Shipped libs: the file is in the download, so this is a selection, not a
  // build. Named precisely - which file to import, and which selector on which
  // node to then point at it - because a workflow id is local to the buyer's
  // instance and no amount of packaging can pre-bind it for them.
  if (shippedLibs.length > 0) {
    const byName = groupBy(shippedLibs, (r) => r.placeholder);
    for (const [placeholder, group] of byName) {
      const nodes = [...new Set(group.map((g) => g.node))].sort();
      const file = libFileFor(placeholder);
      steps.push({
        kind: "binding",
        title: `Import "${placeholder}" and select it on ${nodes.length === 1 ? nodes[0] : `${nodes.length} nodes`}`,
        detail: `This template calls a separate workflow named ${placeholder}, and it is included in your download as ${file}. Import that file into n8n first (Workflows -> Import from File), then open ${nodes.length === 1 ? nodes[0] : nodes.join(", ")} and pick it in the ${leafOf(group[0].param)} selector. The selector is empty until you do: a workflow id only exists inside your own instance, so it cannot be set for you.`,
        nodes,
        param: group[0].param,
      });
    }
  }

  // One step per distinct thing to pick, listing the nodes that share it -
  // a workflow with six Google Sheets nodes on one spreadsheet is one decision,
  // not six, and six identical lines would bury the ones that differ.
  const grouped = groupBy(ordinary, (r) => `${r.type}|${r.param}|${r.placeholder}`);

  for (const group of grouped.values()) {
    const first = group[0];
    const service = serviceLabel(first.type);
    const leaf = leafOf(first.param);
    const nodes = [...new Set(group.map((g) => g.node))].sort();
    const shown = first.placeholder
      ? `The dropdown shows "${first.placeholder}", which is a placeholder label with no value behind it - the node looks configured and is not.`
      : "The dropdown is empty.";
    steps.push({
      kind: "binding",
      title: `Select the ${service} ${leaf}`,
      detail: `${shown} Open ${nodes.length === 1 ? nodes[0] : `each of: ${nodes.join(", ")}`} and pick the real ${leaf} from the list.`,
      nodes,
      param: first.param,
    });
  }

  return {
    steps,
    missingSubWorkflows: [...new Set(missing.map((r) => r.placeholder))].sort(),
    malformedNodes: [...new Set(foreign.map((r) => r.node))].sort(),
  };
}

// ------------------------------------------------------------------ behaviour

/** A string parameter and where it was found, for the trap detectors. */
type Scalar = { node: string; type: string; param: string; value: string };

function collectScalars(value: unknown, param: string, node: string, type: string, out: Scalar[]) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const v of value) collectScalars(v, param, node, type, out);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectScalars(v, param ? `${param}.${k}` : k, node, type, out);
    }
    return;
  }
  out.push({ node, type, param, value: String(value) });
}

/** Node names promising an idempotent write, against operations that are not. */
const IDEMPOTENT_NAME = /\b(upsert|sync|update)\b/i;
const CREATE_OPS = new Set(["create", "insert", "append", "post", "send"]);

// ------------------------------------------------- switch-arm asymmetry

/**
 * What an integration node visibly does, for naming a switch arm's action.
 *
 * Keyed on node type because that is what the file states. The phrasing is the
 * action performed, not the service's name - "posts a Slack message" rather
 * than "Slack" - because the point of the step is to contrast one arm doing
 * something with another arm doing nothing.
 */
const ARM_ACTIONS: Record<string, string> = {
  "n8n-nodes-base.slack": "posts a Slack message",
  "n8n-nodes-base.discord": "posts a Discord message",
  "n8n-nodes-base.telegram": "sends a Telegram message",
  "n8n-nodes-base.twilio": "sends an SMS through Twilio",
  "n8n-nodes-base.gmail": "sends a Gmail message",
  "n8n-nodes-base.microsoftOutlook": "sends an Outlook email",
  "n8n-nodes-base.microsoftTeams": "posts a Microsoft Teams message",
  "n8n-nodes-base.whatsApp": "sends a WhatsApp message",
};

/** The destination a messaging node is pointed at, when the file states one. */
function armTarget(parameters: unknown): string | null {
  const found: string[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (o.__rl === true) {
      // A literal destination only; an expression is not something to quote.
      if (typeof o.value === "string" && o.value !== "" && !o.value.startsWith("=")) {
        found.push(o.value);
      }
      return;
    }
    for (const x of Object.values(o)) if (x && typeof x === "object") walk(x);
  };
  walk(parameters);
  return found[0] ?? null;
}

/** Sentence-initial capital for a phrase that may start with "the". */
function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `Delegate 'standard' to Sub-workflow` -> standard */
function armLabel(nodeName: string): string | null {
  return nodeName.match(/'([^']+)'/)?.[1] ?? null;
}

/**
 * A switch whose arms are not equivalent: one hands off to an included
 * sub-workflow that only normalises and tags, while a sibling arm fires a real
 * integration node.
 *
 * Nothing in the page copy is false - the pages say the workflow "routes each
 * kind of record down its own branch", and it does. It is an expectation gap: a
 * buyer who sees the 'vip' arm post to Slack will assume the 'standard' arm
 * does something comparable, and it does not until they write it. Saying so
 * costs one line, and it is read off this template's own graph, so it appears
 * only where the asymmetry is real.
 */
function switchAsymmetrySteps(wf: WorkflowJsonLike): SetupStep[] {
  const nodes = (wf.nodes ?? []).filter((n) => n.type && n.type !== STICKY);
  const byName = new Map(nodes.map((n) => [n.name ?? "", n]));
  const steps: SetupStep[] = [];

  for (const sw of nodes) {
    if (sw.type !== "n8n-nodes-base.switch") continue;
    const arms = wf.connections?.[sw.name ?? ""]?.main ?? [];

    const delegating: Array<{ node: string; label: string | null; lib: string }> = [];
    const acting: Array<{
      node: string;
      label: string | null;
      action: string;
      target: string | null;
    }> = [];

    for (const arm of arms) {
      for (const conn of arm ?? []) {
        const target = byName.get(conn?.node ?? "");
        if (!target?.type) continue;

        if (SUBWORKFLOW_TYPES.test(target.type)) {
          const rows: Unbound[] = [];
          collectUnbound(target.parameters, "", target.name ?? "", target.type, rows);
          const lib = rows.find((r) => LIB_PLACEHOLDER.test(r.placeholder))?.placeholder;
          if (lib) {
            delegating.push({ node: target.name ?? "", label: armLabel(target.name ?? ""), lib });
          }
          continue;
        }
        const action = ARM_ACTIONS[target.type];
        if (action) {
          acting.push({
            node: target.name ?? "",
            label: armLabel(target.name ?? ""),
            action,
            target: armTarget(target.parameters),
          });
        }
      }
    }

    if (delegating.length === 0 || acting.length === 0) continue;

    const d = delegating[0];
    const a = acting[0];
    const dArm = d.label ? `the '${d.label}' arm` : "one arm";
    const aArm = a.label ? `the '${a.label}' arm` : "another arm";
    const where = a.target ? ` to ${a.target}` : "";
    steps.push({
      kind: "behaviour",
      title: `The routed arms are not equivalent - ${dArm} takes no action of its own`,
      detail: `${sw.name} splits the run. ${cap(aArm)} ends at ${a.node}, which ${a.action}${where}. ${cap(dArm)} goes to ${d.node}, which calls the included sub-workflow ${d.lib} - that sub-workflow normalises the item and tags it with the route, but performs no action of its own, so the branch completes and nothing is sent, filed or updated for it. Add the handling you want inside ${d.lib} before relying on that arm.`,
      nodes: [sw.name ?? "", d.node, a.node].filter(Boolean).sort(),
    });
  }
  return steps;
}

const EXAMPLE_HOST = /https?:\/\/[a-z0-9.-]*\bexample\.com\b/i;
/** `{{ $json.phone || 'ONCALL_NUMBER' }}` - resolves to the literal, not a value. */
const PLACEHOLDER_FALLBACK = /\|\|\s*'(YOUR_[A-Z0-9_]+|ONCALL_NUMBER|[A-Z][A-Z0-9_]{4,})'/;
const ENV_REF = /\$env\.([A-Z0-9_]+)/;

function behaviourSteps(wf: WorkflowJsonLike): SetupStep[] {
  const steps: SetupStep[] = [];
  const nodes = (wf.nodes ?? []).filter((n) => n.type && n.type !== STICKY);

  const scalars: Scalar[] = [];
  for (const n of nodes) {
    collectScalars(n.parameters, "", n.name ?? "(unnamed)", n.type!, scalars);
  }

  const push = (
    title: string,
    detail: string,
    rows: Array<{ node: string }>,
    param?: string,
  ) => {
    if (rows.length === 0) return;
    steps.push({
      kind: "behaviour",
      title,
      detail,
      nodes: [...new Set(rows.map((r) => r.node))].sort(),
      param,
    });
  };

  // WordPress posts are created as drafts. Nothing in the corpus publishes.
  const drafts = scalars.filter(
    (s) =>
      s.type === "n8n-nodes-base.wordpress" &&
      s.param === "additionalFields.status" &&
      s.value === "draft",
  );
  push(
    "Decide whether posts should publish",
    'This template creates WordPress posts with additionalFields.status set to "draft", so nothing appears on the site until someone publishes it by hand. That is the safe default for generated content - change it to publish or pending only once you are happy with the output.',
    drafts,
    "additionalFields.status",
  );

  // Twilio's reserved fictional range: the API rejects it outright.
  const twilio = scalars.filter(
    (s) => s.type === "n8n-nodes-base.twilio" && s.param === "from" && s.value === "+15550100000",
  );
  push(
    "Replace the Twilio sender number",
    "The from number is +15550100000, which is in the reserved fictional 555-01xx range and is not a number anyone can send from. Twilio rejects it. Put a number on your own account here, or a Messaging Service SID.",
    twilio,
    "from",
  );

  // Expressions whose fallback branch is a literal placeholder string.
  const fallbacks = scalars.filter((s) => PLACEHOLDER_FALLBACK.test(s.value));
  const fallbackNames = [
    ...new Set(fallbacks.map((s) => s.value.match(PLACEHOLDER_FALLBACK)![1])),
  ].sort();
  push(
    "Set a real fallback for the placeholder expressions",
    `${fallbackNames.map((n) => `"${n}"`).join(", ")} appears as the fallback branch of an expression. When the upstream field is missing the expression does not fail - it resolves to that literal string and the call is made with it, which reads downstream as a malformed value rather than as missing data.`,
    fallbacks,
  );

  // Endpoints that do not exist. 63.8% of the catalog has at least one.
  const examples = scalars.filter((s) => EXAMPLE_HOST.test(s.value));
  const hosts = [
    ...new Set(examples.map((s) => s.value.match(EXAMPLE_HOST)![0].replace(/^https?:\/\//, ""))),
  ].sort();
  push(
    "Point the HTTP calls at your own endpoint",
    `${hosts.length === 1 ? "The URL" : "The URLs"} ${hosts.map((h) => `"${h}"`).join(", ")} ${hosts.length === 1 ? "is" : "are"} illustrative - example.com is reserved for documentation and resolves to nothing useful. Replace ${hosts.length === 1 ? "it" : "them"} with the service you are actually calling, and set that service's authentication on the node.`,
    examples,
  );

  // $env is unset by default and unavailable on n8n Cloud.
  const envs = scalars.filter((s) => ENV_REF.test(s.value));
  const envNames = [...new Set(envs.map((s) => s.value.match(ENV_REF)![1]))].sort();
  push(
    "Set the environment variables, or inline the values",
    `This template reads ${envNames.map((n) => `$env.${n}`).join(", ")}. Environment variables are not exposed to expressions on n8n Cloud at all, and on self-hosted they are unset until you add them - in both cases the expression falls through to its literal fallback rather than erroring, so the call is made against a placeholder.`,
    envs,
  );

  // Node names that promise idempotency the operation does not deliver.
  const mismatched = nodes
    .filter((n) => {
      const op = (n.parameters as { operation?: unknown } | undefined)?.operation;
      return (
        typeof op === "string" &&
        IDEMPOTENT_NAME.test(n.name ?? "") &&
        CREATE_OPS.has(op.toLowerCase())
      );
    })
    .map((n) => ({
      node: n.name ?? "(unnamed)",
      op: String((n.parameters as { operation?: unknown }).operation),
    }));
  if (mismatched.length > 0) {
    const ops = [...new Set(mismatched.map((m) => m.op))].sort();
    steps.push({
      kind: "behaviour",
      title: "Re-running will duplicate rows, despite the node name",
      detail: `${mismatched.map((m) => `"${m.node}"`).join(", ")} ${mismatched.length === 1 ? "is named" : "are named"} as an update or upsert but ${mismatched.length === 1 ? "runs" : "run"} operation ${ops.join(", ")}, which always writes a new record. A redelivered webhook, a manual retry or an overlapping scheduled run therefore creates a second copy. Add a unique key on the destination, or switch the operation, before you rely on it.`,
      nodes: [...new Set(mismatched.map((m) => m.node))].sort(),
      param: "operation",
    });
  }

  // The Google Calendar locator now ships bound to `primary`, which is the
  // authenticated account's own calendar - not the shared one several of these
  // nodes were named for. It runs on import, which is the point, but where the
  // events land is a real decision the buyer should make knowingly.
  const calendars = scalars.filter(
    (s) => s.type === "n8n-nodes-base.googleCalendar" && s.param === "calendar.value" && s.value === "primary",
  );
  push(
    "Calendar events go to your own primary calendar",
    'The Google Calendar nodes are set to "primary", which Google resolves to the default calendar of whichever account you connect. That is why this template runs as imported rather than failing on an unset dropdown. If these events belong on a shared or team calendar, change the Calendar field on the nodes below from "primary" to that calendar.',
    calendars,
    "calendar",
  );

  // A switch that routes one arm to a real integration and another to an
  // included sub-workflow that only normalises - read off this graph, so it
  // appears only where that asymmetry actually exists.
  steps.push(...switchAsymmetrySteps(wf));

  // Every template ships pinned sample data on its trigger. It is what lets
  // the workflow run before anything is wired up, and it is also why a first
  // manual run produces convincing output from data that never left the file.
  const pinned = Object.keys(wf.pinData ?? {});
  if (pinned.length > 0) {
    steps.push({
      kind: "behaviour",
      title: PINNED_DATA_TITLE,
      detail: `${pinned.map((p) => `"${p}"`).join(", ")} ${pinned.length === 1 ? "carries" : "carry"} pinned sample data, which is what lets the workflow run end to end before you have wired anything up. While it is pinned, a manual execution reads the sample and never calls the real service - so the run succeeds and proves nothing about your setup. Unpin it once the credentials and bindings are in place.`,
      nodes: pinned.sort(),
    });
  }

  return steps;
}

// ----------------------------------------------------------------- the rule

export function buildSetupChecklist(wf: WorkflowJsonLike): SetupChecklist {
  const credentials = credentialSteps(wf);
  const { steps: bindings, missingSubWorkflows, malformedNodes } = bindingSteps(wf);
  const behaviour = behaviourSteps(wf);
  // Pinned data is on every template in the catalog, so it says nothing about
  // this one. "Binding free" means there is nothing template-specific to fix.
  const specificTraps = behaviour.filter(
    (s) => s.title !== PINNED_DATA_TITLE,
  ).length;
  return {
    credentials,
    bindings,
    behaviour,
    stepCount: credentials.length + bindings.length + behaviour.length,
    bindingFree: bindings.length === 0 && specificTraps === 0,
    missingSubWorkflows,
    malformedNodes,
  };
}

/**
 * The download copy. Same generator as the product page - if these ever
 * disagree, one of them is lying to someone who has already paid.
 */
export function setupMarkdown(title: string, checklist: SetupChecklist): string {
  const out: string[] = [];
  out.push(`# Setup: ${title}`, "");
  out.push(
    "This file is generated from the workflow JSON beside it, listing what has to",
    "be set before the template will do what it says. Work top to bottom.",
    "",
  );

  if (checklist.malformedNodes.length > 0) {
    out.push(
      "> **Defect: " +
        checklist.malformedNodes.map((n) => `\`${n}\``).join(", ") +
        (checklist.malformedNodes.length === 1
          ? " carries parameters from a different node type"
          : " carry parameters from different node types") +
        "** and will not work as shipped. See the bindings section. Contact",
      "> support@workflowcrate.com for a fix or a refund.",
      "",
    );
  }
  if (checklist.missingSubWorkflows.length > 0) {
    out.push(
      "> **This template calls sub-workflows that are not included.**",
      "> " +
        checklist.missingSubWorkflows.map((n) => `\`${n}\``).join(", ") +
        (checklist.missingSubWorkflows.length === 1 ? " is" : " are") +
        " referenced by name and no template in the catalog provides",
      "> " +
        (checklist.missingSubWorkflows.length === 1 ? "it" : "them") +
        ". You will have to build and wire " +
        (checklist.missingSubWorkflows.length === 1 ? "it" : "them") +
        " before this workflow runs end to end.",
      "",
    );
  } else if (checklist.bindingFree) {
    out.push(
      "**Nothing in this template is left unbound.** Add the credentials below and it",
      "runs as shipped.",
      "",
    );
  }

  // Sections are numbered by what is actually present, so a template with
  // nothing to bind reads "1. Credentials / 2. Behaviour" rather than skipping
  // to 3 and implying a section was withheld.
  let n = 0;
  const section = (heading: string, blurb: string, steps: SetupStep[]) => {
    if (steps.length === 0) return;
    out.push(`## ${++n}. ${heading}`, "", blurb, "");
    steps.forEach((s, i) => {
      out.push(`${i + 1}. **${s.title}**`);
      out.push(`   ${s.detail}`);
      if (s.param) out.push(`   Parameter: \`${s.param}\``);
      out.push("");
    });
  };

  section(
    "Credentials",
    "Every workflow file here ships with its credentials block removed, so each node below has an empty credential selector on import. Create these in n8n first and select them on the nodes named.",
    checklist.credentials,
  );
  section(
    "Bindings",
    "These parameters have no value stored. Where a dropdown shows a name, that name is a placeholder label with nothing behind it - the node will look configured and will fail or return nothing until you pick the real item.",
    checklist.bindings,
  );
  section(
    "Behaviour to check",
    "These will run without erroring but will not do what you probably want until you change them.",
    checklist.behaviour,
  );

  out.push("---", "");
  out.push(
    "Something not matching the file? support@workflowcrate.com - this checklist is",
    "generated, so a wrong entry is a bug worth reporting.",
    "",
  );
  return out.join("\n");
}
