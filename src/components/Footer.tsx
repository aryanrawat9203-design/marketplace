import Link from "next/link";
import NewsletterSignup from "./NewsletterSignup";
import Logo from "./Logo";

const shopLinks = [
  { href: "/workflows", label: "All templates" },
  { href: "/workflows?tier=Free", label: "Free templates" },
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
  { href: "/contact", label: "Contact support" },
];

const accountLinks = [
  { href: "/account", label: "My library" },
  { href: "/orders/lookup", label: "Re-download an order" },
  { href: "/cart", label: "Cart" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund", label: "Refund policy" },
];

/** Every claim here is one the product already makes good on elsewhere on the
 *  site — no invented certifications, badges or vanity metrics. */
const trustBadges: { label: string; icon: string }[] = [
  { label: "Instant download after payment", icon: "M12 3v12 M7 11l5 5 5-5 M5 21h14" },
  { label: "Secure Razorpay checkout", icon: "M3 11h18v11H3z M7 11V7a5 5 0 0 1 10 0v4" },
  { label: "7-day fix-or-refund guarantee", icon: "M9 12l2 2 4-4 M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { label: "Original, licensed templates", icon: "M4 4h11l5 5v11H4z M15 4v5h5" },
];

function TrustIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-emerald-400"
    >
      <path d={path} />
    </svg>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
        {title}
      </h4>
      {/* Block links with vertical padding rather than 18px-tall inline text:
          that lifts each one to a ~32px touch target without visibly changing
          the rhythm. They were previously well under the WCAG 2.2 minimum. */}
      <ul className="mt-3 space-y-0.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="-mx-2 block rounded-[var(--radius-md)] px-2 py-1.5 text-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
            >
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
    <footer className="mt-24 border-t border-hairline bg-surface-1">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-hairline px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Free templates in your inbox</h3>
          <p className="mt-1 text-sm text-muted">
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
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Original, ready-to-import n8n workflow templates &mdash; buy a single template or a whole
            category bundle and download instantly.
          </p>
          <ul className="mt-6 space-y-2.5">
            {trustBadges.map((b) => (
              <li key={b.label} className="flex items-center gap-2 text-xs text-faint">
                <TrustIcon path={b.icon} />
                {b.label}
              </li>
            ))}
          </ul>
        </div>
        <FooterCol title="Shop" links={shopLinks} />
        <FooterCol title="Learn" links={learnLinks} />
        <FooterCol title="Account" links={accountLinks} />
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-faint sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <span className="shrink-0">
            &copy; {new Date().getFullYear()} WorkflowCrate. All rights reserved.
          </span>
          <p className="max-w-xl leading-relaxed sm:text-right">
            All templates are original works created and owned by WorkflowCrate. Purchase grants a
            license to use and adapt them in your own projects. Built for n8n.
          </p>
        </div>
      </div>
    </footer>
  );
}
