// Static knowledge the chatbot grounds its answers in - derived from the same
// data/policy pages the rest of the site already shows, kept as short factual
// bullets rather than full prose so it's cheap to include on every request.
// Extend this file (or the FAQ_ENTRIES list) to teach the bot new facts; no
// other code needs to change.

import { getTaxonomy } from "@/lib/catalog";

export type FaqEntry = { q: string; a: string };

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    q: "What am I buying?",
    a: "Original, ready-to-import n8n workflow templates built in-house. A single purchase gives the workflow's JSON file; a bundle gives a ZIP of all its templates.",
  },
  {
    q: "Is browsing free?",
    a: "Yes - searching and browsing the whole catalog is always free. A small set of templates are free to download; everything else is priced, starting from Rs49 for entry-level Starter workflows.",
  },
  {
    q: "How do I use a template after buying?",
    a: "In n8n: open Workflows, then the menu, then Import from File, and choose the downloaded JSON. Add your own credentials on the app nodes, then run it.",
  },
  {
    q: "Single template or bundle?",
    a: "Buy a single template for one specific automation. For several templates in the same area, a category or subcategory bundle costs far less per template - the Full Library bundle is the best overall value.",
  },
  {
    q: "How is pricing decided?",
    a: "Each template is priced by tier and complexity. Prices are discounted launch pricing and rise over time, so buying now locks in the lowest price.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Payments are handled by Razorpay - UPI (PhonePe, Google Pay), cards, netbanking, and wallets.",
  },
  {
    q: "Refund policy?",
    a: "Digital downloads are generally final once downloaded. If a file is faulty, won't import, or isn't as described, contact support within 7 days and they'll fix it or refund it. Free downloads carry no charge, so no refund applies.",
  },
  {
    q: "Can I resell templates?",
    a: "Buyers get a license to use and adapt templates in their own projects. Reselling or redistributing the template files themselves isn't permitted.",
  },
  {
    q: "How do I sign in / create an account?",
    a: "Sign in with Google or an email magic link (no password). Login is optional for browsing and is required at checkout so buyers can access their order history and downloads later.",
  },
  {
    q: "I lost my download link / can't find my order.",
    a: "Use the Orders lookup page (/orders/lookup) with the email used at checkout, or contact support with the order ID from the confirmation email.",
  },
  {
    q: "Do you offer custom workflow development?",
    a: "Yes - the /custom page has a request form for bespoke n8n automations; the team follows up with a quote based on scope, apps involved, and timeline.",
  },
];

export type SiteNavEntry = { path: string; label: string; description: string };

export const SITE_NAV: SiteNavEntry[] = [
  { path: "/workflows", label: "Browse", description: "Search and filter the full template catalog" },
  { path: "/collections", label: "Collections", description: "Curated groups of templates by theme" },
  { path: "/integrations", label: "Integrations", description: "Templates grouped by app/platform (Slack, Gmail, etc.)" },
  { path: "/bundles", label: "Bundles", description: "Category, subcategory, full-library, and lifetime bundles" },
  { path: "/bundles#pricing", label: "Pricing", description: "Bundle pricing tiers" },
  { path: "/guides", label: "Guides", description: "How-to articles on using n8n and the templates" },
  { path: "/faq", label: "FAQ", description: "Frequently asked questions" },
  { path: "/contact", label: "Contact", description: "Reach human support" },
  { path: "/custom", label: "Custom requests", description: "Request a bespoke workflow build" },
  { path: "/orders/lookup", label: "Order lookup", description: "Find past orders/downloads by email" },
  { path: "/account", label: "Account", description: "Signed-in user's order history" },
  { path: "/refund", label: "Refund policy", description: "Full refund policy text" },
];

// Builds the static knowledge block included in every chatbot request.
// Cheap to compute (reads the same in-memory taxonomy cache the rest of the
// site uses) so it can be called per-request without a caching layer.
export function buildKnowledgeBaseSummary(): string {
  const taxo = getTaxonomy();
  const topCategories = taxo.categories
    .slice(0, 12)
    .map((c) => `${c.name} (${c.count})`)
    .join(", ");

  const faqBlock = FAQ_ENTRIES.map((e) => `Q: ${e.q}\nA: ${e.a}`).join("\n\n");
  const navBlock = SITE_NAV.map((n) => `${n.path} - ${n.label}: ${n.description}`).join("\n");

  return [
    `Catalog size: ${taxo.total} templates across ${taxo.categories.length} categories.`,
    `Top categories: ${topCategories}.`,
    `Site navigation:\n${navBlock}`,
    `Support email: ${process.env.SUPPORT_EMAIL || "the address on /contact"}`,
    `FAQ:\n${faqBlock}`,
  ].join("\n\n");
}
