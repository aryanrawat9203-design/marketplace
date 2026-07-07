"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

const ACTIVE_CLASS =
  "rounded-lg bg-violet-500/15 px-3 py-2 font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 hover:text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500";
const INACTIVE_CLASS =
  "rounded-lg px-3 py-2 hover:bg-zinc-800/60 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500";

// A link is "active" when the current route is that section or a page
// within it (e.g. /workflows/[route] keeps "Browse" active), not just on an
// exact match - the standard pattern on most sites' primary nav.
export function isActiveNavLink(pathname: string, href: string): boolean {
  const path = href.split("#")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function navLinkClassName(pathname: string, href: string): string {
  return isActiveNavLink(pathname, href) ? ACTIVE_CLASS : INACTIVE_CLASS;
}

export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = isActiveNavLink(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={navLinkClassName(pathname, l.href)}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
