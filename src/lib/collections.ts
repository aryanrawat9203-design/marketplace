import { getIndex, type IndexItem } from "./catalog";

// Curated collections: opinionated, themed starting points for a 10,501-item
// catalog. Members are selected by rules against the live catalog (same
// pattern as /guides) so lists never go stale, with a diversity cap so a
// collection isn't ten near-identical variants of one workflow. Buying is
// just "add all to cart" - no separate SKU, no new payment paths.

export type CollectionRule = {
  categories?: string[];
  platforms?: string[]; // item must use at least one
  difficulties?: string[];
};

export type Collection = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  gradient: string;
  size: number;
  rule: CollectionRule;
  /** "category" spreads picks across categories (for breadth-first packs). */
  diversityKey?: "subcategory" | "category";
};

const COLLECTIONS: Collection[] = [
  {
    slug: "ai-agency-starter-kit",
    name: "AI Agency Starter Kit",
    tagline: "The agent and chatbot workflows an automation agency deploys first.",
    description:
      "Ten high-demand AI agent and conversational workflows that cover the requests agencies hear most: assistants, summarizers, and chat-driven automations. Import them, swap in your client's credentials, and you have a service catalog on day one.",
    gradient: "from-violet-500 to-fuchsia-500",
    size: 10,
    rule: { categories: ["AI Agents", "Chatbots & Conversational AI"] },
  },
  {
    slug: "lead-gen-machine",
    name: "Lead Generation Machine",
    tagline: "Capture, enrich, and route leads without touching a spreadsheet.",
    description:
      "The most in-demand lead generation and CRM workflows in the catalog, combined into one pipeline-shaped pack: capture from forms and webhooks, enrich, score, and land every lead in your CRM automatically.",
    gradient: "from-emerald-500 to-teal-500",
    size: 10,
    rule: { categories: ["Lead Generation", "CRM Automation"] },
  },
  {
    slug: "inbox-zero",
    name: "Inbox Zero",
    tagline: "Gmail workflows that read, sort, summarize, and reply for you.",
    description:
      "Email automation templates built around Gmail: digests of long threads, auto-labelling, AI summaries, and follow-up automations. For anyone whose day starts and ends in the inbox.",
    gradient: "from-sky-500 to-indigo-500",
    size: 10,
    rule: { categories: ["Email Automation"], platforms: ["Gmail"] },
  },
  {
    slug: "content-engine",
    name: "Content Engine",
    tagline: "Generate, repurpose, and publish content on autopilot.",
    description:
      "Content generation, social publishing, and SEO workflows that turn one idea into a week of output: drafts, social posts, and optimized pages - produced and scheduled automatically.",
    gradient: "from-amber-500 to-rose-500",
    size: 12,
    rule: { categories: ["Content Generation", "Social Media Automation", "SEO Automation"] },
  },
  {
    slug: "ecommerce-ops-pack",
    name: "E-commerce Ops Pack",
    tagline: "Orders, inventory, and customer messages - handled while you sleep.",
    description:
      "E-commerce automation workflows for the operational grind: order processing, notifications, inventory updates, and customer communication that runs without you.",
    gradient: "from-rose-500 to-orange-500",
    size: 10,
    rule: { categories: ["E-commerce Automation"] },
  },
  {
    slug: "knowledge-base-rag",
    name: "Knowledge Base & RAG Pack",
    tagline: "Turn your documents into systems that answer questions.",
    description:
      "RAG and knowledge-base workflows: ingest documents, build searchable knowledge stores, and wire AI answers into the tools your team already uses.",
    gradient: "from-indigo-500 to-violet-500",
    size: 10,
    rule: { categories: ["RAG / Knowledge Base"] },
  },
  {
    slug: "support-command-center",
    name: "Support Command Center",
    tagline: "Triage, answer, and escalate customer requests automatically.",
    description:
      "Customer support, chatbot, and alerting workflows that take the first pass at every ticket: auto-triage, AI-drafted replies, and escalation alerts to the right channel.",
    gradient: "from-cyan-500 to-sky-500",
    size: 10,
    rule: {
      categories: [
        "Customer Support Automation",
        "Chatbots & Conversational AI",
        "Notifications & Alerts",
      ],
    },
  },
  {
    slug: "beginner-essentials",
    name: "Beginner Essentials",
    tagline: "Ten beginner-friendly wins from ten different corners of n8n.",
    description:
      "A breadth-first sampler of the catalog's most popular beginner-level workflows, one per area - email, leads, content, documents, and more. The fastest way to learn what n8n can do by running real automations.",
    gradient: "from-teal-500 to-emerald-500",
    size: 10,
    rule: { difficulties: ["Beginner"] },
    diversityKey: "category",
  },
];

export function getCollections(): Collection[] {
  return COLLECTIONS;
}

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

function matches(w: IndexItem, rule: CollectionRule): boolean {
  if (w.free || w.price <= 0) return false; // cart checkout is paid-only
  if (rule.categories && !(w.category && rule.categories.includes(w.category))) return false;
  if (rule.platforms && !rule.platforms.some((p) => w.platforms.includes(p))) return false;
  if (rule.difficulties && !(w.difficulty && rule.difficulties.includes(w.difficulty))) return false;
  return true;
}

// Titles in the catalog are formulaic, so two "different" subcategories can
// still yield near-identical picks. Key on the first words to spot them.
function titleKey(w: IndexItem): string {
  return w.title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");
}

// Top-demand picks with a per-group cap so one subcategory (or category)
// can't fill the whole collection, plus a near-duplicate-title guard.
// Both constraints relax if the pool is too small to fill the target size.
function pickDiverse(pool: IndexItem[], size: number, keyOf: (w: IndexItem) => string): IndexItem[] {
  const sorted = [...pool].sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0));
  for (const cap of [1, 2, 3, Number.POSITIVE_INFINITY]) {
    const strictTitles = cap !== Number.POSITIVE_INFINITY;
    const picked: IndexItem[] = [];
    const perKey = new Map<string, number>();
    const seenTitles = new Set<string>();
    for (const w of sorted) {
      const k = keyOf(w);
      const n = perKey.get(k) ?? 0;
      if (n >= cap) continue;
      const t = titleKey(w);
      if (strictTitles && seenTitles.has(t)) continue;
      perKey.set(k, n + 1);
      seenTitles.add(t);
      picked.push(w);
      if (picked.length === size) return picked;
    }
    if (cap === Number.POSITIVE_INFINITY || picked.length === size) return picked;
  }
  return [];
}

const g = globalThis as unknown as { __collectionMembers?: Map<string, IndexItem[]> };

export function collectionMembers(c: Collection): IndexItem[] {
  if (!g.__collectionMembers) g.__collectionMembers = new Map();
  const cached = g.__collectionMembers.get(c.slug);
  if (cached) return cached;

  const pool = getIndex().filter((w) => matches(w, c.rule));
  const keyOf =
    c.diversityKey === "category"
      ? (w: IndexItem) => w.category ?? "?"
      : (w: IndexItem) => `${w.category ?? "?"}/${w.subcategory ?? "?"}`;
  const members = pickDiverse(pool, c.size, keyOf);
  g.__collectionMembers.set(c.slug, members);
  return members;
}

export type CollectionStats = { count: number; price: number; mrp: number };

export function collectionStats(c: Collection): CollectionStats {
  const members = collectionMembers(c);
  return {
    count: members.length,
    price: members.reduce((s, w) => s + w.price, 0),
    mrp: members.reduce((s, w) => s + (w.mrp > w.price ? w.mrp : w.price), 0),
  };
}
