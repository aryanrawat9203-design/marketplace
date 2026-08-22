import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getByRoute } from "./catalog";
import { isWithdrawnId } from "./withdrawn";
import { getBundle, bundleMembersDetail, bandFor, type Bundle } from "./bundles";
import { createZip, type ZipEntry } from "./zip";
import { starterPackItems, STARTER_PACK_FILENAME } from "./starter-pack";
import type { DetailItem } from "./catalog";
import { capsFromTypes, friendlyNodeType, type Caps } from "./node-facts";
import {
  buildSetupChecklist,
  setupMarkdown,
  type SetupChecklist,
  type WorkflowJsonLike,
} from "./setup-checklist";

export type Kind = "workflow" | "bundle";

export type Purchasable = {
  kind: Kind;
  key: string; // workflow route, or bundle slug
  name: string;
  price: number;
  currency: string;
  free: boolean;
};

const PRODUCT_ROOT = path.join(process.cwd(), "product-files");

// Workflow JSON is stored compact so the corpus stays deployable (the whole
// product-files tree is traced into the download function). Buyers are meant
// to read and learn from these files, so they get an indented copy instead:
// formatting on the way out costs a parse per download and nothing at rest.
function readWorkflowFile(fp: string): Buffer {
  const raw = fs.readFileSync(fp);
  try {
    return Buffer.from(JSON.stringify(JSON.parse(raw.toString("utf-8")), null, 2), "utf-8");
  } catch {
    return raw; // never block a download over formatting
  }
}

