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
 * in one place instead of inferred from 200 edits to a 29MB JSON file.
 *
 * Rules, in order:
 *   1. Beginner-weighted (60/40 against Intermediate). Beginners are who /free
 *      converts; an Expert template teaches them only that this is hard. The
 *      Beginner quota is deliberately close to the number of Beginner templates
 *      that exist - if the catalog gains more, the tier stays balanced without
 *      anyone retuning it.
 *   2. Honest titles only (see lib/title-honesty) - every platform a title names
 *      must actually be in the template's platform list. This is the check that
 *      keeps a workflow off the free tier when its title claims tools its node
 *      graph does not have.
 *   3. Capped per category, so /free reads as a tour of the catalog rather than
 *      a pile from one corner of it.
 *   4. Highest demand first inside those constraints, so the free tier is also
 *      the most searched-for work.
 */
import type { IndexItem } from "./catalog";
import { platformVocabulary, titleIsHonest, type PlatformVocabulary } from "./title-honesty";
import { priceFor, tierForPrice, type PriceInput } from "./price-model";

export const FREE_TIER_SIZE = 200;

const MIX = [
  { difficulty: "Beginner", take: 120, perCategory: 10 },
  { difficulty: "Intermediate", take: 80, perCategory: 5 },
] as const;

/** Internal IDs that leaked into titles, e.g. "... for Support Bots (07873)". */
const LEAKED_ID = /\(\s*\d{3,}\s*\)|\bWF\d{3,}\b/i;

/** The IDs of every template that should be free, derived from the catalog. */
export function selectFreeTier(index: IndexItem[]): Set<string> {
  const vocabulary = platformVocabulary(index);

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

/**
 * The paid tier a template returns to when it leaves the free selection.
 *
 * Deferred to the price model rather than restated here: this used to carry its
 * own 699/399/199/79 table, which meant a template that was once free came back
 * at a price nothing else on the site charged.
 */
function paidTierFor(w: PriceInput, vocabulary: PlatformVocabulary): { tier: string; price: number } {
  const price = priceFor(w, vocabulary);
  return { tier: tierForPrice(price), price };
}

type Priceable = PriceInput & {
  id: string;
  tier: string | null;
  price: number;
  mrp: number;
  off: number;
  free: boolean;
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
  // Only the paid-restore branch needs it, and that branch usually never runs.
  let vocabulary: PlatformVocabulary | undefined;
  for (const w of items) {
    if (freeIds.has(w.id)) {
      w.free = true;
      w.tier = "Free";
      w.price = 0;
      w.mrp = 0;
      w.off = 0;
    } else if (w.free) {
      vocabulary ??= platformVocabulary(items);
      const { tier, price } = paidTierFor(w, vocabulary);
      w.free = false;
      w.tier = tier;
      w.price = price;
      w.mrp = price;
      w.off = 0;
    }
  }
  return items;
}
