"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { inr } from "@/lib/pricing";

type RecentItem = {
  route: string;
  title: string;
  category: string | null;
  price: number;
  free: boolean;
};

const KEY = "wc:recently-viewed";
const MAX = 12;

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Drop this on a product page to record the visit. Renders nothing. */
export function RecentlyViewedTracker({ item }: { item: RecentItem }) {
  useEffect(() => {
    try {
      const list = [item, ...readRecent().filter((r) => r.route !== item.route)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* private mode / storage full - nothing to do */
    }
  }, [item]);
  return null;
}

/** Strip of the visitor's recently viewed templates (client-only, no fake data). */
export function RecentlyViewedStrip({ excludeRoute }: { excludeRoute?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    // Deferred so the client-only localStorage read never runs during hydration.
    const t = setTimeout(() => {
      setItems(readRecent().filter((r) => r.route !== excludeRoute).slice(0, 4));
    }, 0);
    return () => clearTimeout(t);
  }, [excludeRoute]);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Pick up where you left off</p>
      <h2 className="mt-2.5 text-xl font-semibold text-ink">Recently viewed</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((r) => (
          <Link
            key={r.route}
            href={`/workflows/${r.route}`}
            className="card card-hover group flex flex-col p-5"
          >
            {r.category && <div className="text-xs text-faint">{r.category}</div>}
            <h3 className="mt-1 line-clamp-2 font-sans text-sm font-semibold text-ink group-hover:text-white">
              {r.title}
            </h3>
            <div className="mt-3 flex flex-1 items-end gap-2 border-t border-white/[0.06] pt-3">
              {r.free ? (
                <span className="font-display font-semibold text-emerald-400">Free</span>
              ) : (
                <span className="font-display font-semibold tracking-tight text-ink">{inr(r.price)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
