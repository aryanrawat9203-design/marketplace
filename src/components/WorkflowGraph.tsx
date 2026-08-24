import type { WorkflowGraphData, GraphNode } from "@/lib/workflow-derive";
import { GRAPH_NODE_W as NW, GRAPH_NODE_H as NH } from "@/lib/workflow-derive";

const KIND_ACCENT: Record<GraphNode["kind"], string> = {
  trigger: "#34d399",
  ai: "#a78bfa",
  logic: "#38bdf8",
  app: "#818cf8",
};

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Read-only SVG rendering of the template's real node graph (names, types,
 *  layout and connections only - parameters stay locked until purchase). */
export default function WorkflowGraph({ graph }: { graph: WorkflowGraphData }) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <div tabIndex={0} role="region" aria-label="Workflow node diagram (scrollable)" className="overflow-x-auto rounded-2xl border border-hairline bg-surface-1 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500">
      <svg
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        width={graph.width}
        height={graph.height}
        role="img"
        aria-label="Diagram of the workflow's nodes and connections"
        className="mx-auto block"
      >
        <g fill="none">
          {graph.edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            let d: string;
            if (e.main) {
              const x1 = a.x + NW;
              const y1 = a.y + NH / 2;
              const x2 = b.x;
              const y2 = b.y + NH / 2;
              const dx = Math.max(40, (x2 - x1) / 2);
              d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            } else {
              // ai_* / sub-node connections run vertically in n8n's canvas
              const x1 = a.x + NW / 2;
              const y1 = a.y;
              const x2 = b.x + NW / 2;
              const y2 = b.y + NH;
              d = `M ${x1} ${y1} C ${x1} ${y1 - 40}, ${x2} ${y2 + 40}, ${x2} ${y2}`;
            }
            return (
              <path
                key={i}
                d={d}
                stroke={e.main ? "#52525b" : "#6d5fa8"}
                strokeWidth="1.5"
                strokeDasharray={e.main ? undefined : "4 4"}
              />
            );
          })}
        </g>
        {graph.nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            <rect width={NW} height={NH} rx="10" fill="var(--color-surface-3)" stroke="#33333f" />
            <rect x="0" y="0" width="4" height={NH} rx="2" fill={KIND_ACCENT[n.kind]} />
            <text x="14" y="24" fill="#e4e4e7" fontSize="12.5" fontWeight="600" fontFamily="var(--font-sans), sans-serif">
              {truncate(n.label, 24)}
            </text>
            <text x="14" y="42" fill="#71717a" fontSize="10.5" fontFamily="var(--font-sans), sans-serif">
              {truncate(n.typeLabel, 28)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
