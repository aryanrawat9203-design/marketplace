/**
 * Pure derivations from a parsed n8n workflow JSON.
 *
 * These used to live inside `commerce.ts`, each one opening the product file
 * itself with `fs.readFileSync`. That coupling was the reason the whole 352 MB
 * `product-files/` tree was traced into twelve serverless functions: Turbopack
 * sees a dynamic `fs` read rooted at a directory and conservatively bundles
 * every file under it into *any* route that transitively imports the module.
 *
 * So the rule and the read are separated here. Nothing in this file touches the
 * filesystem, the network, or the catalog - it takes an already-parsed workflow
 * object and returns what the product page and the download both need. The
 * build script (`scripts/build-render-payloads.mjs`) runs it once per template
 * to precompute `src/data/render-payloads.json`; the download path runs the
 * same functions on bytes fetched from Supabase Storage. One rule, two callers,
 * no drift.
 */
import { capsFromTypes, friendlyNodeType, type Caps } from "./node-facts";
import {
  buildSetupChecklist,
  requiredLibFiles,
  type SetupChecklist,
  type WorkflowJsonLike,
} from "./setup-checklist";

/** The subset of an n8n workflow file these derivations read. */
export type RawWorkflow = {
  nodes?: Array<{
    name?: string;
    type?: string;
    retryOnFail?: boolean;
    position?: [number, number];
  }>;
  connections?: Record<string, Record<string, unknown>>;
  pinData?: Record<string, unknown>;
};

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

export const GRAPH_NODE_W = 190;
export const GRAPH_NODE_H = 56;

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

function nodeKind(type: string): GraphNode["kind"] {
  const t = type.toLowerCase();
  if (/trigger|webhook|cron|schedule/.test(t)) return "trigger";
  if (t.startsWith("@n8n/n8n-nodes-langchain.") || /openai|gemini|anthropic|mistral|ollama/.test(t)) return "ai";
  if (/\.(if|switch|merge|filter|set|code|function|wait|noop|splitinbatches|aggregate|itemlists)$/.test(t)) return "logic";
  return "app";
}

// Reads only node `type`/`retryOnFail` fields from the shipped workflow JSON -
// never `parameters`, so this is safe to show before purchase.
export function derivePreview(raw: RawWorkflow): WorkflowPreview | null {
  try {
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
      const o = out as Record<string, unknown> | undefined;
      if (o?.ai_tool) {
        const t = byName.get(from);
        if (t) agentTools.push({ name: from, label: toolLabel(t) });
      }
      if (o?.ai_memory) agentMemory = true;
    }
    agentTools.sort((a, b) => a.name.localeCompare(b.name));
    return { nodeCount: nodes.length, nodeTypes: [...types].sort(), agentTools, agentMemory, caps };
  } catch {
    return null;
  }
}

// Extracts only what's safe to show before purchase: node names, types,
// canvas positions, and which node connects to which. Never `parameters`.
export function deriveGraph(raw: RawWorkflow): WorkflowGraphData | null {
  try {
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
      const outs = outputs as Record<string, Array<Array<{ node?: string }>>> | undefined;
      for (const [connType, groups] of Object.entries(outs ?? {})) {
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

/**
 * Everything a product page renders and a download needs, from one parse.
 *
 * `setup` and `libFiles` are here rather than only on the download path
 * because the page shows the checklist before purchase and the ZIP writes the
 * same checklist into SETUP.md - deriving both once at build time means the
 * download function never has to parse the workflow to know what travels
 * with it.
 */
export type RenderPayload = {
  preview: WorkflowPreview | null;
  graph: WorkflowGraphData | null;
  setup: SetupChecklist | null;
  libFiles: string[];
};

export function deriveRenderPayload(raw: unknown): RenderPayload {
  const wf = raw as RawWorkflow;
  let setup: SetupChecklist | null = null;
  try {
    setup = buildSetupChecklist(raw as WorkflowJsonLike);
  } catch {
    setup = null; // a template we cannot parse gets no claim made about it
  }
  let libFiles: string[] = [];
  try {
    libFiles = requiredLibFiles(raw as WorkflowJsonLike);
  } catch {
    libFiles = [];
  }
  return { preview: derivePreview(wf), graph: deriveGraph(wf), setup, libFiles };
}
