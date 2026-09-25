import type { Metadata } from "next";
import ShopPage from "@/app/(shell)/shop/page";
import { AppShell } from "@/components/AppShell";
import { ParentCatalogLanding } from "@/components/parent/ParentCatalogLanding";
import { parseAsin } from "@/lib/amazon-asin";
import { buildSpecialLink, getAssociatesTag } from "@/lib/associates";
import { getCatalogToys } from "@/lib/catalog-store";
import { getDeploymentMode } from "@/lib/deployment-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if ((await getDeploymentMode()) === "kids") {
    return {
      title: { absolute: "KidsKatalog Kids" },
      description: "Browse toys and build a Kart.",
      robots: { index: false, follow: false },
      applicationName: "KidsKatalog Kids",
    };
  }
  return {
    title: { absolute: "KidsKatalog — Parent catalog" },
    description:
      "Parent catalog of KidsKatalog toys with Amazon buy links. As an Amazon Associate I earn from qualifying purchases.",
    robots: { index: true, follow: true },
  };
}

export default async function Home() {
  if ((await getDeploymentMode()) === "kids") {
    return (
      <AppShell>
        <ShopPage />
      </AppShell>
    );
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
