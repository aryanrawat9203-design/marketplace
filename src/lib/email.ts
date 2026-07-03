import { Resend } from "resend";

export type OrderEmail = {
  to: string;
  orderId: string;
  itemTitle: string;
  amountInPaise: number;
  downloadUrl: string;
  reviewUrl?: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Sends the post-purchase receipt + download link via Resend.
// Never throws - callers should not need try/catch, but wrap anyway since
// a failed email must never block the checkout/webhook response.
export async function sendOrderConfirmation(o: OrderEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDERS_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const rupee = String.fromCharCode(0x20b9);
  const amount = (o.amountInPaise / 100).toLocaleString("en-IN");

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">' +
    "<h2>Thanks for your purchase</h2>" +
    "<p>Your WorkflowCrate order is confirmed. Your files are ready to download.</p>" +
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
    (o.reviewUrl
      ? '<p style="color:#666;font-size:13px">Once it&#39;s running, we&#39;d love to hear how it went: ' +
        '<a href="' + o.reviewUrl + '">leave a quick review</a>. Only buyers get this link.</p>'
      : "") +
    '<p style="color:#666;font-size:13px">Need help? Just reply to this email.</p>' +
    "</div>";

  const text =
    "Thanks for your purchase!\n\n" +
    "Order ID: " + o.orderId + "\n" +
    "Item: " + o.itemTitle + "\n" +
    "Amount: " + rupee + amount + "\n\n" +
    "Download your files: " + o.downloadUrl + "\n\n" +
    (o.reviewUrl ? "Loved it? Leave a quick review: " + o.reviewUrl + "\n\n" : "") +
    "Need help? Just reply to this email.";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: o.to,
      subject: "Your WorkflowCrate order " + o.orderId,
      html,
      text,
    });
    return !error;
  } catch {
    return false;
  }
}

export type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

// Forwards a contact-form submission to SUPPORT_EMAIL, with replyTo set to
// the sender so a reply from the inbox goes straight back to them.
export async function sendContactMessage(m: ContactMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDERS_FROM_EMAIL;
  const to = process.env.SUPPORT_EMAIL;
  if (!apiKey || !from || !to) return false;

  const name = esc(m.name || "(no name)");
  const email = esc(m.email);
  const message = esc(m.message);

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">' +
    "<h2>New contact form message</h2>" +
    '<p style="color:#666;font-size:13px">From: ' + name + " &lt;" + email + "&gt;</p>" +
    '<p style="white-space:pre-wrap">' + message + "</p>" +
    "</div>";

  const text = "From: " + m.name + " <" + m.email + ">\n\n" + m.message;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: m.email,
      subject: "WorkflowCrate contact form: " + (m.name || m.email),
      html,
      text,
    });
    return !error;
  } catch {
    return false;
  }
}
