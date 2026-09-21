import "server-only";
import type { Toy } from "@/types/toy";
import { addCatalogToy, getCatalogToy } from "@/lib/catalog-store";
import {
  getDraftToy,
  getStagedDraftToys,
  setDraftReviewStatus,
  toLiveToy,
} from "@/lib/draft-store";
import { isStagedDraft } from "@/lib/queue-status";
import { assertLiveToyPublishable } from "@/lib/publish-locks";

export type SubmitApprovalResult = {
  published: Toy[];
  skipped: Array<{ id: string; reason: string }>;
  missing: string[];
  count: number;
};

/**
 * Only publish path for new catalog cards.
 * Approve stages; this batch is what actually goes live.
 */
export async function submitApprovedDrafts(
  ids?: string[],
): Promise<SubmitApprovalResult> {
  const published: Toy[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  const missing: string[] = [];

  const requested = Array.isArray(ids) ? ids.filter(Boolean) : [];
  const targets =
    requested.length > 0
      ? await Promise.all(requested.map((id) => getDraftToy(id)))
      : await getStagedDraftToys();

  const seen = new Set<string>();

  for (let i = 0; i < targets.length; i += 1) {
    const draft = targets[i];
    const requestedId = requested[i];
    if (!draft) {
      if (requestedId) missing.push(requestedId);
      continue;
    }
    if (seen.has(draft.id)) continue;
    seen.add(draft.id);

    if (!isStagedDraft(draft)) {
      skipped.push({
        id: draft.id,
        reason: "Approve stages only — Submit Approval publishes staged cards",
      });
      continue;
    }

    const toy = toLiveToy(draft);
    const lock = assertLiveToyPublishable(toy);
    if (!lock.ok) {
      skipped.push({ id: draft.id, reason: lock.error });
      continue;
    }

    if (await getCatalogToy(toy.id)) {
      skipped.push({ id: toy.id, reason: "id already live" });
      continue;
    }

    try {
      const created = await addCatalogToy(toy);
      await setDraftReviewStatus(draft.id, "published");
      published.push(created);
    } catch (error) {
      skipped.push({
        id: toy.id,
        reason: error instanceof Error ? error.message : "Publish failed",
      });
    }
  }

  return {
    published,
    skipped,
    missing,
    count: published.length,
  };
}
