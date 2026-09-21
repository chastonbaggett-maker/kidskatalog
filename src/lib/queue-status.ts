import type { DraftReviewStatus, DraftToy } from "@/types/toy";

export const QUEUE_STATUSES = [
  "pending",
  "staged",
  "published",
  "rejected",
] as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const MAX_TOY_PROPOSAL_BATCH = 25;

/** Map legacy proposed/approved plus spec names onto the queue. */
export function normalizeQueueStatus(
  raw?: string | null,
): DraftReviewStatus {
  const key = (raw || "").trim().toLowerCase();
  if (key === "approved" || key === "staged") return "staged";
  if (key === "published") return "published";
  if (key === "rejected") return "rejected";
  return "pending";
}

export function isQueueStatus(raw?: string | null): raw is QueueStatus {
  const key = (raw || "").trim().toLowerCase();
  return (
    key === "pending" ||
    key === "staged" ||
    key === "published" ||
    key === "rejected" ||
    key === "proposed" ||
    key === "approved"
  );
}

export function isStagedDraft(draft: Pick<DraftToy, "reviewStatus">): boolean {
  return normalizeQueueStatus(draft.reviewStatus) === "staged";
}

export function isPendingDraft(draft: Pick<DraftToy, "reviewStatus">): boolean {
  return normalizeQueueStatus(draft.reviewStatus) === "pending";
}

export function isActiveQueueDraft(
  draft: Pick<DraftToy, "reviewStatus">,
): boolean {
  const status = normalizeQueueStatus(draft.reviewStatus);
  return status === "pending" || status === "staged";
}

/** ASINs that must not be ingested again (live + pending/staged/published). */
export function occupiesAsin(draft: Pick<DraftToy, "reviewStatus">): boolean {
  const status = normalizeQueueStatus(draft.reviewStatus);
  return status !== "rejected";
}
