import type { NextConfig } from "next";

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
};

export default nextConfig;
