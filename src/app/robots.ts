import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { hostnameOnly, resolveDeploymentMode } from "@/lib/deployment";
import { CANONICAL_SITE_ORIGIN } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers();
  const host = process.env.VERCEL
    ? headerStore.get("x-forwarded-host") || headerStore.get("host")
    : headerStore.get("host");
  if (resolveDeploymentMode({ host: hostnameOnly(host) }) === "kids") {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${CANONICAL_SITE_ORIGIN}/sitemap.xml`,
    host: CANONICAL_SITE_ORIGIN,
  };
}
