import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-zinc-800/70 bg-[#08080c]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              F
            </span>
            <span className="text-zinc-100">
              Flow<span className="text-violet-400">Dex</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-zinc-500">
            Original, ready-to-import n8n workflow templates &mdash; buy a single template or a whole
            category bundle and download instantly.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li><Link href="/workflows" className="hover:text-zinc-100">All templates</Link></li>
            <li><Link href="/bundles" className="hover:text-zinc-100">Bundles &amp; pricing</Link></li>
            <li><Link href="/workflows?sort=demand" className="hover:text-zinc-100">Most popular</Link></li>
            <li><Link href="/guides" className="hover:text-zinc-100">Guides</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li><Link href="/about" className="hover:text-zinc-100">About</Link></li>
            <li><Link href="/contact" className="hover:text-zinc-100">Contact</Link></li>
            <li><Link href="/faq" className="hover:text-zinc-100">FAQ</Link></li>
            <li><Link href="/orders/lookup" className="hover:text-zinc-100">Re-download an order</Link></li>
            <li><Link href="/privacy" className="hover:text-zinc-100">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-zinc-100">Terms</Link></li>
            <li><Link href="/refund" className="hover:text-zinc-100">Refund Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">License</h4>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            All templates are original works created and owned by FlowDex. Purchase grants a license
            to use and adapt them in your own projects. Built for n8n.
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-800/70 py-6 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} FlowDex. All rights reserved.
      </div>
    </footer>
  );
}
