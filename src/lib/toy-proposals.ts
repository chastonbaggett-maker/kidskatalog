import "server-only";
import { getCatalogToys } from "@/lib/catalog-store";
import {
  addDraftToys,
  draftAsin,
  getDraftToy,
  getDraftToys,
  getDraftToysByStatus,
  occupiedProposalAsins,
  setDraftReviewStatus,
  updateDraftToy,
} from "@/lib/draft-store";
import {
  collectProposalImages,
  extractRequiredProposalAsin,
  isProposalParseError,
  parseProposalInput,
  type ProposalInput,
} from "@/lib/proposal";
import { isShortAmazonLink } from "@/lib/amazon-asin";
import { resolveAmazonAsin } from "@/lib/resolve-amazon-asin";
import {
  MAX_TOY_PROPOSAL_BATCH,
  isQueueStatus,
  normalizeQueueStatus,
} from "@/lib/queue-status";
import { submitApprovedDrafts } from "@/lib/submit-approval";
import type { DraftReviewStatus, DraftToy } from "@/types/toy";

export { MAX_TOY_PROPOSAL_BATCH };

export type ProposalApiError = { name?: string; asin?: string; error: string };

export type IngestToyProposalsResult = {
  proposals: DraftToy[];
  count: number;
  errors: ProposalApiError[];
  skipped: ProposalApiError[];
};

function asInputList(body: unknown): {
  inputs: ProposalInput[];
  source?: string;
  source_ref?: string;
} {
  if (!body || typeof body !== "object") {
    return { inputs: [] };
  }
  if (Array.isArray(body)) {
    return { inputs: body as ProposalInput[] };
  }
  const record = body as {
    proposals?: unknown;
    cards?: unknown;
    toys?: unknown;
    items?: unknown;
    source?: string;
    source_ref?: string;
    sourceRef?: string;
  };
  const source = typeof record.source === "string" ? record.source.trim() : "";
  const source_ref =
    typeof record.source_ref === "string"
      ? record.source_ref.trim()
      : typeof record.sourceRef === "string"
        ? record.sourceRef.trim()
        : "";
  const lists = [record.proposals, record.cards, record.toys, record.items];
  for (const list of lists) {
    if (Array.isArray(list)) {
      return {
        inputs: list as ProposalInput[],
        source: source || undefined,
        source_ref: source_ref || undefined,
      };
    }
  }
  return {
    inputs: [body as ProposalInput],
    source: source || undefined,
    source_ref: source_ref || undefined,
  };
}

export function toProposalApi(draft: DraftToy) {
  const status = normalizeQueueStatus(draft.reviewStatus);
  const asin = draftAsin(draft);
  return {
    ...draft,
    reviewStatus: status,
    status,
    asin: asin || draft.asin,
    amazon_url: asin ? `https://www.amazon.com/dp/${asin}` : undefined,
    affiliate_url: draft.affiliateUrl,
    notes: draft.notes || draft.sourceNotes,
    source: draft.source,
    source_ref: draft.sourceRef,
  };
}

export async function listToyProposals(statusRaw?: string | null) {
  const status = statusRaw?.trim();
  if (status && !isQueueStatus(status)) {
    return {
      error: "status must be pending, staged, published, or rejected",
    } as const;
  }
  const normalized = status ? normalizeQueueStatus(status) : undefined;
  const drafts = await getDraftToysByStatus(normalized);
  return {
    proposals: drafts.map(toProposalApi),
    count: drafts.length,
    status: normalized ?? null,
  };
}

export async function ingestToyProposals(
  body: unknown,
): Promise<
  | { ok: true; result: IngestToyProposalsResult }
  | { ok: false; error: string; status: number }
> {
  const { inputs, source, source_ref } = asInputList(body);
  if (inputs.length === 0) {
    return { ok: false, error: "No proposal payload", status: 400 };
  }
  if (inputs.length > MAX_TOY_PROPOSAL_BATCH) {
    return {
      ok: false,
      error: `Batch max is ${MAX_TOY_PROPOSAL_BATCH}`,
      status: 400,
    };
  }

  const [live, drafts] = await Promise.all([getCatalogToys(), getDraftToys()]);
  const usedIds = new Set<string>([
    ...live.map((t) => t.id),
    ...drafts.map((t) => t.id),
  ]);
  const occupiedAsins = await occupiedProposalAsins(live);

  const created: DraftToy[] = [];
  const errors: ProposalApiError[] = [];
  const skipped: ProposalApiError[] = [];

  for (const raw of inputs) {
    const input: ProposalInput = {
      ...raw,
      source: raw.source || source,
      source_ref: raw.source_ref || raw.sourceRef || source_ref,
    };
    if (!extractRequiredProposalAsin(input)) {
      const candidate = [
        input.asin,
        input.amazon_url,
        input.amazonUrl,
        input.amazon,
        input.affiliate_url,
        input.affiliateUrl,
      ].find((value) => typeof value === "string" && isShortAmazonLink(value));
      if (candidate) {
        const resolved = await resolveAmazonAsin(candidate);
        if (resolved) input.asin = resolved;
      }
    }
    const parsed = parseProposalInput(input, usedIds);
    if (isProposalParseError(parsed)) {
      errors.push({ name: input.name, error: parsed.error });
      continue;
    }
    const asin = draftAsin(parsed);
    if (asin && occupiedAsins.has(asin)) {
      skipped.push({
        name: parsed.name,
        asin,
        error: "duplicate ASIN",
      });
      continue;
    }
    usedIds.add(parsed.id);
    if (asin) occupiedAsins.add(asin);
    created.push(parsed);
  }

  const added = created.length > 0 ? await addDraftToys(created) : [];
  return {
    ok: true,
    result: {
      proposals: added,
      count: added.length,
      errors,
      skipped,
    },
  };
}

