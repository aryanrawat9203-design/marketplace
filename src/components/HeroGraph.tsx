import type { CSSProperties } from "react";
import HeroParallaxLayer from "./HeroParallaxLayer";

/**
 * Decorative automation-graph backdrop for the hero. Two compositions share
 * one masked, drifting, parallaxing layer:
 *
 *  - Desktop (`lg+`): labelled n8n-style node cards living in the empty gutters
 *    beside the centred copy — a trigger pair fanning through an AI agent and a
 *    router out to app nodes.
 *  - Mobile / tablet (`<lg`): the same idea distilled to a faint node-and-wire
 *    *network* (dots, no labels) so it can sit behind full-width copy without
 *    ever competing with it.
 *
 * All motion is CSS/GPU and reduced-motion-safe: wires carry a gliding "packet"
 * (`hero-packet`), nodes float (`hero-node`), the whole layer drifts slowly
 * (`hero-drift`) and follows the cursor a few px (`hero-parallax`, desktop
 * pointers only — see HeroParallaxLayer). The layer is `aria-hidden`,
 * `pointer-events-none`, and radially masked so the centre stays clear.
 */

type Kind = "trigger" | "ai" | "logic" | "app";

const KIND: Record<Kind, string> = {
  trigger: "#34d399",
  ai: "#a78bfa",
  logic: "#38bdf8",
  app: "#818cf8",
};

// ── Desktop composition ──────────────────────────────────────────────────────
type Node = { id: string; x: number; y: number; kind: Kind; label: string; sub: string };

const NW = 156;
const NH = 46;

// 1200×560 canvas; nodes cluster left and right so the radial mask keeps the
// central text column clear. Coordinates are each node's top-left.
const NODES: Node[] = [
  { id: "sch", x: 24, y: 66, kind: "trigger", label: "Schedule", sub: "Every 15 min" },
  { id: "hook", x: 48, y: 300, kind: "trigger", label: "Webhook", sub: "On new lead" },
  { id: "agent", x: 300, y: 40, kind: "ai", label: "AI Agent", sub: "Reason + act" },
  { id: "route", x: 512, y: 150, kind: "logic", label: "Router", sub: "Branch by type" },
  { id: "slack", x: 992, y: 58, kind: "app", label: "Slack", sub: "Notify team" },
  { id: "sheets", x: 1020, y: 258, kind: "app", label: "Google Sheets", sub: "Append row" },
  { id: "notion", x: 980, y: 430, kind: "app", label: "Notion", sub: "Create page" },
];

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

// Directed wires, in flow order: triggers → agent → router → app nodes. The
// router fans out to all three app nodes, keeping the bottom-centre (where the
// CTAs and trust strip sit) free of nodes.
const EDGES: [from: string, to: string][] = [
  ["sch", "agent"],
  ["hook", "route"],
  ["agent", "route"],
  ["route", "slack"],
  ["route", "sheets"],
  ["route", "notion"],
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

// ── Mobile / tablet composition ──────────────────────────────────────────────
// A 400×800 portrait network. Dots hug the left and right edges (x < ~66 or
// x > ~338) so the mask's clear centre keeps the full-width copy legible; wires
// arc across the middle and simply fade out behind the text.
type Dot = { x: number; y: number; kind: Kind };

const MOBILE_DOTS: Dot[] = [
  { x: 50, y: 128, kind: "trigger" },
  { x: 352, y: 160, kind: "ai" },
  { x: 34, y: 372, kind: "logic" },
  { x: 366, y: 410, kind: "app" },
  { x: 66, y: 590, kind: "ai" },
  { x: 338, y: 600, kind: "app" },
];

const MOBILE_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 5],
  [4, 5],
];

export default function HeroGraph() {
  return (
    <div aria-hidden="true" className="hero-graph-mask pointer-events-none absolute inset-0 overflow-hidden">
      <HeroParallaxLayer>
        <div className="hero-drift absolute inset-0">
          {/* ── Desktop: labelled node graph in the gutters ── */}
          <svg
            viewBox="0 0 1200 560"
            preserveAspectRatio="xMidYMid slice"
            className="hero-graph absolute left-1/2 top-0 hidden h-full min-w-[1200px] -translate-x-1/2 lg:block"
          >
            <g fill="none" strokeLinecap="round">
              {EDGES.map(([from, to], i) => {
                const a = NODE_BY_ID.get(from)!;
                const b = NODE_BY_ID.get(to)!;
                const d = wirePath(a, b);
                return (
                  <g key={`${from}-${to}`}>
                    <path d={d} stroke="rgb(148 148 196 / 0.20)" strokeWidth="1.5" />
                    <path
                      className="hero-packet"
                      d={d}
                      pathLength={240}
                      stroke={KIND[b.kind]}
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
                  <rect width={NW} height={NH} rx="11" fill="var(--color-surface-3)" stroke="rgb(148 148 196 / 0.18)" />
                  <rect x="1" y="1" width={NW - 2} height="1.5" rx="0.75" fill="rgb(255 255 255 / 0.10)" />
                  <rect x="0" y="0" width="4" height={NH} rx="2" fill={KIND[n.kind]} />
                  <circle cx="22" cy={NH / 2} r="4.5" fill={KIND[n.kind]} opacity="0.9" />
                  <circle cx="22" cy={NH / 2} r="8" fill="none" stroke={KIND[n.kind]} strokeWidth="1" opacity="0.35" />
                  <text x="40" y="20" fill="#e7e7ee" fontSize="12.5" fontWeight="600" fontFamily="var(--font-sans), sans-serif">
                    {n.label}
                  </text>
                  <text x="40" y="35" fill="#8b8b99" fontSize="10" fontFamily="var(--font-sans), sans-serif">
                    {n.sub}
                  </text>
                </g>
              </g>
            ))}
          </svg>

          {/* ── Mobile / tablet: faint node-and-wire network ── */}
          <svg
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid slice"
            className="hero-graph-mobile absolute inset-0 block h-full w-full lg:hidden"
          >
            <g fill="none" strokeLinecap="round">
              {MOBILE_EDGES.map(([from, to], i) => {
                const a = MOBILE_DOTS[from];
                const b = MOBILE_DOTS[to];
                const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
                return (
                  <g key={`m-${from}-${to}`}>
                    <path d={d} stroke="rgb(148 148 196 / 0.18)" strokeWidth="1.25" />
                    <path
                      className="hero-packet"
                      d={d}
                      pathLength={240}
                      stroke={KIND[b.kind]}
                      strokeWidth="2"
                      strokeDasharray="4 236"
                      style={{ ["--i" as string]: i } as CSSProperties}
                    />
                  </g>
                );
              })}
            </g>

            {MOBILE_DOTS.map((dot, i) => (
              <g key={`d-${i}`} className="hero-node" style={{ animationDelay: `${(i % 3) * -1.7}s` }}>
                <circle cx={dot.x} cy={dot.y} r="10" fill="none" stroke={KIND[dot.kind]} strokeWidth="1" opacity="0.3" />
                <circle cx={dot.x} cy={dot.y} r="5" fill={KIND[dot.kind]} opacity="0.9" />
              </g>
            ))}
          </svg>
        </div>
      </HeroParallaxLayer>
    </div>
  );
}
