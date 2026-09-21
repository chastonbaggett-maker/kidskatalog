import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { submitApprovedDrafts } from "@/lib/submit-approval";

export const dynamic = "force-dynamic";

/** Back-compat alias: only approved drafts publish. Prefer submit-approval. */
export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : undefined;
  const result = await submitApprovedDrafts(ids);

  return NextResponse.json({
    ...result,
    conflicts: result.skipped.filter((s) => s.reason === "id already live").map((s) => s.id),
  });
}