export async function approveToyProposal(
  id: string,
): Promise<{ proposal: DraftToy } | { error: string; status: number }> {
  const existing = await getDraftToy(id);
  if (!existing) return { error: "Proposal not found", status: 404 } as const;
  const status = normalizeQueueStatus(existing.reviewStatus);
  if (status === "published") {
    return { error: "Already published", status: 400 } as const;
  }
  if (status === "rejected") {
    return { error: "Rejected proposals cannot be staged", status: 400 } as const;
  }
  const next =
    status === "staged"
      ? existing
      : await setDraftReviewStatus(id, "staged");
  if (!next) return { error: "Proposal not found", status: 404 } as const;
  return { proposal: next };
}

const PENDING_EDIT_FIELDS = new Set(["name", "blurb", "images", "image"]);

/**
 * Queue-craft edit. Only `name`, `blurb`, and `images` (plus singular `image`)
 * while the row is still pending. Does not stage or publish.
 */
export async function patchPendingToyProposal(
  id: string,
  body: unknown,
): Promise<{ proposal: DraftToy } | { error: string; status: number }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Expected JSON object", status: 400 };
  }
  const record = body as Record<string, unknown>;
  const unknown = Object.keys(record).filter((key) => !PENDING_EDIT_FIELDS.has(key));
  if (unknown.length > 0) {
    return {
      error: "Only name, blurb, and images can be updated",
      status: 400,
    };
  }
  if (!("name" in record) && !("blurb" in record) && !("images" in record) && !("image" in record)) {
    return { error: "No fields to update", status: 400 };
  }

  const existing = await getDraftToy(id);
  if (!existing) return { error: "Proposal not found", status: 404 };
  if (normalizeQueueStatus(existing.reviewStatus) !== "pending") {
    return { error: "Only pending proposals can be edited", status: 409 };
  }

  const patch: Partial<DraftToy> = {};
  if ("name" in record) {
    if (typeof record.name !== "string" || !record.name.trim()) {
      return { error: "name must be a non-empty string", status: 400 };
    }
    patch.name = record.name.trim();
    patch.imageAlt = `${patch.name} toy`;
  }
  if ("blurb" in record) {
    if (typeof record.blurb !== "string" || !record.blurb.trim()) {
      return { error: "blurb must be a non-empty string", status: 400 };
    }
    patch.blurb = record.blurb.trim();
  }
  if ("images" in record || "image" in record) {
    if ("images" in record && !isImageField(record.images)) {
      return { error: "images must be a string or list of strings", status: 400 };
    }
    if ("image" in record && typeof record.image !== "string") {
      return { error: "image must be a string", status: 400 };
    }
    const images = collectProposalImages({
      images: isImageField(record.images) ? record.images : undefined,
      image: typeof record.image === "string" ? record.image : undefined,
    });
    if (images.length === 0) {
      return {
        error: "images must include at least one allowed image URL",
        status: 400,
      };
    }
    patch.image = images[0];
    patch.images = images;
  }

  const next = await updateDraftToy(id, patch);
  if (!next) return { error: "Proposal not found", status: 404 };
  return { proposal: next };
}

function isImageField(value: unknown): value is string | string[] {
  if (typeof value === "string") return true;
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function rejectToyProposal(
  id: string,
): Promise<{ proposal: DraftToy } | { error: string; status: number }> {
  const existing = await getDraftToy(id);
  if (!existing) return { error: "Proposal not found", status: 404 } as const;
  const status = normalizeQueueStatus(existing.reviewStatus);
  if (status === "published") {
    return { error: "Published proposals cannot be rejected", status: 400 } as const;
  }
  const next =
    status === "rejected"
      ? existing
      : await setDraftReviewStatus(id, "rejected");
  if (!next) return { error: "Proposal not found", status: 404 } as const;
  return { proposal: next };
}

export async function submitToyProposals(ids?: string[]) {
  return submitApprovedDrafts(ids);
}

export function parseStatusQuery(raw: string | null): DraftReviewStatus | undefined {
  if (!raw) return undefined;
  if (!isQueueStatus(raw)) return undefined;
  return normalizeQueueStatus(raw);
}
