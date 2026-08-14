import "server-only";
import { parseAsin, parseBulkAmazonInputs } from "@/lib/amazon-import";
import { getCatalogToys } from "@/lib/catalog-store";
import { addDraftToys, getDraftToys } from "@/lib/draft-store";
import {
  draftListingWithGrok,
  getGrokApiKey,
} from "@/lib/grok-listing";
import {
  buildDraftFromAsin,
  type GenerateProgressEvent,
  type GenerateProgressHandler,
} from "@/lib/generate-listings";
import { normalizeGenerateOptions } from "@/lib/generate-options";
import type { DraftToy } from "@/types/toy";

export type BulkAddResult = {
  generated: DraftToy[];
  attempted: number;
  skippedExisting: number;
  failed: number;
  invalidTokens: number;
  truncated: boolean;
  usedGrok: boolean;
  grokWarning?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function liveAsinSet(live: Array<{ affiliateUrl: string }>): Set<string> {
  const asins = new Set<string>();
  for (const toy of live) {
    const asin = parseAsin(toy.affiliateUrl);
    if (asin) asins.add(asin.toUpperCase());
  }
  return asins;
}

export async function bulkAddDraftListings(
  text: string,
  onProgress?: GenerateProgressHandler,
): Promise<BulkAddResult> {
  const emit = (event: GenerateProgressEvent) => {
    try {
      onProgress?.(event);
    } catch {
      // ignore UI callback errors
    }
  };

  const parsed = parseBulkAmazonInputs(text);
  if (parsed.asins.length === 0) {
    throw new Error(
      parsed.invalid.length > 0
        ? "No valid Amazon URLs or ASINs found in the paste."
        : "Paste up to 100 Amazon product URLs (one per line).",
    );
  }

  const total = parsed.asins.length;
  const hasGrokKey = Boolean(getGrokApiKey());

  emit({
    type: "stage",
    stage: "import",
    message: hasGrokKey
      ? `Bulk adding ${total} URL${total === 1 ? "" : "s"} with Grok…`
      : `Bulk adding ${total} URL${total === 1 ? "" : "s"} (set XAI_API_KEY for Grok)…`,
    current: 0,
    total,
  });

  const [live, drafts] = await Promise.all([getCatalogToys(), getDraftToys()]);
  const liveAsins = liveAsinSet(live);
  const usedIds = new Set<string>([
    ...live.map((t) => t.id),
    ...drafts.map((t) => t.id),
  ]);
  const batchAsins = new Set<string>();
  const options = normalizeGenerateOptions({
    count: total,
    agePreset: "all",
    audience: "any",
    category: "any",
  });

  const generated: DraftToy[] = [];
  let failed = 0;
  let skippedExisting = 0;
  let usedGrok = false;
  let grokWarning: string | undefined;

  for (let i = 0; i < parsed.asins.length; i += 1) {
    const asin = parsed.asins[i]!;
    if (liveAsins.has(asin) || batchAsins.has(asin)) {
      skippedExisting += 1;
      emit({
        type: "stage",
        stage: "import",
        message: `Skipped live match (${asin})`,
        current: generated.length,
        total,
      });
      continue;
    }

    await sleep(350);
    try {
      const draft = await buildDraftFromAsin(asin, usedIds, options, {
        enrich: async ({ sourceTitle, description }) => {
          const result = await draftListingWithGrok({
            sourceTitle,
            description,
          });
          if (result.usedGrok) usedGrok = true;
          if (result.error && !grokWarning) grokWarning = result.error;
          return result.fields;
        },
      });

      if (!draft) {
        failed += 1;
        emit({
          type: "item",
          current: generated.length,
          total,
          name: asin,
          ok: false,
        });
        continue;
      }

      const draftAsin = (
        draft.asin ||
        parseAsin(draft.affiliateUrl) ||
        asin
      ).toUpperCase();
      if (liveAsins.has(draftAsin)) {
        skippedExisting += 1;
        continue;
      }

      generated.push(draft);
      batchAsins.add(draftAsin);
      emit({
        type: "item",
        current: generated.length,
        total,
        name: draft.name,
        ok: true,
      });
      emit({
        type: "stage",
        stage: "import",
        message: `Drafted ${draft.name} (${generated.length}/${total})`,
        current: generated.length,
        total,
      });
    } catch {
      failed += 1;
      emit({
        type: "item",
        current: generated.length,
        total,
        name: asin,
        ok: false,
      });
    }
  }

  if (generated.length > 0) {
    emit({
      type: "stage",
      stage: "save",
      message: "Saving drafts for review…",
      current: generated.length,
      total,
    });
    await addDraftToys(generated);
  }

  const result: BulkAddResult = {
    generated,
    attempted: total,
    skippedExisting,
    failed,
    invalidTokens: parsed.invalid.length,
    truncated: parsed.truncated,
    usedGrok,
    grokWarning:
      grokWarning ||
      (!hasGrokKey
        ? "XAI_API_KEY (or GROK_API_KEY) is not set — used local listing guidelines."
        : undefined),
  };

  emit({
    type: "done",
    result: {
      generated: result.generated,
      attempted: result.attempted,
      skippedExisting: result.skippedExisting,
      failed: result.failed,
      searchHits: 0,
    },
  });

  return result;
}
