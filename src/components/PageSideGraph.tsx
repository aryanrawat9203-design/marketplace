import type { CSSProperties } from "react";

/**
 * Sitewide ambient automation graph for the empty side gutters on wide screens.
 * Same node/wire/"packet" language as the hero, but a distinct cast (Gmail →
 * Extract → Filter → Airtable / HubSpot → Summarize → Merge → Discord) so the
 * two never read as a repeat.
 *
 * Each rail is a fixed-width column pinned to the *content edge* (via
 * `calc(50% + 40rem)`, 40rem being half of max-w-7xl), so it always lands inside
 * the gutter without clipping or overlapping the copy — no matter the exact
 * viewport. The SVG's viewBox width equals the rail width, so slice-scaling never
 * resizes the cards. Shown from 1500px (where the gutter first clears the rail),
 * `aria-hidden`, `pointer-events-none`, behind everything (`-z-10`). Motion is the
 * shared `hero-packet` / `hero-node` CSS, disabled under reduced motion.
 */

type Kind = "trigger" | "ai" | "logic" | "app";

const KIND: Record<Kind, string> = {
  trigger: "#34d399",
  ai: "#a78bfa",
  logic: "#38bdf8",
  app: "#818cf8",
};

type SideNode = { y: number; kind: Kind; label: string; sub: string };

const RAIL = 108; // px column width; == viewBox width so cards never scale
const NW = 100;
const NH = 38;
const NX = 4;
const CX = NX + NW / 2;

const LEFT: SideNode[] = [
  { y: 120, kind: "trigger", label: "Gmail", sub: "New email" },
  { y: 372, kind: "ai", label: "Extract", sub: "Parse fields" },
  { y: 624, kind: "logic", label: "Filter", sub: "Route rules" },
  { y: 876, kind: "app", label: "Airtable", sub: "Upsert row" },
];

const RIGHT: SideNode[] = [
  { y: 210, kind: "trigger", label: "HubSpot", sub: "New contact" },
  { y: 462, kind: "ai", label: "Summarize", sub: "AI digest" },
  { y: 714, kind: "logic", label: "Merge", sub: "Combine" },
  { y: 966, kind: "app", label: "Discord", sub: "Post message" },
];

function wire(a: SideNode, b: SideNode): string {
  return `M ${CX} ${a.y + NH} C ${CX} ${a.y + NH + 52}, ${CX} ${b.y - 52}, ${CX} ${b.y}`;
}

function Rail({ nodes, tag }: { nodes: SideNode[]; tag: string }) {
  return (
    <svg viewBox={`0 0 ${RAIL} 2000`} preserveAspectRatio="xMidYMin slice" className="h-full w-full">
      <g fill="none" strokeLinecap="round">
        {nodes.slice(0, -1).map((n, i) => {
          const d = wire(n, nodes[i + 1]);
          return (
            <g key={`${tag}-w-${i}`}>
              <path d={d} stroke="rgb(148 148 196 / 0.24)" strokeWidth="1.5" />
              <path
                className="hero-packet"
                d={d}
                pathLength={240}
                stroke={KIND[nodes[i + 1].kind]}
                strokeWidth="2.25"
                strokeDasharray="5 235"
                style={{ ["--i" as string]: i } as CSSProperties}
              />
            </g>
          );
        })}
      </g>
      {nodes.map((n, i) => (
        <g key={`${tag}-n-${i}`} transform={`translate(${NX} ${n.y})`}>
          <g className="hero-node" style={{ animationDelay: `${(i % 3) * -1.9}s` }}>
            <rect width={NW} height={NH} rx="9" fill="var(--color-surface-3)" stroke="rgb(148 148 196 / 0.28)" />
            <rect x="1" y="1" width={NW - 2} height="1.5" rx="0.75" fill="rgb(255 255 255 / 0.14)" />
            <rect x="0" y="0" width="3.5" height={NH} rx="2" fill={KIND[n.kind]} />
            <circle cx="15" cy={NH / 2} r="3.6" fill={KIND[n.kind]} />
            <circle cx="15" cy={NH / 2} r="6.4" fill="none" stroke={KIND[n.kind]} strokeWidth="1" opacity="0.45" />
            <text x="26" y="16" fill="#e6e6ee" fontSize="10.5" fontWeight="600" fontFamily="var(--font-sans), sans-serif">
              {n.label}
            </text>
            <text x="26" y="28" fill="#9a9aa8" fontSize="7.8" fontFamily="var(--font-sans), sans-serif">
              {n.sub}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}

const FADE = "[mask-image:linear-gradient(180deg,transparent,black_9%,black_91%,transparent)]";

export default function PageSideGraph() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 hidden min-[1500px]:block">
      {/* left rail: right edge pinned to the content's left edge */}
      <div className={`absolute bottom-0 top-0 w-[108px] overflow-hidden right-[calc(50%_+_40rem)] ${FADE}`}>
        <Rail nodes={LEFT} tag="l" />
      </div>
      {/* right rail: left edge pinned to the content's right edge */}
      <div className={`absolute bottom-0 top-0 w-[108px] overflow-hidden left-[calc(50%_+_40rem)] ${FADE}`}>
        <Rail nodes={RIGHT} tag="r" />
      </div>
    </div>
  );
}
