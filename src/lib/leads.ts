import { createAdminClient } from "./supabase/admin";

/**
 * Addresses arrive however the browser autofilled them - "A@B.com",
 * " a@b.com " - so everything is normalised before it is stored or matched.
 * Postgres comparisons are case-sensitive, and without this the same person
 * counts as several different leads.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Anti-abuse floor only, deliberately short. Entering your address on /free is
 * an explicit request for the pack, so a repeat request is honoured rather
 * than silently dropped - someone who never received the first copy will just
 * ask again, and answering that with nothing is what makes the form look
 * broken.
 *
 * Kept to two minutes on purpose: the route already rate-limits by IP, so this
 * only needs to absorb a double-click. Anything longer creates a window where
 * a real person asks again and appears to be ignored.
 */
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export type LeadResult = { shouldSendPack: boolean; email: string };

// Stores an email captured on the free-template download flow. Never blocks
// the download - no-ops silently if Supabase isn't configured or the insert fails.
export async function recordLead(emailRaw: string, source: string): Promise<LeadResult> {
  const email = normalizeEmail(emailRaw);
  const admin = createAdminClient();

  // Without Supabase we cannot tell a repeat from a first request. Send anyway:
  // a duplicate free pack is a smaller failure than asking for an address and
  // delivering nothing.
  if (!admin) return { shouldSendPack: true, email };

  try {
    const { data: recent, error: lookupError } = await admin
      .from("leads")
      .select("created_at")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastSeen = recent?.[0]?.created_at
      ? new Date(recent[0].created_at as string).getTime()
      : 0;

    // Fail open on a lookup error, for the same reason as above.
    const shouldSendPack = !!lookupError || Date.now() - lastSeen > RESEND_COOLDOWN_MS;

    const { error } = await admin.from("leads").insert({ email, source });
    if (error) console.error("leads: insert failed", error);

    return { shouldSendPack, email };
  } catch (err) {
    console.error("leads: insert threw", err);
    return { shouldSendPack: true, email };
  }
}
