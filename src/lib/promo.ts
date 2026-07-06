import { createAdminClient } from "./supabase/admin";

export type PromoValidation =
  | { ok: true; code: string; discountPercent: number }
  | {
      ok: false;
      reason: "not_found" | "inactive" | "expired" | "exhausted" | "already_used" | "unavailable";
    };

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

// Friends-code guardrails: active flag, optional expiry, optional redemption
// cap, and (when we know the buyer's email) one paid redemption per person -
// so a single leaked code can't be reused indefinitely by the same buyer.
export async function validatePromoCode(rawCode: string, email?: string): Promise<PromoValidation> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, reason: "unavailable" };

  const code = normalize(rawCode);
  if (!code) return { ok: false, reason: "not_found" };

  const { data, error } = await admin
    .from("promo_codes")
    .select("code, discount_percent, active, max_redemptions, redemption_count, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "not_found" };
  if (!data.active) return { ok: false, reason: "inactive" };
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (
    data.max_redemptions != null &&
    (data.redemption_count as number) >= (data.max_redemptions as number)
  ) {
    return { ok: false, reason: "exhausted" };
  }

  if (email) {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("promo_code", code)
      .eq("status", "paid");
    if ((count ?? 0) > 0) return { ok: false, reason: "already_used" };
  }

  return { ok: true, code, discountPercent: data.discount_percent as number };
}

// Called once a payment actually captures (webhook), never at order creation,
// so an abandoned/unpaid checkout never eats into max_redemptions.
export async function incrementPromoRedemption(rawCode: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  try {
    const { error } = await admin.rpc("increment_promo_redemption", { p_code: normalize(rawCode) });
    if (error) console.error("promo: increment failed", error);
  } catch (err) {
    console.error("promo: increment threw", err);
  }
}

export function applyDiscount(amountPaise: number, discountPercent: number): number {
  return Math.max(0, Math.round((amountPaise * (100 - discountPercent)) / 100));
}
