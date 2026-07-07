import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./Controls";
import AuthStatus from "./AuthStatus";
import CartButton from "./CartButton";
import MobileMenu from "./MobileMenu";
import NavLinks from "./NavLinks";

const navLinks = [
  { href: "/workflows", label: "Browse" },
  { href: "/collections", label: "Collections" },
  { href: "/integrations", label: "Integrations" },
  { href: "/bundles", label: "Bundles" },
  { href: "/practice-bundles", label: "Practice" },
  { href: "/bundles#pricing", label: "Pricing" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-[#07070b]/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
          >
            W
          </span>
          <span className="text-zinc-100">
            Workflow<span className="text-indigo-400">Crate</span>
          </span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 text-sm text-zinc-400 md:flex">
          <NavLinks links={navLinks} />
        </nav>
        <div className="ml-auto hidden w-full max-w-xs md:block">
          <Suspense fallback={<div className="h-10" />}>
            <SearchBar compact />
          </Suspense>
        </div>
        <div className="ml-auto md:ml-0">
          <MobileMenu links={navLinks} />
        </div>
        <CartButton />
        <AuthStatus />
      </div>
    </header>
  );
}
