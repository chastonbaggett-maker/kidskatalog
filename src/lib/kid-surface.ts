import { isKidBlockedAsset } from "@/lib/affiliate";
import type { CatalogPageResult } from "@/lib/catalog-query";
import type { CategoryId, Toy } from "@/types/toy";

const PARENT_DISPLAY_KEY =
  /^(price|prices|listprice|saleprice|priceamount|rating|ratings|stars|starrating|reviewcount|reviews|reviewrating|customerreviews|averagerating)$/i;

const KID_CATEGORY_TILE: Record<CategoryId, { label: string; fill: string }> = {
  dinos: { label: "Dinos", fill: "#4A90E2" },
  plush: { label: "Plush", fill: "#F5A9C5" },
  cars: { label: "Cars", fill: "#5BA3F0" },
  blocks: { label: "Blocks", fill: "#B19CD9" },
  outside: { label: "Outside", fill: "#6CB6FF" },
  games: { label: "Games", fill: "#9B7FD1" },
  stem: { label: "STEM", fill: "#7B6DFF" },
  pretend: { label: "Pretend", fill: "#EF8FB3" },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTileText(value: string, max: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const chunk = word.length > max ? `${word.slice(0, max - 1)}…` : word;
    const next = line ? `${line} ${chunk}` : chunk;
    if (next.length > max && line) {
      lines.push(line);
      line = chunk;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Solid category-colored tile with the toy name. Used when we cannot show our own photo. */
export function kidNameTileSrc(name: string, category: CategoryId): string {
  const tile = KID_CATEGORY_TILE[category] ?? { label: "Toy", fill: "#7B6DFF" };
  const lines = wrapTileText((name || "Toy").trim() || "Toy", 16);
  const start = 188 - (lines.length - 1) * 26;
  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="200" y="${start + index * 52}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="${tile.fill}"/><text x="200" y="72" text-anchor="middle" fill="#1C2430" font-family="Arial, sans-serif" font-size="28" font-weight="700">${escapeXml(tile.label)}</text><text text-anchor="middle" fill="#1C2430" font-family="Arial, sans-serif" font-size="46" font-weight="700">${tspans}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
  const keptImages = kidSafeList(rest.images);
  const ownImage =
    rest.image && !isKidBlockedAsset(rest.image) ? rest.image : keptImages[0];
  const tile = kidNameTileSrc(toy.name, toy.category);
  const image = ownImage || tile;
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
