import { inr } from "@/lib/pricing";

type Size = "sm" | "md" | "lg";

const sale: Record<Size, string> = {
  sm: "font-display text-base font-bold tracking-tight",
  md: "font-display text-2xl font-bold tracking-tight",
  lg: "font-display text-4xl font-bold tracking-tight",
};

// mrp/off are accepted so callers don't need conditional prop-dropping, but
// are intentionally unused: a struck-through reference price that was never
// actually charged is a misleading-advertisement pattern, not a discount.
export default function PriceTag({
  price,
  free,
  size = "sm",
}: {
  price: number;
  mrp?: number;
  off?: number;
  free: boolean;
  size?: Size;
}) {
  if (free) {
    return <span className={`${sale[size]} text-emerald-400`}>Free</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${sale[size]} text-ink`}>{inr(price)}</span>
    </span>
  );
}
