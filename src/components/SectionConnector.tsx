/**
 * Thin animated "wire" dropped into the flat vertical gap between two stacked
 * homepage sections - the horizontal counterpart to PageSideGraph's vertical
 * rails, so the whitespace between sections carries the same automation-graph
 * motif instead of sitting empty. Same node/packet language as HeroGraph:
 * colored dots per node kind, floating gently, joined by a hairline wire with
 * two packets gliding across on a loop. Reduced-motion-safe, aria-hidden,
 * hidden below `sm` where there's no room for it.
 */

type Kind = "trigger" | "ai" | "logic" | "app";

const KIND: Record<Kind, string> = {
  trigger: "#34d399",
  ai: "#a78bfa",
  logic: "#38bdf8",
  app: "#818cf8",
};

const DOTS: { kind: Kind; pct: number }[] = [
  { kind: "trigger", pct: 10 },
  { kind: "ai", pct: 36 },
  { kind: "logic", pct: 64 },
  { kind: "app", pct: 90 },
];

export default function SectionConnector() {
  return (
    <div aria-hidden="true" className="mx-auto hidden max-w-7xl px-4 sm:block sm:px-6">
      <div className="relative h-10 overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />
        {DOTS.map((d, i) => (
          <span
            key={d.kind}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${d.pct}%` }}
          >
            <span
              className="hero-node block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: KIND[d.kind],
                boxShadow: `0 0 0 4px ${KIND[d.kind]}26`,
                animationDelay: `${(i % 3) * -1.8}s`,
              }}
            />
          </span>
        ))}
        <span
          className="connector-packet absolute top-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ width: 6, height: 6, boxShadow: "0 0 10px 2px rgba(167,139,250,0.65)" }}
        />
        <span
          className="connector-packet absolute top-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ width: 6, height: 6, boxShadow: "0 0 10px 2px rgba(56,189,248,0.65)", animationDelay: "-2.25s" }}
        />
      </div>
    </div>
  );
}
