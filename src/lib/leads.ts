import { createAdminClient } from "./supabase/admin";

// Stores an email captured on the free-template download flow. Never blocks
// the download - no-ops silently if Supabase isn't configured or the insert fails.
export async function recordLead(email: string, source: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  try {
    const { error } = await admin.from("leads").insert({ email, source });
    if (error) console.error("leads: insert failed", error);
  } catch (err) {
    console.error("leads: insert threw", err);
  }
}
