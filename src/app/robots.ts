import type { MetadataRoute } from "next";
import { publicEnv } from "@/config/env.public";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/design", "/cart", "/checkout", "/api", "/auth"] },
    sitemap: `${publicEnv().NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
