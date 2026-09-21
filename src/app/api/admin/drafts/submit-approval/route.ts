import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { submitApprovedDrafts } from "@/lib/submit-approval";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = (await req.json()) as { ids?: string[] };
    if (Array.isArray(body.ids)) ids = body.ids.filter(Boolean);
  } catch {
    ids = undefined;
  }

  const result = await submitApprovedDrafts(ids);
  return NextResponse.json(result);
}
