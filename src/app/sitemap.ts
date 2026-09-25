import type { MetadataRoute } from "next";
import { getCatalogToys } from "@/lib/catalog-store";
import { PARENT_RESERVED_IDS } from "@/lib/parent-paths";
import { CANONICAL_SITE_ORIGIN } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reserved = new Set<string>(PARENT_RESERVED_IDS);
  const toys = await getCatalogToys();
  const parentToys = toys.filter((toy) => !reserved.has(toy.id));

  return [
    {
      url: `${CANONICAL_SITE_ORIGIN}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    ...parentToys.map((toy) => ({
      url: `${CANONICAL_SITE_ORIGIN}/p/${encodeURIComponent(toy.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
