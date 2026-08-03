import type { CSSProperties } from "react";

/**
 * Sitewide ambient automation graph that lives in the empty side gutters on
 * wide screens — the same node/wire/"packet" language as the hero, but a
 * different, smaller cast so the two never read as a repeat. Two vertical rails
 * (left + right) frame the centred content and keep flowing as you scroll.
 *
 * Fixed and decorative: `aria-hidden`, `pointer-events-none`, behind all content
 * (`-z-10`), and only shown once the gutters are wide enough to hold a labelled
 * card without touching the copy (`min-[1600px]`). Motion is the shared CSS
 * (`hero-drift` / `hero-packet` / `hero-node`), all disabled under reduced motion.
 */

type Kind = "trigger" | "ai" | "logic" | "app";

const KIND: Record<Kind, string> = {
  trigger: "#34d399",
  ai: "#a78bfa",
  logic: "#38bdf8",
  app: "#818cf8",
};

type SideNode = { x: number; y: number; kind: Kind; label: string; sub: string };

const NW = 136;
const NH = 42;

// 1600×1000 canvas, slice-covered over the viewport → cards hug the far edges,
// landing in the side gutters. A deliberately different cast from the hero.
const LEFT: SideNode[] = [
  { x: 18, y: 150, kind: "trigger", label: "Gmail", sub: "New email" },
  { x: 30, y: 372, kind: "ai", label: "Extract", sub: "Parse fields" },
  { x: 14, y: 594, kind: "logic", label: "Filter", sub: "Route rules" },
  { x: 26, y: 816, kind: "app", label: "Airtable", sub: "Upsert row" },
];

const RIGHT: SideNode[] = [
  { x: 1446, y: 210, kind: "trigger", label: "HubSpot", sub: "New contact" },
  { x: 1434, y: 432, kind: "ai", label: "Summarize", sub: "AI digest" },
  { x: 1450, y: 654, kind: "logic", label: "Merge", sub: "Combine" },
  { x: 1440, y: 876, kind: "app", label: "Discord", sub: "Post message" },
];

/** Vertical bezier from the bottom of `a` to the top of `b`. */
function vWire(a: SideNode, b: SideNode): string {
  const x1 = a.x + NW / 2;
  const y1 = a.y + NH;
  const x2 = b.x + NW / 2;
  const y2 = b.y;
  return `M ${x1} ${y1} C ${x1} ${y1 + 44}, ${x2} ${y2 - 44}, ${x2} ${y2}`;
}

function Rail({ nodes, tag }: { nodes: SideNode[]; tag: string }) {
  return (
    <>
      <g fill="none" strokeLinecap="round">
        {nodes.slice(0, -1).map((n, i) => {
          const d = vWire(n, nodes[i + 1]);
          return (
            <g key={`${tag}-w-${i}`}>
              <path d={d} stroke="rgb(148 148 196 / 0.18)" strokeWidth="1.25" />
              <path
                className="hero-packet"
                d={d}
                pathLength={240}
                stroke={KIND[nodes[i + 1].kind]}
                strokeWidth="1.75"
                strokeDasharray="4 236"
                style={{ ["--i" as string]: i } as CSSProperties}
              />
            </g>
          );
        })}
      </g>
      {nodes.map((n, i) => (
        <g key={`${tag}-n-${i}`} transform={`translate(${n.x} ${n.y})`}>
          <g className="hero-node" style={{ animationDelay: `${(i % 3) * -1.9}s` }}>
            <rect width={NW} height={NH} rx="10" fill="var(--color-surface-3)" stroke="rgb(148 148 196 / 0.16)" />
            <rect x="1" y="1" width={NW - 2} height="1.5" rx="0.75" fill="rgb(255 255 255 / 0.08)" />
            <rect x="0" y="0" width="3.5" height={NH} rx="2" fill={KIND[n.kind]} />
            <circle cx="18" cy={NH / 2} r="4" fill={KIND[n.kind]} opacity="0.9" />
            <circle cx="18" cy={NH / 2} r="7" fill="none" stroke={KIND[n.kind]} strokeWidth="1" opacity="0.3" />
            <text x="32" y="18" fill="#d7d7df" fontSize="11" fontWeight="600" fontFamily="var(--font-sans), sans-serif">
              {n.label}
            </text>
            <text x="32" y="30.5" fill="#8b8b99" fontSize="8.5" fontFamily="var(--font-sans), sans-serif">
              {n.sub}
            </text>
          </g>
        </g>
      ))}
    </>
  );
}

export default function PageSideGraph() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 hidden opacity-80 min-[1600px]:block [mask-image:linear-gradient(180deg,transparent,black_12%,black_88%,transparent)]"
    >
      <div className="hero-drift absolute inset-0">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
          <Rail nodes={LEFT} tag="l" />
          <Rail nodes={RIGHT} tag="r" />
        </svg>
      </div>
    </div>
  );
}
