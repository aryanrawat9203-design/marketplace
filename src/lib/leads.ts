import { createAdminClient } from "./supabase/admin";

// Stores an email captured on the free-template download flow. Never blocks
// the download - no-ops silently if Supabase isn't configured or the insert fails.
//
// Reports whether this address is new so the caller can send the welcome email
// once rather than on every repeat signup.
export async function recordLead(email: string, source: string): Promise<{ isNew: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { isNew: false };

  try {
    const { data: existing, error: lookupError } = await admin
      .from("leads")
      .select("email")
      .eq("email", email)
      .limit(1);

    // On a failed lookup, assume the address already exists: sending nothing is
    // a smaller failure than mailing someone the same welcome repeatedly.
    const isNew = !lookupError && (existing?.length ?? 0) === 0;

    const { error } = await admin.from("leads").insert({ email, source });
    if (error) console.error("leads: insert failed", error);

    return { isNew };
  } catch (err) {
    console.error("leads: insert threw", err);
    return { isNew: false };
  }
}
