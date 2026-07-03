import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getByRoute } from "./catalog";
import { getBundle, bundleMembersDetail, type Bundle } from "./bundles";
import { createZip, type ZipEntry } from "./zip";

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

export function getPurchasable(kind: Kind, key: string): Purchasable | undefined {
  if (kind === "workflow") {
    const w = getByRoute(key);
    if (!w) return undefined;
    return { kind, key, name: w.title, price: w.price ?? 0, currency: "INR", free: !!w.free };
  }
  const b = getBundle(key);
  if (!b) return undefined;
  return { kind: "bundle", key, name: b.name, price: b.price, currency: "INR", free: false };
}

export function workflowDownload(route: string): { filename: string; body: Buffer } | null {
  const w = getByRoute(route);
  if (!w?.workflowFile) return null;
  const fp = path.join(PRODUCT_ROOT, w.workflowFile);
  if (!fs.existsSync(fp)) return null;
  return { filename: path.basename(w.workflowFile), body: fs.readFileSync(fp) };
}

function friendlyNodeType(type: string): string {
  const short = type.replace(/^n8n-nodes-base\./, "").replace(/^@n8n\/n8n-nodes-langchain\./, "");
  return short
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export type WorkflowPreview = { nodeCount: number; nodeTypes: string[] };

// Reads only node `type`/`name` fields from the shipped workflow JSON - never
// `parameters`, so this is safe to show before purchase.
export function previewWorkflow(route: string): WorkflowPreview | null {
  const w = getByRoute(route);
  if (!w?.workflowFile) return null;
  const fp = path.join(PRODUCT_ROOT, w.workflowFile);
  if (!fs.existsSync(fp)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(fp, "utf-8")) as { nodes?: Array<{ type?: string }> };
    // Sticky notes are canvas annotations, not workflow steps.
    const nodes = (raw.nodes ?? []).filter((n) => n.type !== "n8n-nodes-base.stickyNote");
    const types = new Set<string>();
    for (const n of nodes) {
      if (n.type) types.add(friendlyNodeType(n.type));
    }
    return { nodeCount: nodes.length, nodeTypes: [...types].sort() };
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

export function bundleDownload(slug: string): { filename: string; body: Buffer } | null {
  const b = getBundle(slug);
  if (!b) return null;
  const members = bundleMembersDetail(b);
  const entries: ZipEntry[] = [];
  for (const w of members) {
    if (!w.workflowFile) continue;
    const fp = path.join(PRODUCT_ROOT, w.workflowFile);
    if (fs.existsSync(fp)) entries.push({ name: w.workflowFile, data: fs.readFileSync(fp) });
  }
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
        entries.set(w.workflowFile, { name: w.workflowFile, data: fs.readFileSync(fp) });
      }
    } else {
      const b = getBundle(item.key);
      if (!b) continue;
      for (const w of bundleMembersDetail(b)) {
        if (!w.workflowFile || entries.has(w.workflowFile)) continue;
        const fp = path.join(PRODUCT_ROOT, w.workflowFile);
        if (fs.existsSync(fp)) {
          entries.set(w.workflowFile, { name: w.workflowFile, data: fs.readFileSync(fp) });
        }
      }
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
