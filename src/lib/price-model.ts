/**
 * What a template costs.
 *
 * Price is a *rule over the catalog*, not a number stored next to each record -
 * the same shape as lib/free-tier.ts, and for the same reason. The prices that
 * shipped before this were written into catalog.json one record at a time, and
 * once 10,489 of them existed nobody could answer "why is this one 199 and that
 * one 399?" without diffing two JSON blobs. Nothing enforced that a 30-node
 * Expert build outranked a 6-node Beginner one, and nothing ever would have.
 *
 * Deriving it means the answer is always the same four inputs, in one file:
 *
 *   difficulty - what the buyer has to understand to run it (40%)
 *   node count - how much was actually built (25%)
 *   value      - the catalog's own estimate of what it saves (20%)
 *   demand     - how many people are looking for it (15%)
 *
 * scaled by the commercial weight of the category, then dropped into one of
 * five price points. Five points, not a continuum: a catalog this size needs
 * prices a buyer can hold in their head, and ₹2,499 reads as a considered
 * price where ₹2,473 reads as a machine's.
 *
 * `price`/`mrp`/`off` in catalog.json are dead fields - they are overwritten on
 * every boot by applyPriceModel and are not worth rewriting on disk.
 */
import {
  platformVocabulary,
  titleIsHonest,
  type PlatformVocabulary,
  type Titled,
} from "./title-honesty";

export type PriceInput = Titled & {
  category: string | null;
  difficulty: string | null;
  totalNodes: number;
  value: number | null;
  demand: number | null;
};

const DIFFICULTY_PTS: Record<string, number> = {
  Beginner: 10,
  Intermediate: 35,
  Advanced: 65,
  Expert: 90,
};
const DEFAULT_DIFFICULTY_PTS = 35;

// Node counts, value and demand all sit in narrow, known ranges in the catalog
// (5-34 nodes, value 60-96, demand 58-95). Normalising against those ranges
// rather than against 0-100 is what stops every template scoring within a few
// points of every other one and collapsing into a single band.
const NODES_MIN = 5;
const NODES_SPAN = 29;
const VALUE_MIN = 60;
const VALUE_SPAN = 36;
const DEMAND_MIN = 58;
const DEMAND_SPAN = 37;

/**
 * Categories where the same amount of engineering is worth more (or less) to
 * the buyer. A lead-gen workflow that books one extra meeting has paid for
 * itself; a notification relay of identical complexity has not.
 */
const CATEGORY_MULTIPLIER: Record<string, number> = {
  "Lead Generation": 1.15,
  "CRM Automation": 1.15,
  "E-commerce Automation": 1.15,
  "Finance & Accounting": 1.15,
  "Trading & Crypto Automation": 1.15,
  "HR & Recruitment": 1.15,
  "Customer Support Automation": 1.15,
  "Workflow Utility / Tooling": 0.9,
  "Notifications & Alerts": 0.9,
};

/** The five price points, cheapest first, with the score below which each applies. */
const BANDS: Array<{ below: number; price: number; tier: string }> = [
  { below: 30, price: 499, tier: "Starter" },
  { below: 50, price: 1299, tier: "Core" },
  { below: 65, price: 2499, tier: "Professional" },
  { below: 80, price: 3999, tier: "Premium" },
  { below: Infinity, price: 6999, tier: "Enterprise" },
];

export const PRICE_POINTS: readonly number[] = BANDS.map((b) => b.price);

/**
 * The most a template may cost when its title names a tool its node graph does
 * not contain. Such a title is the one defect that makes the buyer's judgement
 * about what they are buying wrong, so it is capped at the middle band rather
 * than trusted with a top price.
 */
export const HONESTY_CAP = 2499;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 0-100. Higher means more of everything a buyer is paying for. */
export function priceScore(item: PriceInput): number {
  const difficultyPts = DIFFICULTY_PTS[item.difficulty ?? ""] ?? DEFAULT_DIFFICULTY_PTS;
  // A stale catalog-index.json (rebuilt by scripts/build-catalog-index.mjs)
  // would otherwise turn a missing node count into NaN and price silently.
  const nodes = Number.isFinite(item.totalNodes) ? item.totalNodes : NODES_MIN;
  const nodePts = clamp(((nodes - NODES_MIN) / NODES_SPAN) * 100, 0, 100);
  const valuePts = clamp((((item.value ?? VALUE_MIN) - VALUE_MIN) / VALUE_SPAN) * 100, 0, 100);
  const demandPts = clamp((((item.demand ?? DEMAND_MIN) - DEMAND_MIN) / DEMAND_SPAN) * 100, 0, 100);

  const base = 0.4 * difficultyPts + 0.25 * nodePts + 0.2 * valuePts + 0.15 * demandPts;
  const multiplier = CATEGORY_MULTIPLIER[item.category ?? ""] ?? 1;
  return clamp(base * multiplier, 0, 100);
}

function bandFor(score: number): { price: number; tier: string } {
  return BANDS.find((b) => score < b.below) ?? BANDS[BANDS.length - 1];
}

/** The tier label that goes with a price point. */
export function tierForPrice(price: number): string {
  return BANDS.find((b) => b.price === price)?.tier ?? BANDS[0].tier;
}

/**
 * What one template costs, in whole rupees.
 *
 * Pass `vocabulary` (from lib/title-honesty) to apply the honesty cap; without
 * it the band price is returned uncapped, because the check needs the whole
 * catalog's platform names to mean anything.
 */
export function priceFor(item: PriceInput, vocabulary?: PlatformVocabulary): number {
  const { price } = bandFor(priceScore(item));
  if (vocabulary && price > HONESTY_CAP && !titleIsHonest(item, vocabulary)) return HONESTY_CAP;
  return price;
}

type Priceable = PriceInput & {
  tier: string | null;
  price: number;
  mrp: number;
  off: number;
};

/**
 * Rewrites `price`/`mrp`/`off`/`tier` in place from the rule above.
 *
 * Applied once per record set at catalog load, before the free tier, so that
 * every surface - cards, product pages, bundle maths, the cart, the Razorpay
 * order the server signs - reads the same number. `mrp` is set equal to `price`
 * and `off` to 0 deliberately: there is no reference price these were ever sold
 * above, and printing one there would be an invented discount.
 */
export function applyPriceModel<T extends Priceable>(items: T[]): T[] {
  const vocabulary = platformVocabulary(items);
  for (const w of items) {
    const price = priceFor(w, vocabulary);
    w.price = price;
    w.mrp = price;
    w.off = 0;
    w.tier = tierForPrice(price);
  }
  return items;
}
