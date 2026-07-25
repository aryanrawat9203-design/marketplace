import Link from "next/link";
import NewsletterSignup from "./NewsletterSignup";
import Logo from "./Logo";

const shopLinks = [
  { href: "/workflows", label: "All templates" },
  { href: "/collections", label: "Curated collections" },
  { href: "/integrations", label: "By integration" },
  { href: "/bundles", label: "Bundles & pricing" },
  { href: "/practice-bundles", label: "Practice bundles" },
  { href: "/workflows?sort=demand", label: "Most popular" },
  { href: "/custom", label: "Custom workflows" },
];

const learnLinks = [
  { href: "/guides", label: "Guides" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const accountLinks = [
  { href: "/account", label: "My library" },
  { href: "/orders/lookup", label: "Re-download an order" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund", label: "Refund policy" },
];

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="transition-colors hover:text-zinc-100">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.07] bg-[#08080d]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-white/[0.06] px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Free templates in your inbox</h3>
          <p className="mt-1 text-sm text-zinc-500">
            New free workflows and bundle deals, straight from the makers. No spam, unsubscribe anytime.
          </p>
        </div>
        <NewsletterSignup />
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-block" aria-label="WorkflowCrate home">
            <Logo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
            Original, ready-to-import n8n workflow templates &mdash; buy a single template or a whole
            category bundle and download instantly.
          </p>
          <p className="mt-5 max-w-xs text-xs leading-relaxed text-zinc-600">
            All templates are original works created and owned by WorkflowCrate. Purchase grants a
            license to use and adapt them in your own projects. Built for n8n.
          </p>
        </div>
        <FooterCol title="Shop" links={shopLinks} />
        <FooterCol title="Learn" links={learnLinks} />
        <FooterCol title="Account" links={accountLinks} />
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-600 sm:flex-row sm:px-6">
          <span>&copy; {new Date().getFullYear()} WorkflowCrate. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure payments by Razorpay
          </span>
        </div>
      </div>
    </footer>
  );
}
