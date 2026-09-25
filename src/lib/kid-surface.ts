import { isKidBlockedAsset } from "@/lib/affiliate";
import type { CatalogPageResult } from "@/lib/catalog-query";
import type { CategoryId, Toy } from "@/types/toy";

const PARENT_DISPLAY_KEY =
  /^(price|prices|listprice|saleprice|priceamount|rating|ratings|stars|starrating|reviewcount|reviews|reviewrating|customerreviews|averagerating)$/i;

const KID_CATEGORY_ART: Record<CategoryId, string> = {
  dinos: "/categories/dinos.svg",
  plush: "/categories/plush.svg",
  cars: "/categories/cars.svg",
  blocks: "/categories/blocks.svg",
  outside: "/categories/outside.svg",
  games: "/categories/games.svg",
  stem: "/categories/stem.svg",
  pretend: "/categories/pretend.svg",
};

/** Kid-facing toy: commerce fields stripped (Amazon + brand deals). */
export type KidToy = Omit<
  Toy,
  "affiliateUrl" | "brandDeal" | "brandDealUrl" | "brandPartner" | "brandAffiliate"
>;

const KID_COMMERCE_KEYS = [
  "affiliateUrl",
  "brandDeal",
  "brandDealUrl",
  "brandPartner",
  "brandAffiliate",
] as const;

function kidArt(category: CategoryId): string {
  return KID_CATEGORY_ART[category] ?? "/categories/blocks.svg";
}

function kidSafeList(srcs: string[] | undefined): string[] {
  return (srcs ?? [])
    .map((src) => src.trim())
    .filter((src) => src.length > 0 && !isKidBlockedAsset(src));
}

export function toKidToy(toy: Toy): KidToy {
  const {
    affiliateUrl: _affiliateUrl,
    brandDeal: _brandDeal,
    brandDealUrl: _brandDealUrl,
    brandPartner: _brandPartner,
    brandAffiliate: _brandAffiliate,
    ...rest
  } = toy;
  const art = kidArt(toy.category);
  const keptImages = kidSafeList(rest.images);
  const image =
    rest.image && !isKidBlockedAsset(rest.image) ? rest.image : keptImages[0] ?? art;
  const images = keptImages.length > 0 ? keptImages : [image];
  const videos = kidSafeList(rest.videos);
  const display: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (PARENT_DISPLAY_KEY.test(key)) continue;
    display[key] = value;
  }
  return {
    ...(display as typeof rest),
    image,
    images,
    videos: videos.length > 0 ? videos : undefined,
  };
}

export function toKidToys(toys: Toy[]): KidToy[] {
  return toys.map(toKidToy);
}

/** Parent client payload: drop the stored Buy URL and any price or rating fields. Blurbs stay. */
export function toParentToy(toy: Toy): Omit<Toy, "affiliateUrl"> {
  const { affiliateUrl: _affiliateUrl, ...rest } = toy;
  const display: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (PARENT_DISPLAY_KEY.test(key)) continue;
    display[key] = value;
  }
  return display as Omit<Toy, "affiliateUrl">;
}

export function toParentToys(toys: Toy[]): Array<Omit<Toy, "affiliateUrl">> {
  return toys.map(toParentToy);
}

export function toKidCatalogPage(page: CatalogPageResult): CatalogPageResult {
  return {
    ...page,
    toys: toKidToys(page.toys) as Toy[],
  };
}

export function hasKidCommerceFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasKidCommerceFields);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  for (const key of KID_COMMERCE_KEYS) {
    if (key in record && record[key] !== undefined) return true;
  }
  return Object.values(record).some(hasKidCommerceFields);
}
