import "server-only";
import { storedParentAffiliateUrl } from "@/lib/affiliate";
import { getCatalogToys } from "@/lib/catalog-store";
import { getDraftToys } from "@/lib/draft-store";
import { draftListingWithGrok } from "@/lib/grok-listing";
import { buildDraftFromAsin } from "@/lib/generate-listings";
import { normalizeGenerateOptions } from "@/lib/generate-options";
import { resolveAmazonAsin } from "@/lib/resolve-amazon-asin";
import { categoryColor } from "@/lib/toy-card-style";
import type { Audience, CategoryId } from "@/types/toy";

export type AmazonImportPreview = {
  asin: string;
  id: string;
  affiliateUrl: string;
  name: string;
  blurb: string;
  category: CategoryId;
  audience: Audience;
  ageMin: number;
  ageMax: number;
  image: string;
  images: string[];
  /** Product videos found in the Amazon gallery / immersion player. */
  videos: string[];
  imageAlt: string;
  color: string;
  sourceTitle?: string;
  /** True when Amazon scrape failed and the admin must finish the form. */
  manualFieldsRequired: boolean;
  usedGrok: boolean;
  grokWarning?: string;
};

/**
 * Single-URL import matching live catalog style:
 * full image gallery download + short name/blurb + category/audience/ages (via Grok when keyed).
 */
export async function importAmazonListingPreview(
  url: string,
): Promise<AmazonImportPreview> {
  const asin = await resolveAmazonAsin(url);
  if (!asin) {
    throw new Error(
      "Could not find an Amazon ASIN in that link. Use a /dp/ URL, a 10-character ASIN, or an amzn.to / a.co short link.",
    );
  }

  const [live, drafts] = await Promise.all([getCatalogToys(), getDraftToys()]);
  const usedIds = new Set<string>([
    ...live.map((t) => t.id),
    ...drafts.map((t) => t.id),
  ]);

  let usedGrok = false;
  let grokWarning: string | undefined;

  const draft = await buildDraftFromAsin(
    asin,
    usedIds,
    normalizeGenerateOptions({
      count: 1,
      agePreset: "all",
      audience: "any",
      category: "any",
    }),
    {
      enrich: async ({ sourceTitle, description }) => {
        const result = await draftListingWithGrok({
          sourceTitle,
          description,
        });
        usedGrok = result.usedGrok;
        if (result.error) grokWarning = result.error;
        return result.fields;
      },
    },
  );

  if (!draft) {
    const affiliateUrl = storedParentAffiliateUrl(asin);
    return {
      asin,
      id: `toy-${asin.toLowerCase()}`,
      affiliateUrl,
      name: "",
      blurb: "",
      category: "games",
      audience: "all",
      ageMin: 3,
      ageMax: 12,
      image: "/categories/games.svg",
      images: ["/categories/games.svg"],
      videos: [],
      imageAlt: "Toy",
      color: categoryColor("games"),
      manualFieldsRequired: true,
      usedGrok: false,
      grokWarning:
        "Amazon blocked the product page, so the link was kept. Fill in the name, blurb, and photo, then save.",
    };
  }

  const images =
    draft.images && draft.images.length > 0 ? draft.images : [draft.image];
  const videos = (draft.videos ?? [])
    .map((src) => src.trim())
    .filter(Boolean)
    .slice(0, 1);

  return {
    asin: draft.asin || asin,
    id: draft.id,
    affiliateUrl: draft.affiliateUrl ?? "",
    name: draft.name,
    blurb: draft.blurb,
    category: draft.category,
    audience: draft.audience,
    ageMin: draft.ageMin,
    ageMax: draft.ageMax,
    image: draft.image || images[0]!,
    images,
    videos,
    imageAlt: draft.imageAlt,
    color: draft.color,
    sourceTitle: draft.sourceTitle,
    manualFieldsRequired: false,
    usedGrok,
    grokWarning,
  };
}
