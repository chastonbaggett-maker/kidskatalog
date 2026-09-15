import type { Metadata } from "next";
import { ParentDealsView } from "@/components/parent/ParentDealsView";
import { getCatalogToys } from "@/lib/catalog-store";
import { toParentToys } from "@/lib/kid-surface";
import type { Toy } from "@/types/toy";

export const metadata: Metadata = {
  title: "Brand deals",
  description:
    "Parent-only brand partner links. Not Amazon Associates. Kids never see these.",
  robots: { index: true, follow: true },
};

export default async function ParentDealsPage() {
  const toys = await getCatalogToys();
  return <ParentDealsView toys={toParentToys(toys) as Toy[]} />;
}
