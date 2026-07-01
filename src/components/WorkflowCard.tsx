import Link from "next/link";
import type { IndexItem } from "@/lib/catalog";
import { Badge, difficultyTone, tierTone } from "./Badge";
import PriceTag from "./PriceTag";

export default function WorkflowCard({ w }: { w: IndexItem }) {
  return (
    <Link
      href={`/workflows/${w.route}`}
      className="group flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 card-hover hover:border-violet-500/50 hover:bg-zinc-900/70"
    >
      <div className="flex flex-wrap items-center gap-2">
        {w.free && <Badge tone="emerald">Free sample</Badge>}
        {w.difficulty && <Badge tone={difficultyTone(w.difficulty)}>{w.difficulty}</Badge>}
        {w.tier && !w.free && <Badge tone={tierTone(w.tier)}>{w.tier}</Badge>}
      </div>
      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-zinc-100 group-hover:text-white">
        {w.title}
      </h3>
      {w.short && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">{w.short}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {w.platforms.slice(0, 3).map((p) => (
          <span key={p} className="rounded-md bg-zinc-800/70 px-2 py-0.5 text-[11px] text-zinc-300">
            {p}
          </span>
        ))}
        {w.platforms.length > 3 && (
          <span className="text-[11px] text-zinc-500">+{w.platforms.length - 3}</span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/70 pt-3">
        <PriceTag price={w.price} mrp={w.mrp} off={w.off} free={w.free} size="sm" />
        <span className="shrink-0 text-sm font-medium text-violet-400 group-hover:text-violet-300">
          {w.free ? "Get" : "Buy"} &rarr;
        </span>
      </div>
    </Link>
  );
}
