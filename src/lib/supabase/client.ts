import { createBrowserClient } from "@supabase/ssr";

// Returns null if Supabase isn't configured, instead of throwing - a missing
// env var must never take down prerendering for the whole app.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
