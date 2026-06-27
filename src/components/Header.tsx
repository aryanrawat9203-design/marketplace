import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "./Controls";

const navLinks = [
  { href: "/workflows", label: "Browse" },
  { href: "/#industries", label: "Industries" },
  { href: "/#categories", label: "Categories" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-[#07070b]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
            F
          </span>
          <span className="text-zinc-100">
            Flow<span className="text-violet-400">Dex</span>
          </span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 text-sm text-zinc-400 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 hover:bg-zinc-800/60 hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/shop"
            className="rounded-lg px-3 py-2 font-medium text-violet-300 hover:bg-zinc-800/60 hover:text-violet-200"
          >
            Shop
          </Link>
        </nav>
        <div className="ml-auto hidden w-full max-w-xs sm:block">
          <Suspense fallback={<div className="h-10" />}>
            <SearchBar compact />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
