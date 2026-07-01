import { createAdminClient } from "./supabase/admin";
import type { Kind } from "./commerce";

export type OrderRecord = {
  razorpayOrderId?: string;
  razorpayPaymentId: string;
  email: string;
  itemKind: Kind;
  itemRef: string;
  itemTitle: string;
  amountPaise: number;
};

// Upserts on razorpay_payment_id so a Razorpay webhook retry never creates a
// duplicate row. No-ops silently if Supabase isn't configured.
export async function recordOrder(o: OrderRecord): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  try {
    const { error } = await admin.from("orders").upsert(
      {
        razorpay_order_id: o.razorpayOrderId,
        razorpay_payment_id: o.razorpayPaymentId,
        email: o.email,
        item_kind: o.itemKind,
        item_ref: o.itemRef,
        item_title: o.itemTitle,
        amount_paise: o.amountPaise,
      },
      { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
    );
    if (error) console.error("orders: upsert failed", error);
  } catch (err) {
    console.error("orders: upsert threw", err);
  }
}

export type OrderLookupResult = {
  kind: Kind;
  ref: string;
  itemTitle: string;
};

// Finds a paid order by email + Razorpay order id (both must match).
export async function findOrder(
  email: string,
  razorpayOrderId: string
): Promise<OrderLookupResult | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("orders")
    .select("item_kind, item_ref, item_title")
    .eq("email", email)
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return { kind: data.item_kind as Kind, ref: data.item_ref as string, itemTitle: data.item_title as string };
}
