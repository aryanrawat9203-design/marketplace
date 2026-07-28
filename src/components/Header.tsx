import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./Controls";
import AuthStatus from "./AuthStatus";
import CartButton from "./CartButton";
import MobileMenu from "./MobileMenu";
import NavLinks from "./NavLinks";
import Logo from "./Logo";
import HeaderShell from "./HeaderShell";

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
    <HeaderShell>
      <Link
        href="/"
        aria-label="WorkflowCrate home"
        className="shrink-0 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        <Logo />
      </Link>
      <nav className="ml-2 hidden items-center gap-0.5 text-sm text-muted lg:flex">
        <NavLinks links={navLinks} />
      </nav>
      <div className="ml-auto hidden w-full max-w-xs lg:block">
        <Suspense fallback={<div className="h-10" />}>
          <SearchBar compact />
        </Suspense>
      </div>
      <div className="ml-auto lg:ml-0">
        <MobileMenu links={navLinks} />
      </div>
      <CartButton />
      <AuthStatus />
    </HeaderShell>
  );
}
