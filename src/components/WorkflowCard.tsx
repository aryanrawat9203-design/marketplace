import Image from "next/image";
import Link from "next/link";
import type { IndexItem } from "@/lib/catalog";
import { getScreenshotsForRoute } from "@/lib/screenshots";
import { Badge, difficultyTone, tierTone } from "./Badge";
import PriceTag from "./PriceTag";

/**
 * `note` is an optional reassurance line under the title, used where the
 * surrounding page promises something the title does not name - e.g. an
 * integration-pair page showing a template that genuinely uses both tools but
 * is titled after neither.
 */
export default async function WorkflowCard({ w, note }: { w: IndexItem; note?: string }) {
  const cardThumb = (await getScreenshotsForRoute(w.route))?.cardThumb;
  return (
    <Link
      href={`/workflows/${w.route}`}
      className="card card-hover group flex flex-col p-5"
    >
      {/* Card thumbnails are uploaded PNGs. `unoptimized` used to ship them at
          full size to every listing grid - twelve of them per page - which is
          the largest avoidable payload on the site. Dropping it lets the
          optimizer re-encode to AVIF/WebP at the size actually rendered
          (next.config allowlists the Supabase Storage host for exactly this).
          next/image lazy-loads by default, so only the visible cards fetch. */}
      {cardThumb && (
        <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl border-b border-white/[0.06]">
          <Image
            src={cardThumb}
            alt=""
            width={640}
            height={360}
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className="aspect-video w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {w.free && <Badge tone="emerald">Free sample</Badge>}
        {w.difficulty && <Badge tone={difficultyTone(w.difficulty)}>{w.difficulty}</Badge>}
        {w.tier && !w.free && <Badge tone={tierTone(w.tier)}>{w.tier}</Badge>}
      </div>
      <h3 className="mt-3 line-clamp-2 font-sans text-base font-semibold leading-snug text-ink group-hover:text-white">
        {w.title}
      </h3>
      {note && (
        <p className="mt-1.5 text-xs font-medium text-emerald-300/90">{note}</p>
      )}
      {w.short && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{w.short}</p>}
      <div className="mb-4 mt-4 flex flex-1 flex-wrap content-start items-start gap-1.5">
        {w.platforms.slice(0, 3).map((p) => (
          <span key={p} className="chip">
            {p}
          </span>
        ))}
        {w.platforms.length > 3 && (
          <span className="text-[11px] text-faint">+{w.platforms.length - 3}</span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <PriceTag price={w.price} free={w.free} size="sm" />
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
