"use client";

import { ReactNode, useEffect, useRef } from "react";

/**
 * Wraps the hero graph and nudges it a few pixels toward the cursor — a quiet
 * parallax that makes the backdrop feel three-dimensional without ever moving
 * on its own. It only engages on hover-capable, fine pointers (so touch devices
 * get the calm CSS drift instead) and bows out entirely under reduced motion.
 *
 * The listener is passive and rAF-coalesced, and it only writes two CSS custom
 * properties — `--hero-mx` / `--hero-my` — which `.hero-parallax` turns into a
 * GPU `translate3d`. No React re-renders, no layout reads, no work at all until
 * the pointer actually moves.
 */
export default function HeroParallaxLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.matchMedia !== "function") return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;

    function apply() {
      raf = 0;
      el!.style.setProperty("--hero-mx", `${tx.toFixed(1)}px`);
      el!.style.setProperty("--hero-my", `${ty.toFixed(1)}px`);
    }

    function onMove(e: PointerEvent) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      // Gentle: full deflection is ±16px horizontally, ±10px vertically.
      tx = ((e.clientX - cx) / cx) * 16;
      ty = ((e.clientY - cy) / cy) * 10;
      if (!raf) raf = requestAnimationFrame(apply);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="hero-parallax absolute inset-0">
      {children}
    </div>
  );
}
