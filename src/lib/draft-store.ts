import "server-only";
import type { DraftReviewStatus, DraftToy, Toy } from "@/types/toy";
import { readStore, writeStore } from "@/lib/json-store";
import { parseAsin } from "@/lib/amazon-import";
import {
  occupiesAsin,
  normalizeQueueStatus,
  isStagedDraft,
} from "@/lib/queue-status";

export type { DraftToy };

type DraftsData = {
  version: number;
  drafts: DraftToy[];
};

const DEFAULT_DRAFTS: DraftsData = {
  version: 1,
  drafts: [],
};

export function draftAsin(draft: Pick<DraftToy, "asin" | "affiliateUrl">): string | null {
  const fromField = (draft.asin || "").trim().toUpperCase();
  if (fromField) return fromField;
  const parsed = parseAsin(draft.affiliateUrl ?? "");
  return parsed ? parsed.toUpperCase() : null;
}

function normalizeDraft(draft: DraftToy): DraftToy {
  const status = normalizeQueueStatus(draft.reviewStatus);
  const notes = (draft.notes || draft.sourceNotes || "").trim();
  return {
    ...draft,
    reviewStatus: status,
    ...(notes ? { notes, sourceNotes: notes } : {}),
  };
}

async function loadDrafts(): Promise<DraftsData> {
  const data = await readStore("drafts", DEFAULT_DRAFTS);
  if (!Array.isArray(data.drafts)) return DEFAULT_DRAFTS;
  return {
    ...data,
    drafts: data.drafts.map(normalizeDraft),
  };
}

async function saveDrafts(data: DraftsData): Promise<void> {
  await writeStore("drafts", {
    ...data,
    drafts: data.drafts.map(normalizeDraft),
  });
}

export async function getDraftToys(): Promise<DraftToy[]> {
  const data = await loadDrafts();
  return data.drafts;
}

export async function getDraftToysByStatus(
  status?: DraftReviewStatus,
): Promise<DraftToy[]> {
  const drafts = await getDraftToys();
  if (!status) return drafts;
  return drafts.filter((d) => normalizeQueueStatus(d.reviewStatus) === status);
}

export async function getDraftToy(id: string): Promise<DraftToy | undefined> {
  const data = await loadDrafts();
  return data.drafts.find((t) => t.id === id);
}

export async function getStagedDraftToys(): Promise<DraftToy[]> {
  const data = await loadDrafts();
  return data.drafts.filter(isStagedDraft);
}

/** @deprecated Use getStagedDraftToys */
export async function getApprovedDraftToys(): Promise<DraftToy[]> {
  return getStagedDraftToys();
}

export async function occupiedProposalAsins(
  extraLive: Array<{ affiliateUrl?: string; asin?: string }> = [],
): Promise<Set<string>> {
  const drafts = await getDraftToys();
  const asins = new Set<string>();
  for (const draft of drafts) {
    if (!occupiesAsin(draft)) continue;
    const asin = draftAsin(draft);
    if (asin) asins.add(asin);
  }
  for (const toy of extraLive) {
    const asin = draftAsin(toy);
    if (asin) asins.add(asin);
  }
  return asins;
}

export async function addDraftToys(toys: DraftToy[]): Promise<DraftToy[]> {
  const data = await loadDrafts();
  const existingIds = new Set(data.drafts.map((t) => t.id));
  const existingAsins = new Set(
    data.drafts.filter(occupiesAsin).map(draftAsin).filter((v): v is string => Boolean(v)),
  );
  const added: DraftToy[] = [];
  for (const toy of toys) {
    if (existingIds.has(toy.id)) continue;
    const asin = draftAsin(toy);
    if (asin && existingAsins.has(asin)) continue;
    const next = normalizeDraft({
      ...toy,
      reviewStatus: normalizeQueueStatus(toy.reviewStatus),
      createdAt: toy.createdAt || new Date().toISOString(),
    });
    data.drafts.unshift(next);
    existingIds.add(next.id);
    if (asin) existingAsins.add(asin);
    added.push(next);
  }
  await saveDrafts(data);
  return added;
}

export async function updateDraftToy(
  id: string,
  patch: Partial<DraftToy>,
): Promise<DraftToy | null> {
  const data = await loadDrafts();
  const index = data.drafts.findIndex((t) => t.id === id);
  if (index < 0) return null;
  const next = normalizeDraft({ ...data.drafts[index]!, ...patch, id });
  data.drafts[index] = next;
  await saveDrafts(data);
  return next;
}

export async function setDraftReviewStatus(
  id: string,
  reviewStatus: DraftReviewStatus,
): Promise<DraftToy | null> {
  const now = new Date().toISOString();
  const patch: Partial<DraftToy> = {
    reviewStatus: normalizeQueueStatus(reviewStatus),
    reviewedAt: now,
  };
  if (patch.reviewStatus === "published") patch.publishedAt = now;
  if (patch.reviewStatus === "rejected") patch.rejectedAt = now;
  return updateDraftToy(id, patch);
}

export async function deleteDraftToy(id: string): Promise<boolean> {
  const data = await loadDrafts();
  const next = data.drafts.filter((t) => t.id !== id);
  if (next.length === data.drafts.length) return false;
  data.drafts = next;
  await saveDrafts(data);
  return true;
}

export function isDraftToyPayload(value: Partial<DraftToy>): value is DraftToy {
  return Boolean(
    value.id &&
      value.name &&
      value.affiliateUrl &&
      value.category &&
      value.audience &&
      typeof value.ageMin === "number" &&
      typeof value.ageMax === "number",
  );
}

export function toLiveToy(draft: DraftToy): Toy {
  const {
    asin: _asin,
    createdAt: _createdAt,
    sourceTitle: _sourceTitle,
    sourceNotes: _sourceNotes,
    notes: _notes,
    source: _source,
    sourceRef: _sourceRef,
    reviewStatus: _reviewStatus,
    reviewedAt: _reviewedAt,
    publishedAt: _publishedAt,
    rejectedAt: _rejectedAt,
    ...toy
  } = draft;
  return toy;
}
