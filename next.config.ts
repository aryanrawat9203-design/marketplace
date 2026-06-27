import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the catalog data files and product files are bundled into the
  // serverless functions when deployed (they are read from disk at runtime).
  outputFileTracingIncludes: {
    "/": ["./src/data/**"],
    "/workflows": ["./src/data/**"],
    "/workflows/[route]": ["./src/data/**"],
    "/shop": ["./src/data/**", "./product-files/**"],
    "/shop/[slug]": ["./src/data/**", "./product-files/**"],
    "/sitemap.xml": ["./src/data/**"],
    "/api/download": ["./src/data/**", "./product-files/**"],
    "/api/checkout": ["./src/data/**"],
    "/api/verify": ["./src/data/**"],
  },
};

export default nextConfig;