// Product files keep their original on-disk names, some of which still name a
// tool the workflow no longer claims - titles were rebuilt from the real node
// graphs, the 10k filenames were not. Downloads are user-facing, so name them
// from the truthful title instead of the stale basename.
function downloadSafeTitle(w: DetailItem): string {
  return w.title.replace(/[\\/:*?"<>|]/g, "-").trim();
}
// Zip entry leaf: keep the numeric id prefix (extraction order + uniqueness)
// but swap in the truthful title.
function truthfulLeaf(w: DetailItem): string {
  const base = path.basename(w.workflowFile);
  const ext = path.extname(base) || ".json";
  const prefix = base.match(/^\d+[_-]/)?.[0] ?? "";
  return `${prefix}${downloadSafeTitle(w)}${ext}`;
}

/**
 * What a key can be charged for, or undefined if it cannot be sold.
 *
 * This is the single gate every purchase path goes through - /api/checkout
 * computes its amount from here, the cart validates against it, and the free
 * download route uses it to decide whether payment is required. Refusing a
 * withdrawn template here therefore closes all of them at once, including a
 * stale client that still has the route in its cart.
 *
 * getByRoute deliberately still resolves withdrawn templates (their pages
 * render, and past orders must still download), so the check is explicit
 * rather than falling out of a missing lookup.
 */
export function getPurchasable(kind: Kind, key: string): Purchasable | undefined {
  if (kind === "workflow") {
    const w = getByRoute(key);
    if (!w) return undefined;
    if (isWithdrawnId(w.id)) return undefined;
    return { kind, key, name: w.title, price: w.price ?? 0, currency: "INR", free: !!w.free };
  }
  const b = getBundle(key);
  if (!b) return undefined;
  return { kind: "bundle", key, name: b.name, price: b.price, currency: "INR", free: false };
}

/**
 * The setup checklist for a template, from the same file the buyer downloads.
 *
 * Cached per route because the product page and the download both want it and
 * the parse is the expensive part. `getByRoute` is already memoised upstream;
 * this memoises the JSON read on top of it.
 */
const checklistCache = new Map<string, SetupChecklist | null>();

export function workflowSetupChecklist(route: string): SetupChecklist | null {
  const hit = checklistCache.get(route);
  if (hit !== undefined) return hit;

  let result: SetupChecklist | null = null;
  const w = getByRoute(route);
  if (w?.workflowFile) {
    const fp = path.join(PRODUCT_ROOT, w.workflowFile);
    if (fs.existsSync(fp)) {
      try {
        result = buildSetupChecklist(JSON.parse(fs.readFileSync(fp, "utf-8")) as WorkflowJsonLike);
      } catch {
        result = null; // a template we cannot parse gets no claim made about it
      }
    }
  }
  checklistCache.set(route, result);
  return result;
}

/** The SETUP.md that ships beside a template, or null if it cannot be built. */
function setupFileFor(w: DetailItem): Buffer | null {
  const checklist = workflowSetupChecklist(w.route);
  if (!checklist) return null;
  return Buffer.from(setupMarkdown(w.title, checklist), "utf-8");
}

/**
 * A single template downloads as a ZIP rather than a bare JSON, because the
 * setup checklist has to travel with it. A buyer who paid for one template is
 * exactly the buyer most likely to import it cold, and the unbound resource
 * locators are invisible until something silently returns nothing.
 */
export function workflowDownload(
  route: string,
): { filename: string; body: Buffer; contentType: string } | null {
  const w = getByRoute(route);
  if (!w?.workflowFile) return null;
  const fp = path.join(PRODUCT_ROOT, w.workflowFile);
  if (!fs.existsSync(fp)) return null;

  const title = downloadSafeTitle(w);
  const entries: ZipEntry[] = [{ name: `${title}.json`, data: readWorkflowFile(fp) }];
  const setup = setupFileFor(w);
  if (setup) entries.push({ name: "SETUP.md", data: setup });

  return {
    filename: `${title}.zip`,
    body: createZip(entries),
    contentType: "application/zip",
  };
}

// Human labels for the tool sub-nodes an AI Agent can call. Anything not listed
// (an app node attached as a tool, a community node) falls back to its type name.
const TOOL_LABELS: Record<string, string> = {
  toolCalculator: "Calculator",
  toolCode: "Custom code",
  toolHttpRequest: "HTTP request",
  toolWorkflow: "Another n8n workflow",
  toolVectorStore: "Vector store retrieval",
  toolSerpApi: "Web search (SerpAPI)",
  toolWikipedia: "Wikipedia",
  toolThink: "Scratchpad reasoning",
  toolMcp: "MCP client",
  toolWolframAlpha: "Wolfram Alpha",
};

function toolLabel(type: string): string {
  const short = type.replace(/^@n8n\/n8n-nodes-langchain\./, "").replace(/^n8n-nodes-base\./, "");
  return TOOL_LABELS[short] ?? friendlyNodeType(type);
}

export type WorkflowPreview = {
  nodeCount: number;
  /** Display names, e.g. "Google Sheets". */
  nodeTypes: string[];
  /**
   * Tools actually wired into an AI Agent through an `ai_tool` connection.
   * Derived from the graph, never from copy - if it is listed here the node
   * exists in the file being sold. Keyed by node, not by type: two sub-workflow
   * tools are two tools, and collapsing them by label undercounts the agent.
   */
  agentTools: Array<{ name: string; label: string }>;
  /** True when a memory sub-node is wired to the agent through `ai_memory`. */
  agentMemory: boolean;
  /** Capability facts from the real graph - the only thing page copy may claim from. */
  caps: Caps;
};

// Reads only node `type`/`retryOnFail` fields from the shipped workflow JSON -
// never `parameters`, so this is safe to show before purchase.
export function previewWorkflow(route: string): WorkflowPreview | null {
  const w = getByRoute(route);
  if (!w?.workflowFile) return null;
  const fp = path.join(PRODUCT_ROOT, w.workflowFile);
  if (!fs.existsSync(fp)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(fp, "utf-8")) as {
      nodes?: Array<{ name?: string; type?: string; retryOnFail?: boolean }>;
      connections?: Record<string, Record<string, unknown>>;
      pinData?: Record<string, unknown>;
    };
    // Sticky notes are canvas annotations, not workflow steps.
    const nodes = (raw.nodes ?? []).filter((n) => n.type !== "n8n-nodes-base.stickyNote");
    const types = new Set<string>();
    const rawTypes = new Set<string>();
    for (const n of nodes) {
      if (!n.type) continue;
      types.add(friendlyNodeType(n.type));
      rawTypes.add(n.type);
    }
    const caps = capsFromTypes([...rawTypes], {
      nodeCount: nodes.length,
      retries: nodes.some((n) => n.retryOnFail === true),
      pinData: Object.keys(raw.pinData ?? {}).length > 0,
    });
    // A sub-node advertises what it is by the connection it makes, not by its
    // type: an app node attached to an agent is a tool too. Read the edges.
    const byName = new Map(nodes.map((n) => [n.name ?? "", n.type ?? ""]));
    const agentTools: Array<{ name: string; label: string }> = [];
    let agentMemory = false;
    for (const [from, out] of Object.entries(raw.connections ?? {})) {
      if (out?.ai_tool) {
        const t = byName.get(from);
        if (t) agentTools.push({ name: from, label: toolLabel(t) });
      }
      if (out?.ai_memory) agentMemory = true;
    }
    agentTools.sort((a, b) => a.name.localeCompare(b.name));
    return {
      nodeCount: nodes.length,
      nodeTypes: [...types].sort(),
      agentTools,
      agentMemory,
      caps,
    };
  } catch {
    return null;
  }
}

export type GraphNode = {
  id: string;
  label: string;
  typeLabel: string;
  kind: "trigger" | "ai" | "logic" | "app";
  x: number;
  y: number;
};
export type GraphEdge = { from: string; to: string; main: boolean };
export type WorkflowGraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
};

