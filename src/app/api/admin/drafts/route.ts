import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  deleteDraftToy,
  getDraftToys,
  isDraftToyPayload,
  updateDraftToy,
  type DraftToy,
} from "@/lib/draft-store";

export async function GET(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const drafts = await getDraftToys();
  return NextResponse.json({ drafts });
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
