"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SearchBar } from "./Controls";
import { isActiveNavLink, navLinkClassName } from "./NavLinks";
import { useAuth } from "./AuthProvider";

export default function MobileMenu({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // While the menu is open: close on Escape, and lock background scroll so the
  // page can't slide around behind the backdrop. Both are torn down on close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="relative z-30 grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-body transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        {open ? (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        ) : (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Tap-anywhere-outside to dismiss. The header's `backdrop-blur`
              makes it the containing block for `fixed` children, so this is
              anchored from the header's bottom (`top-full`) and sized by height
              rather than pinned to the viewport bottom — otherwise it collapses
              to zero height inside the 64px header box. Sits under the panel
              (z-20 < z-30); starts below the header row so the logo and this
              button stay live. */}
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-x-0 top-full z-20 h-[100dvh] bg-black/55 backdrop-blur-[1px]"
          />
          {/* `top-full`, not a fixed `top-16`: the header row condenses on scroll,
              and a hard-coded offset would leave a gap once it does. */}
          <div className="anim-rise absolute inset-x-0 top-full z-30 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-hairline bg-surface-2 px-4 py-4 shadow-2xl shadow-black/60 [animation-duration:250ms] sm:px-6">
            <Suspense fallback={<div className="h-10" />}>
              <SearchBar />
            </Suspense>
            <nav className="mt-4 flex flex-col gap-1 text-sm text-body">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  aria-current={isActiveNavLink(pathname, l.href) ? "page" : undefined}
                  className={navLinkClassName(pathname, l.href)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            {user && (
              <div className="mt-3 border-t border-hairline pt-3">
                <p className="px-3 pb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                  Account
                </p>
                <nav className="flex flex-col gap-1 text-sm text-body">
                  <Link
                    href="/account"
                    onClick={close}
                    aria-current={isActiveNavLink(pathname, "/account") ? "page" : undefined}
                    className={navLinkClassName(pathname, "/account")}
                  >
                    My library
                  </Link>
                  <Link
                    href="/orders/lookup"
                    onClick={close}
                    aria-current={isActiveNavLink(pathname, "/orders/lookup") ? "page" : undefined}
                    className={navLinkClassName(pathname, "/orders/lookup")}
                  >
                    Re-download an order
                  </Link>
                </nav>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
