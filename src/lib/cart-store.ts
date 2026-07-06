import { createAdminClient } from "./supabase/admin";
import type { Kind } from "./commerce";

// Razorpay order notes can't hold an arbitrary item list, so multi-item carts
// are persisted server-side at checkout and referenced by id from the order
// notes and download tokens. Rows are tiny and kept forever so "download
// again" from an old receipt keeps working.

export type CartItem = { kind: Kind; key: string };
export type CartRecord = { id: string; items: CartItem[]; amountPaise: number };

export type CartPromo = { code: string; discountPercent: number; originalAmountPaise: number };

export async function createCartRecord(
  items: CartItem[],
  amountPaise: number,
  promo?: CartPromo
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  try {
    const { data, error } = await admin
      .from("carts")
      .insert({
        items,
        amount_paise: amountPaise,
        promo_code: promo?.code ?? null,
        discount_percent: promo?.discountPercent ?? null,
        original_amount_paise: promo?.originalAmountPaise ?? null,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("carts: insert failed", error);
      return null;
    }
    return data.id as string;
  } catch (err) {
    console.error("carts: insert threw", err);
    return null;
  }
}

export async function getCartRecord(id: string): Promise<CartRecord | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  try {
    const { data, error } = await admin
      .from("carts")
      .select("id, items, amount_paise")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const items = (data.items as CartItem[]) ?? [];
    if (!Array.isArray(items) || items.length === 0) return null;
    return {
      id: data.id as string,
      items,
      amountPaise: (data.amount_paise as number) ?? 0,
    };
  } catch {
    return null;
  }
}
