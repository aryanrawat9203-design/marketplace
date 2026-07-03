import crypto from "crypto";
import { signDownload, type DownloadKind } from "@/lib/commerce";
import { signReviewToken } from "@/lib/reviews";
import { baseUrl } from "@/lib/site";
import { sendOrderConfirmation } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type WebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        email?: string;
        notes?: Record<string, string>;
      };
    };
  };
};

// Razorpay calls this directly when a payment is captured, even if the buyer
// closes the tab. We verify the signature, then email the receipt + a
// long-lived download link.
export async function POST(req: Request) {
  // Generous limit - legitimate traffic is Razorpay's own servers, this just
  // blunts abuse of a public endpoint. Signature check below rejects forgeries.
  if (!rateLimit("webhook:" + clientIp(req), 60, 60 * 1000)) {
    return new Response("rate_limited", { status: 429 });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("not_configured", { status: 503 });

  const body = await req.text(); // RAW body - must verify before parsing
  const signature = req.headers.get("x-razorpay-signature") || "";
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new Response("bad_signature", { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(body) as WebhookEvent;
  } catch {
    return new Response("bad_json", { status: 400 });
  }

  if (event.event === "payment.captured") {
    try {
      const p = event.payload?.payment?.entity || {};
      const notes = p.notes || {};
      const kind = notes.kind as DownloadKind | undefined;
      const key = notes.key;
      // Prefer the signed-in account email captured at checkout; the Razorpay
      // modal's contact email can differ and would orphan the My-library row.
      const email = notes.buyer_email || p.email;
      if (kind && key && email) {
        const token = signDownload(kind, key, THIRTY_DAYS);
        const downloadUrl = baseUrl() + "/api/download?token=" + encodeURIComponent(token);
        const itemTitle = notes.name || "Your WorkflowCrate templates";
        const reviewUrl =
          kind === "workflow" || kind === "bundle"
            ? baseUrl() +
              "/review?token=" +
              encodeURIComponent(signReviewToken({ kind, ref: key, email }))
            : undefined;
        await sendOrderConfirmation({
          to: email,
          orderId: p.order_id || p.id || "",
          itemTitle,
          amountInPaise: Number(p.amount) || 0,
          downloadUrl,
          reviewUrl,
        });
        if (p.id) {
          await recordOrder({
            razorpayOrderId: p.order_id,
            razorpayPaymentId: p.id,
            email,
            itemKind: kind,
            itemRef: key,
            itemTitle,
            amountPaise: Number(p.amount) || 0,
          });
        }
      }
    } catch (err) {
      // Never let a downstream failure cause Razorpay to retry-storm this webhook.
      console.error("razorpay webhook: payment.captured handling failed", err);
    }
  }

  return new Response("ok", { status: 200 });
}
