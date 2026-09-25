import type { Metadata } from "next";
import ShopPage from "@/app/(shell)/shop/page";
import { AppShell } from "@/components/AppShell";
import { ParentCatalogLanding } from "@/components/parent/ParentCatalogLanding";
import { parseAsin } from "@/lib/amazon-asin";
import { buildSpecialLink, getAssociatesTag } from "@/lib/associates";
import { getCatalogToys } from "@/lib/catalog-store";
import { getSiteMode } from "@/lib/site-mode-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if ((await getSiteMode()) === "kid") {
    return {
      title: { absolute: "KidsKatalog — Browse toys. Build a Kart." },
      robots: { index: false, follow: true },
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
  // Absent cookie is Parent. Only an explicit kk_mode=kid cookie renders Kid Mode.
  if ((await getSiteMode()) === "kid") {
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
