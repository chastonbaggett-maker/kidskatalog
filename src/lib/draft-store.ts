import "server-only";
import type { DraftToy, Toy } from "@/types/toy";
import { readStore, writeStore } from "@/lib/json-store";

export type { DraftToy };

type DraftsData = {
  version: number;
  drafts: DraftToy[];
};

const DEFAULT_DRAFTS: DraftsData = {
  version: 1,
  drafts: [],
};

async function loadDrafts(): Promise<DraftsData> {
  const data = await readStore("drafts", DEFAULT_DRAFTS);
  if (!Array.isArray(data.drafts)) return DEFAULT_DRAFTS;
  return data;
}

async function saveDrafts(data: DraftsData): Promise<void> {
  await writeStore("drafts", data);
}

export async function getDraftToys(): Promise<DraftToy[]> {
  const data = await loadDrafts();
  return data.drafts;
}

export async function getDraftToy(id: string): Promise<DraftToy | undefined> {
  const data = await loadDrafts();
  return data.drafts.find((t) => t.id === id);
}

export async function addDraftToys(toys: DraftToy[]): Promise<DraftToy[]> {
  const data = await loadDrafts();
  const existingIds = new Set(data.drafts.map((t) => t.id));
  const added: DraftToy[] = [];
  for (const toy of toys) {
    if (existingIds.has(toy.id)) continue;
    data.drafts.unshift(toy);
    existingIds.add(toy.id);
    added.push(toy);
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
  const next = { ...data.drafts[index]!, ...patch, id };
  data.drafts[index] = next;
  await saveDrafts(data);
  return next;
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
    ...toy
  } = draft;
  return toy;
}
