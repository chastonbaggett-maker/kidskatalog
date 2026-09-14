import { notFound } from "next/navigation";
import { ParentToyView } from "@/components/parent/ParentToyView";
import { getCategory } from "@/data/categories";
import { getCatalogToy } from "@/lib/catalog-store";
import { toKidToy } from "@/lib/kid-surface";
import type { Toy } from "@/types/toy";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ParentToyPage({ params }: Props) {
  const { id } = await params;
  const toy = await getCatalogToy(id);
  if (!toy?.affiliateUrl) notFound();

  const cat = getCategory(toy.category);
  const gallery = toy.images?.length ? toy.images : [toy.image];

  return (
    <ParentToyView
      toy={toKidToy(toy) as Toy}
      categoryLabel={cat?.label ?? "Toy"}
      gallery={gallery}
      buyUrl={toy.affiliateUrl}
    />
  );
}
