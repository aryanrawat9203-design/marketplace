import Image from "next/image";
import Link from "next/link";
import type { IndexItem } from "@/lib/catalog";
import { getScreenshotsForRoute } from "@/lib/screenshots";
import { Badge, difficultyTone, tierTone } from "./Badge";
import PriceTag from "./PriceTag";

export default async function WorkflowCard({ w }: { w: IndexItem }) {
  const cardThumb = (await getScreenshotsForRoute(w.route))?.cardThumb;
  return (
    <Link
      href={`/workflows/${w.route}`}
      className="card card-hover group flex flex-col p-5"
    >
      {cardThumb && (
        <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl border-b border-white/[0.06]">
          <Image
            src={cardThumb}
            alt=""
            width={640}
            height={360}
            className="aspect-video w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            unoptimized
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {w.free && <Badge tone="emerald">Free sample</Badge>}
        {w.difficulty && <Badge tone={difficultyTone(w.difficulty)}>{w.difficulty}</Badge>}
        {w.tier && !w.free && <Badge tone={tierTone(w.tier)}>{w.tier}</Badge>}
      </div>
      <h3 className="mt-3 line-clamp-2 font-sans text-base font-semibold leading-snug text-zinc-100 group-hover:text-white">
        {w.title}
      </h3>
      {w.short && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">{w.short}</p>}
      <div className="mb-4 mt-4 flex flex-1 flex-wrap content-start items-start gap-1.5">
        {w.platforms.slice(0, 3).map((p) => (
          <span key={p} className="chip">
            {p}
          </span>
        ))}
        {w.platforms.length > 3 && (
          <span className="text-[11px] text-zinc-500">+{w.platforms.length - 3}</span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <PriceTag price={w.price} mrp={w.mrp} off={w.off} free={w.free} size="sm" />
        <span className="shrink-0 text-sm font-medium text-violet-400 group-hover:text-violet-300">
          {w.free ? "Get" : "Buy"}{" "}
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </span>
      </div>
    </Link>
  );
}
