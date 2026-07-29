import { createAdminClient } from "./supabase/admin";

/**
 * Addresses arrive however the browser autofilled them - "A@B.com",
 * " a@b.com " - so everything is normalised before it is stored or matched.
 * Postgres comparisons are case-sensitive, and without this the same person
 * counts as several different leads: dedupe silently fails and they get the
 * welcome email once per capitalisation.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Stores an email captured on the free-template download flow. Never blocks
// the download - no-ops silently if Supabase isn't configured or the insert fails.
//
// Reports whether this address is new so the caller can send the welcome email
// once rather than on every repeat signup.
export async function recordLead(
  emailRaw: string,
  source: string,
): Promise<{ isNew: boolean; email: string }> {
  const email = normalizeEmail(emailRaw);
  const admin = createAdminClient();
  if (!admin) return { isNew: false, email };

  try {
    const { data: existing, error: lookupError } = await admin
      .from("leads")
      .select("email")
      .ilike("email", email)
      .limit(1);

    // On a failed lookup, assume the address already exists: sending nothing is
    // a smaller failure than mailing someone the same welcome repeatedly.
    const isNew = !lookupError && (existing?.length ?? 0) === 0;

    const { error } = await admin.from("leads").insert({ email, source });
    if (error) console.error("leads: insert failed", error);

    return { isNew, email };
  } catch (err) {
    console.error("leads: insert threw", err);
    return { isNew: false, email };
  }
}
