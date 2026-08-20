import Link from "next/link";
import type { ReactNode } from "react";
import type { BundleUpsell } from "@/lib/cart-upsell";
import { inr } from "@/lib/pricing";

const fmt = (n: number) => n.toLocaleString("en-IN");

/**
 * The two numbers and the difference between them. Nothing else.
 *
 * No countdown, no "limited time", no struck-through total: the bundle is
 * cheaper today and will be cheaper tomorrow, and saying so plainly is both
 * true and the only version of this that survives being read twice.
 */
export default function BundleUpsellNote({
  upsell,
  totalLabel,
  children,
}: {
  upsell: BundleUpsell;
  /** What the summed side is called here - "Your cart", "These 10 individually". */
  totalLabel: string;
  /** Actions, if this surface has any. */
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
      <p className="font-medium text-ink">
        All {fmt(upsell.itemCount)} of these are in the{" "}
        <Link href={`/bundles/${upsell.slug}`} className="underline decoration-emerald-400/40 underline-offset-4 hover:text-white">
          {upsell.shortName}
        </Link>{" "}
        bundle.
      </p>
      <p className="mt-1.5 text-sm text-body">
        Bundle: <span className="font-display font-semibold tracking-tight text-ink">{inr(upsell.bundlePrice)}</span>
        {" · "}
        {totalLabel}: <span className="font-display font-semibold tracking-tight text-ink">{inr(upsell.cartTotal)}</span>
        {" · "}
        <span className="font-medium text-emerald-300">You save {inr(upsell.saving)}</span>
        {upsell.extraTemplates > 0 && (
          <> &mdash; and you get {fmt(upsell.extraTemplates)} more templates.</>
        )}
      </p>
      {children && <div className="mt-4 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
