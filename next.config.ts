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

// Integration and pair pages that still have no live page, 308'd to the
// closest surviving page (a live constituent of a dead pair, or the hub) so
// the already-indexed URLs don't 404.
//
// Two things shrank this list from its original 26 entries:
//  - Asana and Trello now have real connector nodes and hand-built templates,
//    so their single-integration pages are live again.
//  - MIN_PAIR_TEMPLATES dropped from 10 to 3, so every pair backed by >=3 real
//    templates now renders. 16 pairs the earlier cleanup had retired at the
//    old threshold came back (Shopify, Google Calendar, Trello/Asana and
//    Discord/Jira pairs), and a config redirect would shadow those live pages -
//    so they're removed.
//
// What remains is genuinely dead: YouTube still has no connector node anywhere
// in the catalog, and the listed pairs have zero templates that use both tools.
const retiredIntegrationRedirects = [
  { from: "youtube", to: "/integrations" },
  { from: "asana-and-google-calendar", to: "/integrations/google-calendar" },
  { from: "asana-and-outlook", to: "/integrations/outlook" },
  { from: "asana-and-twilio", to: "/integrations/twilio" },
  { from: "google-calendar-and-jira", to: "/integrations/google-calendar" },
  { from: "google-calendar-and-trello", to: "/integrations/google-calendar" },
  { from: "google-drive-and-youtube", to: "/integrations/google-drive" },
  { from: "http-rest-api-and-youtube", to: "/integrations/http-rest-api" },
];

const nextConfig: NextConfig = {
  // Screenshots live in Supabase Storage (see src/lib/screenshots.ts), so the
  // optimizer needs that host allowlisted to re-encode them as AVIF/WebP
  // instead of serving the uploaded PNGs as-is (Fix 2.7).
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https" as const,
            hostname: new URL(supabaseUrl).hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    formats: ["image/avif", "image/webp"] as const,
  },
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
