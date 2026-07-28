import type { CSSProperties } from "react";

/**
 * Decorative automation-graph backdrop for the hero. An ambient render of an
 * n8n-style canvas — a trigger fanning out through an AI agent and a router
 * into app nodes — with faint "current" flowing along the wires and a data
 * packet gliding down each one.
 *
 * Deliberately server-rendered SVG with zero client JS: every motion is a CSS
 * keyframe (see globals.css `hero-*`), all GPU-friendly transform/dashoffset,
 * and all disabled under `prefers-reduced-motion`. The whole layer is
 * `aria-hidden` and `pointer-events-none`, and it's radially masked so the
 * centre stays clear behind the headline and search — the graph only frames
 * the copy, it never sits under it.
 */

type Kind = "trigger" | "ai" | "logic" | "app";

const KIND: Record<Kind, string> = {
  trigger: "#34d399",
  ai: "#a78bfa",
  logic: "#38bdf8",
  app: "#818cf8",
};

type Node = {
  id: string;
  x: number;
  y: number;
  kind: Kind;
  label: string;
  sub: string;
};

const NW = 156;
const NH = 46;

// Composition spans 1200×560; nodes cluster left and right so the radial mask
// can keep the central text column clear. Coordinates are the node's top-left.
const NODES: Node[] = [
  { id: "sch", x: 24, y: 66, kind: "trigger", label: "Schedule", sub: "Every 15 min" },
  { id: "hook", x: 48, y: 300, kind: "trigger", label: "Webhook", sub: "On new lead" },
  { id: "agent", x: 300, y: 40, kind: "ai", label: "AI Agent", sub: "Reason + act" },
  { id: "route", x: 512, y: 150, kind: "logic", label: "Router", sub: "Branch by type" },
  { id: "enrich", x: 560, y: 388, kind: "ai", label: "Enrich", sub: "Summarise" },
  { id: "slack", x: 992, y: 58, kind: "app", label: "Slack", sub: "Notify team" },
  { id: "sheets", x: 1020, y: 258, kind: "app", label: "Google Sheets", sub: "Append row" },
  { id: "notion", x: 980, y: 430, kind: "app", label: "Notion", sub: "Create page" },
];

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

// Directed wires, in flow order. Each becomes a base wire plus a lit packet.
const EDGES: [from: string, to: string][] = [
  ["sch", "agent"],
  ["hook", "route"],
  ["agent", "route"],
  ["route", "slack"],
  ["route", "enrich"],
  ["enrich", "sheets"],
  ["enrich", "notion"],
];

/** Bezier from the right edge of `a` to the left edge of `b`. */
function wirePath(a: Node, b: Node): string {
  const x1 = a.x + NW;
  const y1 = a.y + NH / 2;
  const x2 = b.x;
  const y2 = b.y + NH / 2;
  const dx = Math.max(60, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function HeroGraph() {
  return (
    <div aria-hidden="true" className="hero-graph-mask pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 1200 560"
        preserveAspectRatio="xMidYMid slice"
        className="hero-graph absolute left-1/2 top-0 h-full min-w-[1200px] -translate-x-1/2"
      >
        {/* wires: a faint base, then a bright short "packet" dash gliding along.
            pathLength normalises every wire to 240 units so one dash spec and
            one duration read identically on long and short edges alike. */}
        <g fill="none" strokeLinecap="round">
          {EDGES.map(([from, to], i) => {
            const a = NODE_BY_ID.get(from)!;
            const b = NODE_BY_ID.get(to)!;
            const d = wirePath(a, b);
            const tint = KIND[b.kind];
            return (
              <g key={`${from}-${to}`}>
                <path d={d} stroke="rgb(148 148 196 / 0.20)" strokeWidth="1.5" />
                <path
                  className="hero-packet"
                  d={d}
                  pathLength={240}
                  stroke={tint}
                  strokeWidth="2.25"
                  strokeDasharray="5 235"
                  style={{ ["--i" as string]: i } as CSSProperties}
                />
              </g>
            );
          })}
        </g>

        {NODES.map((n, i) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            <g className="hero-node" style={{ animationDelay: `${(i % 4) * -1.3}s` }}>
              <rect
                width={NW}
                height={NH}
                rx="11"
                fill="var(--color-surface-3)"
                stroke="rgb(148 148 196 / 0.18)"
              />
              {/* lit top bevel — the same machined edge the card system uses */}
              <rect x="1" y="1" width={NW - 2} height="1.5" rx="0.75" fill="rgb(255 255 255 / 0.10)" />
              <rect x="0" y="0" width="4" height={NH} rx="2" fill={KIND[n.kind]} />
              <circle cx="22" cy={NH / 2} r="4.5" fill={KIND[n.kind]} opacity="0.9" />
              <circle cx="22" cy={NH / 2} r="8" fill="none" stroke={KIND[n.kind]} strokeWidth="1" opacity="0.35" />
              <text
                x="40"
                y="20"
                fill="#e7e7ee"
                fontSize="12.5"
                fontWeight="600"
                fontFamily="var(--font-sans), sans-serif"
              >
                {n.label}
              </text>
              <text x="40" y="35" fill="#8b8b99" fontSize="10" fontFamily="var(--font-sans), sans-serif">
                {n.sub}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
