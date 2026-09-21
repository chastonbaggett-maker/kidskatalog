import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getCatalogToys } from "@/lib/catalog-store";
import {
  addDraftToys,
  deleteDraftToy,
  getDraftToys,
  isDraftToyPayload,
  updateDraftToy,
  type DraftToy,
} from "@/lib/draft-store";
import { isProposalParseError, parseProposalInput } from "@/lib/proposal";

export async function GET(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const drafts = await getDraftToys();
  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as DraftToy;
  const [live, drafts] = await Promise.all([getCatalogToys(), getDraftToys()]);
  const usedIds = new Set<string>([...live.map((t) => t.id), ...drafts.map((t) => t.id)]);
  const parsed = parseProposalInput(body, usedIds);
  if (isProposalParseError(parsed)) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const merged: DraftToy = {
    ...parsed,
    ...body,
    id: parsed.id,
    affiliateUrl: parsed.affiliateUrl,
    reviewStatus: "proposed",
  };
  if (!isDraftToyPayload(merged)) {
    return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
  }
  const [added] = await addDraftToys([merged]);
  return NextResponse.json({ draft: added, drafts: added ? [added] : [] }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id: string; patch: Partial<DraftToy> };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const updated = await updateDraftToy(body.id, body.patch);
  if (!updated) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  if (!isDraftToyPayload(updated)) {
    return NextResponse.json({ error: "Invalid draft after update" }, { status: 400 });
  }
  return NextResponse.json({ draft: updated });
}

export async function DELETE(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteDraftToy(id);
  if (!ok) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
