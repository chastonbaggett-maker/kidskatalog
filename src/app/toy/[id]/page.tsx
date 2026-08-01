import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ToyPageView } from "@/components/ToyPageView";
import { getCategory } from "@/data/categories";
import { getMoreToys, getToy } from "@/data/toys";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ToyPage({ params }: Props) {
  const { id } = await params;
  const toy = getToy(id);
  if (!toy) notFound();

  const cat = getCategory(toy.category);
  const gallery = toy.images?.length ? toy.images : [toy.image];
  const more = getMoreToys(toy.id);

  return (
    <AppShell>
      <ToyPageView
        toy={toy}
        categoryLabel={cat?.label ?? "Toy"}
        gallery={gallery}
        more={more}
      />
    </AppShell>
  );
}
