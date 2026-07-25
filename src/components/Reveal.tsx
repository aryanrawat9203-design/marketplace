"use client";

import { ReactNode, useEffect, useRef } from "react";

/**
 * Fades a section in on first scroll into view. Purely presentational and
 * JS-only: the server renders content fully visible, and this component only
 * applies the hidden `.reveal` state after mount — and only to elements still
 * below the viewport — so crawlers, no-JS visitors and above-the-fold content
 * are never hidden, and hydration markup matches exactly.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // Already on screen (or nearly) — animating it now would just flicker.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.classList.add("reveal");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
