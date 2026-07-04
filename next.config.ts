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
  "img-src 'self' data: blob: https://*.razorpay.com",
  "font-src 'self'",
  `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com${supabaseUrl ? ` ${supabaseUrl}` : ""}`,
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Bundle catalog data + product files into the serverless functions that read
  // them from disk at runtime.
  outputFileTracingIncludes: {
    "/": ["./src/data/**"],
    "/workflows": ["./src/data/**"],
    "/workflows/[route]": ["./src/data/**"],
    "/bundles": ["./src/data/**"],
    "/bundles/[slug]": ["./src/data/**"],
    "/sitemap.xml": ["./src/data/**"],
    "/api/download": ["./src/data/**", "./product-files/**"],
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
};

export default nextConfig;
