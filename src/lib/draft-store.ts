import "server-only";
import type { DraftReviewStatus, DraftToy, Toy } from "@/types/toy";
import { readStore, writeStore } from "@/lib/json-store";
import { draftReviewStatus, isApprovedDraft } from "@/lib/proposal";

export type { DraftToy };

type DraftsData = {
  version: number;
  drafts: DraftToy[];
};

const DEFAULT_DRAFTS: DraftsData = {
  version: 1,
  drafts: [],
};

function normalizeDraft(draft: DraftToy): DraftToy {
  return {
    ...draft,
    reviewStatus: draftReviewStatus(draft),
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

export async function getDraftToy(id: string): Promise<DraftToy | undefined> {
  const data = await loadDrafts();
  return data.drafts.find((t) => t.id === id);
}

export async function getApprovedDraftToys(): Promise<DraftToy[]> {
  const data = await loadDrafts();
  return data.drafts.filter(isApprovedDraft);
}

export async function addDraftToys(toys: DraftToy[]): Promise<DraftToy[]> {
  const data = await loadDrafts();
  const existingIds = new Set(data.drafts.map((t) => t.id));
  const added: DraftToy[] = [];
  for (const toy of toys) {
    if (existingIds.has(toy.id)) continue;
    const next = normalizeDraft({
      ...toy,
      reviewStatus: toy.reviewStatus === "approved" ? "approved" : "proposed",
      createdAt: toy.createdAt || new Date().toISOString(),
    });
    data.drafts.unshift(next);
    existingIds.add(next.id);
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
  return updateDraftToy(id, {
    reviewStatus,
    reviewedAt: new Date().toISOString(),
  });
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
    reviewStatus: _reviewStatus,
    reviewedAt: _reviewedAt,
    ...toy
  } = draft;
  return toy;
}
