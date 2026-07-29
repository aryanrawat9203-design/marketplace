import type { NextConfig } from "next";

// Static (no-nonce) CSP - keeps the catalog's 400+ pages statically generated.
// 'unsafe-inline' on script-src is required because Next.js embeds its RSC
// payload/hydration data in inline <script> tags; a nonce-based CSP would
// close that gap but forces every page into dynamic rendering.
const isDev = process.env.NODE_ENV === "development";
// Supabase Auth calls (signOut, signInWithOtp, token refresh) go through
// fetch() from the browser client - without its origin in connect-src, the
// CSP silently blocks them and e.g. signOut() never clears the session.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.razorpay.com${supabaseUrl ? ` ${supabaseUrl}` : ""}`,
  "font-src 'self'",
  `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com${supabaseUrl ? ` ${supabaseUrl}` : ""}`,
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Integration and pair pages retired when platforms were rebuilt from the
// actual workflow node graphs. Asana / Trello / YouTube had no connector node
// anywhere in the catalog, and 23 pairs fell below MIN_PAIR_TEMPLATES once the
// phantom claims were removed. These URLs are already indexed and in the
// sitemaps, so 308 them to the closest surviving page (the higher-inventory
// half of a dead pair, or the integrations hub) instead of 404ing.
const retiredIntegrationRedirects = [
  { from: "asana", to: "/integrations" },
  { from: "trello", to: "/integrations" },
  { from: "youtube", to: "/integrations" },
  { from: "asana-and-discord", to: "/integrations/discord" },
  { from: "asana-and-google-calendar", to: "/integrations/google-calendar" },
  { from: "asana-and-outlook", to: "/integrations/outlook" },
  { from: "asana-and-twilio", to: "/integrations/twilio" },
  { from: "discord-and-google-calendar", to: "/integrations/discord" },
  { from: "discord-and-jira", to: "/integrations/discord" },
  { from: "discord-and-shopify", to: "/integrations/discord" },
  { from: "discord-and-trello", to: "/integrations/discord" },
  { from: "gmail-and-shopify", to: "/integrations/gmail" },
  { from: "google-calendar-and-jira", to: "/integrations/google-calendar" },
  { from: "google-calendar-and-microsoft-teams", to: "/integrations/microsoft-teams" },
  { from: "google-calendar-and-telegram", to: "/integrations/telegram" },
  { from: "google-calendar-and-trello", to: "/integrations/google-calendar" },
  { from: "google-calendar-and-twilio", to: "/integrations/twilio" },
  { from: "google-drive-and-shopify", to: "/integrations/google-drive" },
  { from: "google-drive-and-youtube", to: "/integrations/google-drive" },
  { from: "http-rest-api-and-youtube", to: "/integrations/http-rest-api" },
  { from: "jira-and-microsoft-teams", to: "/integrations/microsoft-teams" },
  { from: "microsoft-teams-and-shopify", to: "/integrations/microsoft-teams" },
  { from: "mysql-and-shopify", to: "/integrations/mysql" },
  { from: "outlook-and-shopify", to: "/integrations/outlook" },
  { from: "postgresql-and-shopify", to: "/integrations/postgresql" },
  { from: "shopify-and-twilio", to: "/integrations/twilio" },
];

const nextConfig: NextConfig = {
  // Bundle catalog data + product files into the serverless functions that read
  // them from disk at runtime.
  outputFileTracingIncludes: {
    "/": ["./src/data/**"],
    "/workflows": ["./src/data/**"],
    "/workflows/[route]": ["./src/data/**"],
    "/bundles": ["./src/data/**"],
    "/bundles/[slug]": ["./src/data/**"],
    // Sitemaps read the catalog at request time. The dynamic workflow sitemap
    // is emitted as /workflows/sitemap/[__metadata_id__]; both spellings are
    // listed so the data is traced whichever key the build matches.
    "/sitemap.xml": ["./src/data/**"],
    "/robots.txt": ["./src/data/**"],
    "/integrations/sitemap.xml": ["./src/data/**"],
    "/workflows/sitemap.xml": ["./src/data/**"],
    "/workflows/sitemap/[__metadata_id__]": ["./src/data/**"],
    "/api/download": ["./src/data/**", "./product-files/**"],
    "/api/starter-pack": ["./src/data/**", "./product-files/**"],
    "/api/leads": ["./src/data/**"],
    "/free": ["./src/data/**"],
    "/api/checkout": ["./src/data/**"],
    "/api/verify": ["./src/data/**"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
    ];
  },
  async redirects() {
    return retiredIntegrationRedirects.map(({ from, to }) => ({
      source: `/integrations/${from}`,
      destination: to,
      permanent: true,
    }));
  },
};

export default nextConfig;
