/**
 * Which templates are permanently free.
 *
 * This used to be 10 hand-flipped `free` booleans inside catalog.json - 0.1% of
 * the catalog, against a growth plan that called for 100-200 - and the ten were
 * badly chosen: one Beginner, six Intermediate, two Advanced and one Expert, on
 * a page that promises a ladder "from beginner to expert". /free is the top of
 * the entire funnel and nothing was maintaining it.
 *
 * Expressing the tier as a *rule* over the catalog rather than as scattered
 * flags means it cannot silently rot again: the selection is re-derived on every
 * boot, it stays balanced as the catalog grows, and the criteria are reviewable
 * in one place instead of inferred from 120 edits to a 29MB JSON file.
 *
 * Rules, in order:
 *   1. Beginner-weighted (75/25 against Intermediate). Beginners are who /free
 *      converts; an Expert template teaches them only that this is hard.
 *   2. Honest titles only - every platform a title names must actually be in the
 *      template's platform list. This is the check that keeps a workflow off the
 *      free tier when its title claims tools its node graph does not have.
 *   3. Capped per category, so /free reads as a tour of the catalog rather than
 *      a pile from one corner of it.
 *   4. Highest demand first inside those constraints, so the free tier is also
 *      the most searched-for work.
 */
import type { IndexItem } from "./catalog";

export const FREE_TIER_SIZE = 120;

const MIX = [
  { difficulty: "Beginner", take: 90, perCategory: 7 },
  { difficulty: "Intermediate", take: 30, perCategory: 3 },
] as const;

/** Internal IDs that leaked into titles, e.g. "... for Support Bots (07873)". */
const LEAKED_ID = /\(\s*\d{3,}\s*\)|\bWF\d{3,}\b/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when every platform the title names is genuinely in the node graph.
 * The vocabulary is built from the catalog itself, so it can never drift from
 * what the templates actually contain.
 */
function titleIsHonest(w: IndexItem, vocabulary: Map<string, RegExp>): boolean {
  const title = w.title.toLowerCase();
  const own = new Set(w.platforms.map((p) => p.toLowerCase()));
  for (const [name, re] of vocabulary) {
    if (!own.has(name) && re.test(title)) return false;
  }
  return true;
}

/** The IDs of every template that should be free, derived from the catalog. */
export function selectFreeTier(index: IndexItem[]): Set<string> {
  const vocabulary = new Map<string, RegExp>();
  for (const w of index) {
    for (const p of w.platforms) {
      const name = p.toLowerCase();
      if (!vocabulary.has(name)) {
        vocabulary.set(name, new RegExp(`(^|[^a-z0-9])${escapeRe(name)}([^a-z0-9]|$)`));
      }
    }
  }

  const chosen = new Set<string>();
  for (const { difficulty, take, perCategory } of MIX) {
    const pool = index
      .filter(
        (w) =>
          w.difficulty === difficulty &&
          !!w.category &&
          !LEAKED_ID.test(w.title) &&
          titleIsHonest(w, vocabulary),
      )
      .sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0) || a.id.localeCompare(b.id));

    const perCat = new Map<string, number>();
    let n = 0;
    for (const w of pool) {
      if (n >= take) break;
      const category = w.category as string;
      const used = perCat.get(category) ?? 0;
      if (used >= perCategory) continue;
      perCat.set(category, used + 1);
      chosen.add(w.id);
      n++;
    }
    // If the per-category caps left the quota short, relax them rather than
    // ship a thinner free tier than intended.
    for (const w of pool) {
      if (n >= take) break;
      if (chosen.has(w.id)) continue;
      chosen.add(w.id);
      n++;
    }
  }
  return chosen;
}

/** The paid tier a template returns to when it leaves the free selection. */
function paidTierFor(value: number | null): { tier: string; price: number } {
  const v = value ?? 50;
  if (v >= 85) return { tier: "Enterprise", price: 699 };
  if (v >= 70) return { tier: "Premium", price: 399 };
  if (v >= 50) return { tier: "Professional", price: 199 };
  return { tier: "Starter", price: 79 };
}

type Priceable = {
  id: string;
  tier: string | null;
  price: number;
  mrp: number;
  off: number;
  free: boolean;
  value: number | null;
};

/**
 * Rewrites `free`/`tier`/`price`/`mrp` in place to match the selection.
 *
 * Applied once, at catalog load, so every surface that reads a template -
 * cards, product pages, checkout, the download authoriser, the starter-pack ZIP
 * - agrees about what is free. A template that is free on the listing and
 * chargeable at checkout is the worst possible version of this bug, and doing
 * the rewrite in exactly one place is what rules it out.
 */
export function applyFreeTier<T extends Priceable>(items: T[], freeIds: Set<string>): T[] {
  for (const w of items) {
    if (freeIds.has(w.id)) {
      w.free = true;
      w.tier = "Free";
      w.price = 0;
      w.mrp = 0;
      w.off = 0;
    } else if (w.free) {
      const { tier, price } = paidTierFor(w.value);
      w.free = false;
      w.tier = tier;
      w.price = price;
      w.mrp = price;
      w.off = 0;
    }
  }
  return items;
}
