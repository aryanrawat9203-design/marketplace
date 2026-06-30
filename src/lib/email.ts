// Sends transactional email via the Resend HTTP API (no SDK dependency).
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type OrderEmail = {
  to: string;
  orderId: string;
  itemTitle: string;
  amountInPaise: number;
  downloadUrl: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendOrderConfirmation(o: OrderEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.ORDERS_FROM_EMAIL || "FlowDex <onboarding@resend.dev>";
  const rupee = String.fromCharCode(0x20b9);
  const amount = (o.amountInPaise / 100).toLocaleString("en-IN");

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">' +
    "<h2>Thanks for your purchase</h2>" +
    "<p>Your FlowDex order is confirmed. Your files are ready to download.</p>" +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
    '<tr><td style="padding:6px 0;color:#666">Order ID</td><td style="text-align:right">' +
    esc(o.orderId) + "</td></tr>" +
    '<tr><td style="padding:6px 0;color:#666">Item</td><td style="text-align:right">' +
    esc(o.itemTitle) + "</td></tr>" +
    '<tr><td style="padding:6px 0;color:#666">Amount</td><td style="text-align:right">' +
    rupee + amount + "</td></tr>" +
    "</table>" +
    '<p style="margin:28px 0"><a href="' + o.downloadUrl +
    '" style="background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">Download your files</a></p>' +
    '<p style="color:#666;font-size:13px">If the button does not work, paste this link into your browser:<br>' +
    o.downloadUrl + "</p>" +
    '<p style="color:#666;font-size:13px">Need help? Just reply to this email.</p>' +
    "</div>";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: o.to,
        subject: "Your FlowDex order " + o.orderId,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
