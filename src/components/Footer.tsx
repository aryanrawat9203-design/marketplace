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
            The fastest way to discover n8n automation workflows — search 10,000+ templates by
            industry, tool, and use case.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li><Link href="/workflows" className="hover:text-zinc-100">All workflows</Link></li>
            <li><Link href="/#industries" className="hover:text-zinc-100">Industries</Link></li>
            <li><Link href="/#categories" className="hover:text-zinc-100">Categories</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li><Link href="/about" className="hover:text-zinc-100">About</Link></li>
            <li><Link href="/contact" className="hover:text-zinc-100">Contact</Link></li>
            <li><Link href="/faq" className="hover:text-zinc-100">FAQ</Link></li>
            <li><Link href="/privacy" className="hover:text-zinc-100">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-zinc-100">Terms</Link></li>
            <li><Link href="/refund" className="hover:text-zinc-100">Refund Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Note</h4>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            FlowDex is an independent directory. Workflows are created by their respective authors
            and hosted for free on n8n.io. FlowDex is not affiliated with or endorsed by n8n.
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-800/70 py-6 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} FlowDex. All rights reserved.
      </div>
    </footer>
  );
}
