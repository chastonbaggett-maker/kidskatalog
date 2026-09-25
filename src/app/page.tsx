import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ParentCatalogLanding } from "@/components/parent/ParentCatalogLanding";
import { parseAsin } from "@/lib/amazon-asin";
import { buildSpecialLink, getAssociatesTag } from "@/lib/associates";
import { getCatalogToys } from "@/lib/catalog-store";
import { getSiteMode } from "@/lib/site-mode-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "KidsKatalog — Parent catalog" },
  description:
    "Parent catalog of KidsKatalog toys with Amazon buy links. As an Amazon Associate I earn from qualifying purchases.",
  robots: { index: true, follow: true },
};

export default async function Home() {
  if ((await getSiteMode()) === "kid") {
    redirect("/shop");
  }

  const tag = getAssociatesTag();
  const toys = await getCatalogToys();
  const cards = toys.flatMap((toy) => {
    const asin = toy.affiliateUrl ? parseAsin(toy.affiliateUrl) : null;
    if (!asin || !tag) return [];
    return [
      {
        id: toy.id,
        name: toy.name,
        blurb: toy.blurb,
        image: toy.image,
        imageAlt: toy.imageAlt,
        buyHref: buildSpecialLink(asin, tag),
      },
    ];
  });

  return <ParentCatalogLanding cards={cards} />;
}
