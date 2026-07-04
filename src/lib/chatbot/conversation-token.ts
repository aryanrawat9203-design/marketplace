// Signed, tamper-proof token binding a chat session to the authenticated user
// and a running per-conversation message count. This is what makes "is this
// message starting a new conversation, or continuing one" a server-verified
// fact instead of something a client could fake - e.g. by sending an empty
// history array on every request to dodge the free-quota check indefinitely,
// or a non-empty one to look like a continuation without ever having
// consumed quota. The client only ever carries this opaque string around; it
// cannot forge or edit it without the server's secret.

import crypto from "crypto";

const SECRET = process.env.DOWNLOAD_SECRET || "dev-insecure-secret-change-me";
const CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000; // 2h of inactivity ends a "conversation"

type TokenPayload = { uid: string; cid: string; n: number; exp: number };

export function signConversationToken(userId: string, conversationId: string, messageCount: number): string {
  const payload: TokenPayload = { uid: userId, cid: conversationId, n: messageCount, exp: Date.now() + CONVERSATION_TTL_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Returns the payload only if the signature is valid, unexpired, and bound to userId. */
export function verifyConversationToken(token: string, userId: string): TokenPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as TokenPayload;
    if (payload.uid !== userId) return null;
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (typeof payload.n !== "number" || payload.n < 0) return null;
    return payload;
  } catch {
    return null;
  }
}
