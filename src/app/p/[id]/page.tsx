import { notFound } from "next/navigation";
import { ParentToyView } from "@/components/parent/ParentToyView";
import { getCategory } from "@/data/categories";
import { resolveParentBuy } from "@/lib/associates";
import { resolveBrandDeal } from "@/lib/brand-deals";
import { getCatalogToy, getCatalogToys } from "@/lib/catalog-store";
import { toParentToy } from "@/lib/kid-surface";
import { PARENT_RESERVED_IDS } from "@/lib/parent-paths";
import type { Toy } from "@/types/toy";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  const toys = await getCatalogToys();
  const reserved = new Set<string>(PARENT_RESERVED_IDS);
  return toys.filter((toy) => !reserved.has(toy.id)).map((toy) => ({ id: toy.id }));
}

export default async function ParentToyPage({ params }: Props) {
  const { id } = await params;
  if ((PARENT_RESERVED_IDS as readonly string[]).includes(id)) notFound();

  const toy = await getCatalogToy(id);
  if (!toy) notFound();

  const buy = resolveParentBuy(toy.id, toy.affiliateUrl);
  const cat = getCategory(toy.category);
  const gallery = toy.images?.length ? toy.images : [toy.image];

  return (
    <ParentToyView
      toy={toParentToy(toy) as Toy}
      categoryLabel={cat?.label ?? "Toy"}
      gallery={gallery}
      buyUrl={buy.href}
      buyPlaceholder={buy.mode === "placeholder"}
      brandDeal={resolveBrandDeal(toy)}
    />
  );
}
