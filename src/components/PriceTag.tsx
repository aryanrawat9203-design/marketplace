import { inr } from "@/lib/pricing";

type Size = "sm" | "md" | "lg";

const sale: Record<Size, string> = {
  sm: "text-base font-bold",
  md: "text-2xl font-bold",
  lg: "text-4xl font-extrabold",
};
const was: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
};

export default function PriceTag({
  price,
  mrp,
  off,
  free,
  size = "sm",
}: {
  price: number;
  mrp: number;
  off: number;
  free: boolean;
  size?: Size;
}) {
  if (free) {
    return <span className={`${sale[size]} text-emerald-400`}>Free</span>;
  }
  const showWas = mrp > price && off > 0;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${sale[size]} text-zinc-50`}>{inr(price)}</span>
      {showWas && (
        <>
          <span className={`${was[size]} text-zinc-500 line-through`}>{inr(mrp)}</span>
          <span
            className={`rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-300 ${
              size === "lg" ? "text-sm" : "text-[11px]"
            }`}
          >
            {off}% off
          </span>
        </>
      )}
    </span>
  );
}
