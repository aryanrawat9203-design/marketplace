import { NextRequest, NextResponse } from "next/server";
import { findOrder } from "@/lib/orders";
import { signDownload } from "@/lib/commerce";
import { baseUrl } from "@/lib/site";
import { sendOrderConfirmation } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Same response regardless of match, so this endpoint can't be used to
// enumerate which email/order-id combinations are real orders.
const GENERIC_OK = {
  ok: true,
  message: "If we found a matching order, a fresh download link has been emailed to you.",
};

export async function POST(req: NextRequest) {
  if (!rateLimit("orders-lookup:" + clientIp(req), 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { email, orderId } = await req
    .json()
    .catch(() => ({}) as { email?: string; orderId?: string });

  if (!email || !EMAIL_RE.test(email) || !orderId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const order = await findOrder(email, orderId);
  if (order) {
    const token = signDownload(order.kind, order.ref, THIRTY_DAYS);
    const downloadUrl = `${baseUrl()}/api/download?token=${encodeURIComponent(token)}`;
    try {
      await sendOrderConfirmation({
        to: email,
        orderId,
        itemTitle: order.itemTitle,
        amountInPaise: order.amountPaise,
        downloadUrl,
      });
    } catch {
      // Fall through to the generic response either way.
    }
  }

  return NextResponse.json(GENERIC_OK);
}
