import Link from "next/link";
import NewsletterSignup from "./NewsletterSignup";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-zinc-800/70 bg-[#08080c]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-semibold text-zinc-100">Free templates in your inbox</h3>
          <p className="mt-1 text-sm text-zinc-500">
            New free workflows and bundle deals, straight from the makers. No spam, unsubscribe anytime.
          </p>
        </div>
        <NewsletterSignup />
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              W
            </span>
            <span className="text-zinc-100">
              Workflow<span className="text-indigo-400">Crate</span>
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
            <li><Link href="/integrations" className="hover:text-zinc-100">By integration</Link></li>
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
            <li><Link href="/account" className="hover:text-zinc-100">My library</Link></li>
            <li><Link href="/orders/lookup" className="hover:text-zinc-100">Re-download an order</Link></li>
            <li><Link href="/privacy" className="hover:text-zinc-100">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-zinc-100">Terms</Link></li>
            <li><Link href="/refund" className="hover:text-zinc-100">Refund Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">License</h4>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            All templates are original works created and owned by WorkflowCrate. Purchase grants a license
            to use and adapt them in your own projects. Built for n8n.
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-800/70 py-6 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} WorkflowCrate. All rights reserved.
      </div>
    </footer>
  );
}
