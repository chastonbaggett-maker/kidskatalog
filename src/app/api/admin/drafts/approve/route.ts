import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { approveToyProposal, toProposalApi } from "@/lib/toy-proposals";

export const dynamic = "force-dynamic";

/** @deprecated Prefer POST /api/admin/toy-proposals/:id/approve */
export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; id?: string };
  const ids = [
    ...(Array.isArray(body.ids) ? body.ids : []),
    ...(body.id ? [body.id] : []),
  ].filter((value): value is string => Boolean(value));

  if (ids.length === 0) {
    return NextResponse.json({ error: "No draft ids provided" }, { status: 400 });
  }

  const approved = [];
  const missing: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    const result = await approveToyProposal(id);
    if ("error" in result) {
      if (result.status === 404) missing.push(id);
      else errors.push({ id, error: result.error ?? "Approve failed" });
      continue;
    }
    approved.push(toProposalApi(result.proposal));
  }

  return NextResponse.json({
    approved,
    missing,
    errors,
    count: approved.length,
  });
}
