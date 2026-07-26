import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchBar } from "@/components/Controls";
import { getTaxonomy } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const destinations: { href: string; label: string; desc: string }[] = [
  { href: "/workflows", label: "Browse all templates", desc: "Search and filter the full catalog" },
  { href: "/workflows?tier=Free", label: "Free templates", desc: "No card, no signup — just import" },
  { href: "/bundles", label: "Bundles & pricing", desc: "Whole categories at up to 60% off" },
  { href: "/collections", label: "Curated collections", desc: "Hand-assembled starter packs" },
  { href: "/integrations", label: "Browse by integration", desc: "Start from the apps you already use" },
  { href: "/custom", label: "Request a custom build", desc: "Describe it, get a fixed quote" },
];

/**
 * Catalog routes change as templates are renamed or retired, and with 10,501
 * indexed URLs some share of traffic will always land on a stale one. This
 * page treats that as a routing problem rather than a dead end: search first,
 * then the handful of places a lost visitor actually wants.
 */
export default function NotFound() {
  const taxo = getTaxonomy();

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="text-center">
        <p className="font-mono text-sm font-medium uppercase tracking-[0.22em] text-violet-400">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          The link may be out of date, or the template may have been renamed. All{" "}
          {taxo.total.toLocaleString("en-IN")} templates are still here — search for what you
          were after.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-xl">
        <Suspense fallback={<div className="h-12" />}>
          <SearchBar />
        </Suspense>
      </div>

      <div className="mt-12">
        <h2 className="text-sm font-semibold text-ink">Or pick up from here</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {destinations.map((d) => (
            <Link key={d.href} href={d.href} className="card card-hover group p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-body group-hover:text-ink">{d.label}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-violet-400 transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  &rarr;
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-faint">{d.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-sm text-faint">
        Think this is a broken link on our side?{" "}
        <Link href="/contact" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">
          Tell us
        </Link>{" "}
        and we&apos;ll fix it.
      </p>
    </div>
  );
}
