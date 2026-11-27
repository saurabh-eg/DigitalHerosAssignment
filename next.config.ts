import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

// D-029: Cache Components left off — most routes read the auth cookie.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Server-side rendering of designs (validation, proofs, print files) reads the font files from disk.
  outputFileTracingIncludes: {
    "/**": ["./public/fonts/**/*"],
  },
  experimental: {
    // Gallery photos are uploaded through a server action (≤ 4 MB, under Vercel's 4.5 MB request limit).
    serverActions: { bodySizeLimit: "4.2mb" },
  },
  // Native / data-file packages used by the print-file engine must not be bundled.
  serverExternalPackages: ["@resvg/resvg-js", "pdfkit", "svg-to-pdfkit"],
  images: {
    // Admin-uploaded gallery photos are served from the public Supabase bucket.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  // PRD §13 security: HTTPS enforced (HSTS) plus standard hardening headers on every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.stripe.com\")" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
