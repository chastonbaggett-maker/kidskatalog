import type { MetadataRoute } from "next";
import { CANONICAL_SITE_ORIGIN } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${CANONICAL_SITE_ORIGIN}/sitemap.xml`,
    host: CANONICAL_SITE_ORIGIN,
  };
}
