"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

/**
 * The homepage "See exactly what you get" section, as an interactive product
 * tour rather than a long dump of raw screenshots.
 *
 * One template's gallery images are shown one at a time inside a framed
 * "product preview": the visitor picks which aspect to see (overview, node
 * docs, error handling, credentials, …) from a rail of tabs. This keeps every
 * screenshot large and legible, ties the images to a clear narrative, and —
 * crucially on mobile — collapses what used to be ten stacked full-width
 * images into a single swappable panel, so the page stops feeling endless.
 *
 * Server-rendered content (the SectionHeader and the first frame) stays visible
 * with no JS; the tabs are pure client interaction layered on top.
 */

type Card = {
  slot: string;
  src: string;
  title: string;
  desc: string;
  w: number;
  h: number;
};

// Short tab label + a simple line icon per gallery slot. Falls back to the
// card's own title and a generic icon for any slot not listed here.
const TAB: Record<string, { label: string; icon: string }> = {
  overview: { label: "Overview", icon: "M3 4h18v16H3z M3 9h18 M9 21V9" },
  nodeDetail: { label: "Node docs", icon: "M6 2h9l5 5v15H6z M15 2v5h5 M9 13h6 M9 16h4" },
  capabilities: {
    label: "Error handling",
    icon: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
  },
  dataQuality: {
    label: "Data quality",
    icon: "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  },
  customize: {
    label: "Customize",
    icon: "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
  },
  designDecisions: {
    label: "Design notes",
    icon: "M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7c.6.5 1 .9 1 1.8v.5h6v-.5c0-.9.4-1.3 1-1.8A7 7 0 0 0 12 2z",
  },
  practice: {
    label: "Practice",
    icon: "M22 10 12 5 2 10l10 5 10-5z M6 12v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5",
  },
  plainEnglish: { label: "Plain English", icon: "M4 6h16 M4 12h16 M4 18h10" },
  credentials: {
    label: "Credentials",
    icon: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2",
  },
  troubleshooting: {
    label: "Troubleshooting",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4.9 4.9l2.9 2.9 M16.2 16.2l2.9 2.9 M19.1 4.9l-2.9 2.9 M7.8 16.2l-2.9 2.9",
  },
};

const GENERIC_ICON = "M4 5h16v14H4z M4 9h16";

function TabIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}

export default function ShowcaseTabs({
  route,
  cards,
}: {
  route: string;
  templateTitle: string;
  cards: Card[];
}) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = useCallback((i: number) => {
    const n = tabRefs.current.length;
    const next = (i + n) % n;
    setActive(next);
    tabRefs.current[next]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, i: number) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        focusTab(i + 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        focusTab(i - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusTab(0);
      } else if (e.key === "End") {
        e.preventDefault();
        focusTab(cards.length - 1);
      }
    },
    [cards.length, focusTab]
  );

  const current = cards[active] ?? cards[0];
  const meta = (slot: string) => TAB[slot] ?? { label: "", icon: GENERIC_ICON };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-6">
      {/* Tab rail: a horizontal snap-scroller on mobile, a vertical list on lg+ */}
      <div
        role="tablist"
        aria-label="What each template includes"
        aria-orientation="horizontal"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {cards.map((c, i) => {
          const selected = i === active;
          const m = meta(c.slot);
          return (
            <button
              key={c.slot}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`showcase-tab-${c.slot}`}
              aria-selected={selected}
              aria-controls="showcase-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`group flex shrink-0 items-center gap-3 rounded-[var(--radius-lg)] border px-3.5 py-2.5 text-left transition-colors lg:w-full ${
                selected
                  ? "border-violet-500/40 bg-violet-500/[0.12] text-ink"
                  : "border-hairline bg-white/[0.02] text-muted hover:border-hairline-strong hover:bg-white/[0.05] hover:text-body"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors ${
                  selected
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                    : "border-hairline bg-white/[0.03] text-faint group-hover:text-muted"
                }`}
              >
                <TabIcon path={m.icon} />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-sm font-medium lg:whitespace-normal">
                  {m.label || c.title}
                </span>
                <span className="hidden truncate text-xs text-faint lg:block">{c.title}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Framed preview of the active image. Re-keyed on change so the entrance
          animation replays; the frame's aspect is fluid via object-contain, so
          wide overview shots and tall doc cards both sit undistorted. */}
      <div
        role="tabpanel"
        id="showcase-panel"
        aria-labelledby={`showcase-tab-${current.slot}`}
        className="min-w-0"
      >
        <Link
          href={`/workflows/${route}`}
          aria-label={`Open the ${current.title} — full template`}
          className="card card-hover group block overflow-hidden"
        >
          {/* faux window chrome */}
          <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-4 py-2.5">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </span>
            <span className="ml-1 truncate font-mono text-xs text-faint">{current.title}</span>
            <span className="ml-auto hidden text-xs text-violet-300 opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
              Open template &rarr;
            </span>
          </div>
          <div
            key={current.slot}
            className="anim-rise flex min-h-[300px] items-center justify-center bg-surface-1 p-3 [animation-duration:400ms] sm:min-h-[380px] sm:p-5 lg:min-h-[460px]"
          >
            <Image
              src={current.src}
              alt={current.title}
              width={current.w}
              height={current.h}
              sizes="(min-width: 1024px) 720px, 100vw"
              className="h-auto max-h-[520px] w-auto max-w-full rounded-md object-contain"
            />
          </div>
          <div className="border-t border-hairline p-4 sm:p-5">
            <h3 className="font-sans text-base font-semibold text-ink">{current.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{current.desc}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
