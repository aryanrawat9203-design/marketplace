import { NextRequest, NextResponse } from "next/server";
import { ordersForEmail } from "@/lib/orders";
import { getUserFromRequest } from "@/lib/auth-server";
import { signDownload } from "@/lib/commerce";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_HOUR = 60 * 60 * 1000;

// The signed-in customer's purchase library. Auth is the Bearer session token,
// so each caller only ever sees orders recorded against their own email.
export async function GET(req: NextRequest) {
  if (!rateLimit("orders-mine:" + clientIp(req), 30, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = await getUserFromRequest(req);
  if (!user?.email) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const orders = await ordersForEmail(user.email);
  return NextResponse.json({
    orders: orders.map((o) => ({
      kind: o.kind,
      ref: o.ref,
      itemTitle: o.itemTitle,
      amountPaise: o.amountPaise,
      razorpayOrderId: o.razorpayOrderId,
      createdAt: o.createdAt,
      downloadUrl:
        "/api/download?token=" + encodeURIComponent(signDownload(o.kind, o.ref, ONE_HOUR)),
    })),
  });
}
