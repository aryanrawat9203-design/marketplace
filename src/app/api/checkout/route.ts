import { NextRequest, NextResponse } from "next/server";
import { getPurchasable, signDownload, type Kind } from "@/lib/commerce";
import { createCartRecord, type CartItem } from "@/lib/cart-store";
import { getUserFromRequest } from "@/lib/auth-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { requireLoginToBuy } from "@/lib/require-login";
import { validatePromoCode, applyDiscount } from "@/lib/promo";
import { hasFreeAccess } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CART_ITEMS = 100;

type CheckoutBody = {
  kind?: Kind;
  key?: string;
  items?: Array<{ kind?: string; key?: string }>;
  promoCode?: string;
};

async function createRazorpayOrder(
  keyId: string,
  keySecret: string,
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>
) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: receipt.slice(0, 40),
      notes,
    }),
  });
  const order = await res.json();
  return { ok: res.ok, order };
}

// Creates a Razorpay order via the REST API (no SDK dependency needed).
// Accepts either a single {kind, key} or a multi-item cart {items: [...]}.
// An optional promoCode is validated server-side (never trusted from the
// client) and folded into the charged amount before the order is created.
export async function POST(req: NextRequest) {
  if (!rateLimit("checkout:" + clientIp(req), 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (requireLoginToBuy() && !user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}) as CheckoutBody);

  // Full-access accounts never touch Razorpay: mint a download token
  // straight away, same mechanism a paid purchase ends up with, just
  // without spending anything or requiring keys to be configured.
  if (hasFreeAccess(user?.email)) {
    if (Array.isArray(body.items)) {
      const seen = new Set<string>();
      const items: CartItem[] = [];
      for (const raw of body.items.slice(0, MAX_CART_ITEMS)) {
        if (raw?.kind !== "workflow" && raw?.kind !== "bundle") continue;
        if (!raw.key || typeof raw.key !== "string") continue;
        const id = `${raw.kind}:${raw.key}`;
        if (seen.has(id)) continue;
        seen.add(id);
        if (!getPurchasable(raw.kind, raw.key)) continue;
        items.push({ kind: raw.kind, key: raw.key });
      }
      if (items.length === 0) {
        return NextResponse.json({ error: "empty_cart" }, { status: 400 });
      }
      const cartId = await createCartRecord(items, 0);
      if (!cartId) {
        return NextResponse.json({ error: "cart_unavailable" }, { status: 503 });
      }
      const token = signDownload("cart", cartId);
      return NextResponse.json({
        freeAccess: true,
        downloadUrl: `/api/download?token=${encodeURIComponent(token)}`,
        name: `${items.length} template${items.length > 1 ? "s" : ""} (cart)`,
      });
    }

    const { kind, key } = body;
    if (!kind || !key) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const item = getPurchasable(kind, key);
    if (!item) {
      return NextResponse.json({ error: "invalid_product" }, { status: 400 });
    }
    const token = signDownload(item.kind, item.key);
    return NextResponse.json({
      freeAccess: true,
      downloadUrl: `/api/download?token=${encodeURIComponent(token)}`,
      name: item.name,
    });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let promoNotes: Record<string, string> = {};
  let promoCodeApplied: string | undefined;
  let discountPercentApplied: number | undefined;
  if (typeof body.promoCode === "string" && body.promoCode.trim()) {
    const v = await validatePromoCode(body.promoCode, user?.email);
    if (!v.ok) {
      return NextResponse.json({ error: "invalid_promo", reason: v.reason }, { status: 400 });
    }
    promoCodeApplied = v.code;
    discountPercentApplied = v.discountPercent;
    promoNotes = { promo_code: v.code, discount_percent: String(v.discountPercent) };
  }

  // Multi-item cart checkout: price every item server-side, persist the cart,
  // and reference it from the order notes.
  if (Array.isArray(body.items)) {
    const seen = new Set<string>();
    const items: CartItem[] = [];
    for (const raw of body.items.slice(0, MAX_CART_ITEMS)) {
      if (raw?.kind !== "workflow" && raw?.kind !== "bundle") continue;
      if (!raw.key || typeof raw.key !== "string") continue;
      const id = `${raw.kind}:${raw.key}`;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({ kind: raw.kind, key: raw.key });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }

    let originalPaise = 0;
    for (const it of items) {
      const p = getPurchasable(it.kind, it.key);
      if (!p || p.free || p.price <= 0) {
        return NextResponse.json({ error: "invalid_product", detail: it.key }, { status: 400 });
      }
      originalPaise += Math.round(p.price * 100);
    }
    const totalPaise = discountPercentApplied
      ? applyDiscount(originalPaise, discountPercentApplied)
      : originalPaise;

    const cartId = await createCartRecord(
      items,
      totalPaise,
      promoCodeApplied
        ? {
            code: promoCodeApplied,
            discountPercent: discountPercentApplied!,
            originalAmountPaise: originalPaise,
          }
        : undefined
    );
    if (!cartId) {
      return NextResponse.json({ error: "cart_unavailable" }, { status: 503 });
    }

    const name = `${items.length} template${items.length > 1 ? "s" : ""} (cart)`;
    const { ok, order } = await createRazorpayOrder(keyId, keySecret, totalPaise, `cart_${cartId}`, {
      kind: "cart",
      key: cartId,
      name,
      // Recorded orders use the account email, not whatever the buyer types
      // into the Razorpay modal, so purchases reliably appear in My library.
      ...(user?.email ? { buyer_email: user.email } : {}),
      ...promoNotes,
      ...(promoCodeApplied ? { original_amount_paise: String(originalPaise) } : {}),
    });
    if (!ok) {
      return NextResponse.json({ error: "order_failed", detail: order }, { status: 500 });
    }
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      name,
      cartId,
    });
  }

  const { kind, key } = body;
  if (!kind || !key) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const item = getPurchasable(kind, key);
  if (!item || item.free || item.price <= 0) {
    return NextResponse.json({ error: "invalid_product" }, { status: 400 });
  }

  const originalPaise = Math.round(item.price * 100);
  const amountPaise = discountPercentApplied
    ? applyDiscount(originalPaise, discountPercentApplied)
    : originalPaise;

  const { ok, order } = await createRazorpayOrder(keyId, keySecret, amountPaise, `${item.kind}_${item.key}`, {
    kind: item.kind,
    key: item.key,
    name: item.name,
    ...(user?.email ? { buyer_email: user.email } : {}),
    ...promoNotes,
    ...(promoCodeApplied ? { original_amount_paise: String(originalPaise) } : {}),
  });
  if (!ok) {
    return NextResponse.json({ error: "order_failed", detail: order }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    name: item.name,
  });
}
