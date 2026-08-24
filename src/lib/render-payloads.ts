/**
 * Build-time-derived data for the product page, read without touching a
 * product file.
 *
 * `/workflows/[route]` needs a template's node preview, its graph and its setup
 * checklist. Deriving those at request time meant `fs.readFileSync` under
 * `product-files/`, which traced the entire 352 MB corpus into every function
 * that transitively imported `commerce.ts`. They are precomputed by
 * `scripts/build-render-payloads.mjs` instead and read here.
 *
 * Two things about this module are deliberate:
 *
 *  - **It is imported only by the product page.** Not by `commerce.ts`. A
 *    serverless function carries whatever its import graph reaches, so keeping
 *    this out of `commerce.ts` keeps ~78 MB of shards off `/api/verify`,
 *    `/api/checkout`, the webhook and the rest.
 *  - **It reads a shard, not the whole set.** 256 shards of ~300 KB; a render
 *    parses one and memoises it, so cold start never pays for 78 MB of JSON.
 *
 * A missing shard or an unknown route is not an error - it yields nulls and the
 * page renders without those sections, exactly as it did when an unreadable
 * product file yielded null.
 */
import fs from "fs";
import path from "path";
import type { SetupChecklist } from "./setup-checklist";
import type { WorkflowPreview, WorkflowGraphData, GraphNode } from "./workflow-derive";

export type { WorkflowPreview, WorkflowGraphData, GraphNode };

// `label` is dropped on disk because it is always identical to `id`.
type StoredNode = Omit<GraphNode, "label">;
type StoredGraph = Omit<WorkflowGraphData, "nodes"> & { nodes: StoredNode[] };
type StoredPayload = {
  preview: WorkflowPreview | null;
  graph: StoredGraph | null;
  setup: SetupChecklist | null;
  libFiles: string[];
};

export type RenderPayload = {
  preview: WorkflowPreview | null;
  graph: WorkflowGraphData | null;
  setup: SetupChecklist | null;
  libFiles: string[];
};

const EMPTY: RenderPayload = { preview: null, graph: null, setup: null, libFiles: [] };

// Must stay in lockstep with shardFor() in scripts/build-render-payloads.mjs.
const SHARD_COUNT = 256;
function shardFor(route: string): number {
  let h = 2166136261;
  for (let i = 0; i < route.length; i++) {
    h ^= route.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % SHARD_COUNT;
}

const PAYLOAD_DIR = path.join(process.cwd(), "render-payloads");
const shardCache = new Map<number, Record<string, StoredPayload>>();

function loadShard(n: number): Record<string, StoredPayload> {
  const hit = shardCache.get(n);
  if (hit) return hit;
  let data: Record<string, StoredPayload> = {};
  try {
    const fp = path.join(PAYLOAD_DIR, `${String(n).padStart(3, "0")}.json`);
    data = JSON.parse(fs.readFileSync(fp, "utf-8")) as Record<string, StoredPayload>;
  } catch {
    data = {}; // absent shard behaves like an unknown route
  }
  shardCache.set(n, data);
  return data;
}

export function renderPayload(route: string): RenderPayload {
  const stored = loadShard(shardFor(route))[route];
  if (!stored) return EMPTY;
  return {
    preview: stored.preview,
    graph: stored.graph
      ? {
          ...stored.graph,
          nodes: stored.graph.nodes.map((n) => ({ ...n, label: n.id })),
        }
      : null,
    setup: stored.setup,
    libFiles: stored.libFiles ?? [],
  };
}