function nodeKind(type: string): GraphNode["kind"] {
  const t = type.toLowerCase();
  if (/trigger|webhook|cron|schedule/.test(t)) return "trigger";
  if (t.startsWith("@n8n/n8n-nodes-langchain.") || /openai|gemini|anthropic|mistral|ollama/.test(t)) return "ai";
  if (/\.(if|switch|merge|filter|set|code|function|wait|noop|splitinbatches|aggregate|itemlists)$/.test(t)) return "logic";
  return "app";
}

export const GRAPH_NODE_W = 190;
export const GRAPH_NODE_H = 56;

// Extracts only what's safe to show before purchase: node names, types,
// canvas positions, and which node connects to which. Never `parameters`.
export function workflowGraphData(route: string): WorkflowGraphData | null {
  const w = getByRoute(route);
  if (!w?.workflowFile) return null;
  const fp = path.join(PRODUCT_ROOT, w.workflowFile);
  if (!fs.existsSync(fp)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(fp, "utf-8")) as {
      nodes?: Array<{ name?: string; type?: string; position?: [number, number] }>;
      connections?: Record<string, Record<string, Array<Array<{ node?: string }>>>>;
    };
    const srcNodes = (raw.nodes ?? []).filter(
      (n) =>
        n.name &&
        n.type &&
        n.type !== "n8n-nodes-base.stickyNote" &&
        Array.isArray(n.position) &&
        n.position.length === 2 &&
        Number.isFinite(n.position[0]) &&
        Number.isFinite(n.position[1]),
    );
    if (srcNodes.length < 2) return null;

    const xs = srcNodes.map((n) => n.position![0]);
    const ys = srcNodes.map((n) => n.position![1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const pad = 32;

    const nodes: GraphNode[] = srcNodes.map((n) => ({
      id: n.name!,
      label: n.name!,
      typeLabel: friendlyNodeType(n.type!),
      kind: nodeKind(n.type!),
      x: n.position![0] - minX + pad,
      y: n.position![1] - minY + pad,
    }));
    const byId = new Set(nodes.map((n) => n.id));

    const edges: GraphEdge[] = [];
    for (const [from, outputs] of Object.entries(raw.connections ?? {})) {
      if (!byId.has(from)) continue;
      for (const [connType, groups] of Object.entries(outputs)) {
        for (const group of groups ?? []) {
          for (const c of group ?? []) {
            if (c?.node && byId.has(c.node)) {
              edges.push({ from, to: c.node, main: connType === "main" });
            }
          }
        }
      }
    }

    const width = Math.max(...nodes.map((n) => n.x)) + GRAPH_NODE_W + pad;
    const height = Math.max(...nodes.map((n) => n.y)) + GRAPH_NODE_H + pad;
    return { nodes, edges, width, height };
  } catch {
    return null;
  }
}

// Practice bundles are an explicit curriculum (simple -> complex), but the
// catalog's own file paths nest each workflow under Category/Subcategory/
// Difficulty folders. File managers list those folders alphabetically on
// extract, which hides the intended learning order. So for practice bundles
// we flatten the archive and prefix every filename with its curriculum
// index + skill band, which keeps extraction order == curriculum order.
function practiceEntryName(index: number, total: number, w: DetailItem): string {
  const pad = String(total).length;
  const num = String(index + 1).padStart(Math.max(pad, 2), "0");
  const band = bandFor(w);
  const ext = path.extname(w.workflowFile) || ".json";
  return `${num} - ${band} - ${downloadSafeTitle(w)}${ext}`;
}

/**
 * Every free template as one ZIP. Deliberately separate from bundleDownload:
 * this path is reachable without a purchase, so it must never consult - or be
 * able to widen - entitlements. It only ever reads templates the catalog has
 * already marked free.
 */
export function starterPackDownload(): { filename: string; body: Buffer } | null {
  const entries: ZipEntry[] = [];
  starterPackItems().forEach((item, i) => {
    const w = getByRoute(item.route);
    if (!w?.free || !w.workflowFile) return;
    const fp = path.join(PRODUCT_ROOT, w.workflowFile);
    if (!fs.existsSync(fp)) return;
    const n = String(i + 1).padStart(2, "0");
    const stem = `${n}-${downloadSafeTitle(w)}`;
    entries.push({ name: `${stem}.json`, data: readWorkflowFile(fp) });
    const setup = setupFileFor(w);
    if (setup) entries.push({ name: `${stem} SETUP.md`, data: setup });
  });
  if (entries.length === 0) return null;
  return { filename: STARTER_PACK_FILENAME, body: createZip(entries) };
}

export function bundleDownload(slug: string): { filename: string; body: Buffer } | null {
  const b = getBundle(slug);
  if (!b) return null;
  const members = bundleMembersDetail(b);
  const entries: ZipEntry[] = [];
  members.forEach((w, i) => {
    if (!w.workflowFile) return;
    const fp = path.join(PRODUCT_ROOT, w.workflowFile);
    if (!fs.existsSync(fp)) return;
    const name =
      b.type === "practice"
        ? practiceEntryName(i, members.length, w)
        : `${path.dirname(w.workflowFile)}/${truthfulLeaf(w)}`;
    entries.push({ name, data: readWorkflowFile(fp) });
    const setup = setupFileFor(w);
    // Same stem as the JSON so the pair sorts together in any file browser.
    if (setup) entries.push({ name: name.replace(/\.json$/i, "") + " SETUP.md", data: setup });
  });
  if (entries.length === 0) return null;
  return { filename: b.slug + ".zip", body: createZip(entries) };
}

export function bundleMemberCount(b: Bundle): number {
  return b.count;
}

/** ZIP of every file in a buyer-assembled cart (bundles flatten to their members). */
export function cartZip(
  items: Array<{ kind: Kind; key: string }>
): { filename: string; body: Buffer } | null {
  const entries = new Map<string, ZipEntry>();

  for (const item of items) {
    if (item.kind === "workflow") {
      const w = getByRoute(item.key);
      if (!w?.workflowFile) continue;
      const fp = path.join(PRODUCT_ROOT, w.workflowFile);
      if (fs.existsSync(fp) && !entries.has(w.workflowFile)) {
        const name = `${path.dirname(w.workflowFile)}/${truthfulLeaf(w)}`;
        entries.set(w.workflowFile, { name, data: readWorkflowFile(fp) });
        const setup = setupFileFor(w);
        if (setup) {
          entries.set(`${w.workflowFile}#setup`, {
            name: name.replace(/\.json$/i, "") + " SETUP.md",
            data: setup,
          });
        }
      }
    } else {
      const b = getBundle(item.key);
      if (!b) continue;
      const members = bundleMembersDetail(b);
      members.forEach((w, i) => {
        if (!w.workflowFile || entries.has(w.workflowFile)) return;
        const fp = path.join(PRODUCT_ROOT, w.workflowFile);
        if (fs.existsSync(fp)) {
          const name =
            b.type === "practice"
              ? practiceEntryName(i, members.length, w)
              : `${path.dirname(w.workflowFile)}/${truthfulLeaf(w)}`;
          entries.set(w.workflowFile, { name, data: readWorkflowFile(fp) });
          const setup = setupFileFor(w);
          if (setup) {
            entries.set(`${w.workflowFile}#setup`, {
              name: name.replace(/\.json$/i, "") + " SETUP.md",
              data: setup,
            });
          }
        }
      });
    }
  }

  if (entries.size === 0) return null;
  return { filename: "workflowcrate-order.zip", body: createZip([...entries.values()]) };
}

const SECRET = process.env.DOWNLOAD_SECRET || "dev-insecure-secret-change-me";

// Everything a download token can point at: a single workflow, a fixed
// bundle, or a buyer-assembled cart (stored server-side by id).
export type DownloadKind = Kind | "cart";

export function signDownload(kind: DownloadKind, key: string, expiresIn = 30 * 60 * 1000): string {
  const exp = Date.now() + expiresIn;
  const data = kind + ":" + key + "." + exp;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return Buffer.from(data).toString("base64url") + "." + sig;
}

export function verifyDownload(token: string): { kind: DownloadKind; key: string } | null {
  try {
    const [b, sig] = token.split(".");
    if (!b || !sig) return null;
    const data = Buffer.from(b, "base64url").toString();
    const expect = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (sig !== expect) return null;
    const lastDot = data.lastIndexOf(".");
    const exp = Number(data.slice(lastDot + 1));
    if (!exp || Date.now() > exp) return null;
    const ref = data.slice(0, lastDot);
    const colon = ref.indexOf(":");
    const kind = ref.slice(0, colon) as DownloadKind;
    const key = ref.slice(colon + 1);
    if (kind !== "workflow" && kind !== "bundle" && kind !== "cart") return null;
    return { kind, key };
  } catch {
    return null;
  }
}
