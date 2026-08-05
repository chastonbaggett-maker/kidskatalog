import { notFound } from "next/navigation";
import { ToyPageView } from "@/components/ToyPageView";
import { getCategory } from "@/data/categories";
import { getCatalogToy, getMoreCatalogToys } from "@/lib/catalog-store";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ToyPage({ params }: Props) {
  const { id } = await params;
  const toy = await getCatalogToy(id);
  if (!toy) notFound();

  const cat = getCategory(toy.category);
  const gallery = toy.images?.length ? toy.images : [toy.image];
  const more = await getMoreCatalogToys(toy.id);

  return (
    <ToyPageView
      toy={toy}
      categoryLabel={cat?.label ?? "Toy"}
      gallery={gallery}
      more={more}
    />
  );
}
