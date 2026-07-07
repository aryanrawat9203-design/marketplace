// Central allowlist for accounts that get full site access for free - no
// Razorpay purchase, no chatbot subscription, no usage limits. Checked at
// every paywall (checkout, chatbot usage) instead of scattering email
// comparisons across routes. Safe to import from client components too:
// it only ever compares against the signed-in user's own email, never
// exposes the list to anyone else.
const FREE_ACCESS_EMAILS = new Set(
  [
    "aryanrawat9203@gmail.com",
    ...(process.env.FREE_ACCESS_EMAILS ?? process.env.NEXT_PUBLIC_FREE_ACCESS_EMAILS ?? "").split(","),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function hasFreeAccess(email: string | null | undefined): boolean {
  if (!email) return false;
  return FREE_ACCESS_EMAILS.has(email.trim().toLowerCase());
}
