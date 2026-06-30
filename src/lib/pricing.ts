// Pricing display helpers. All amounts are whole INR rupees.

const inrFmt = new Intl.NumberFormat("en-IN");
const RUPEE = String.fromCharCode(0x20b9); // INR rupee sign, kept out of source bytes

/** Format a rupee amount, e.g. 14999 -> rupee + "14,999" (Indian grouping). */
export function inr(n: number): string {
  return RUPEE + inrFmt.format(Math.round(n));
}

/** Discount percentage from original (mrp) and sale price. */
export function discountPct(mrp: number, price: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round((1 - price / mrp) * 100);
}
