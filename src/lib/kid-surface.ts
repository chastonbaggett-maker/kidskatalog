import type { CatalogPageResult } from "@/lib/catalog-query";
import type { Toy } from "@/types/toy";

/** Kid-facing toy: commerce fields stripped. */
export type KidToy = Omit<Toy, "affiliateUrl">;

export function toKidToy(toy: Toy): KidToy {
  const { affiliateUrl: _drop, ...rest } = toy;
  return rest;
}

export function toKidToys(toys: Toy[]): KidToy[] {
  return toys.map(toKidToy);
}

export function toKidCatalogPage(page: CatalogPageResult): CatalogPageResult {
  return {
    ...page,
    toys: toKidToys(page.toys) as Toy[],
  };
}
