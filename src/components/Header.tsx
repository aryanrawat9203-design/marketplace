import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./Controls";
import AuthStatus from "./AuthStatus";
import CartButton from "./CartButton";
import MobileMenu from "./MobileMenu";
import NavLinks from "./NavLinks";
import Logo from "./Logo";

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
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#07070c]/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="WorkflowCrate home"
          className="shrink-0 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <Logo />
        </Link>
        <nav className="ml-2 hidden items-center gap-0.5 text-sm text-zinc-400 md:flex">
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
