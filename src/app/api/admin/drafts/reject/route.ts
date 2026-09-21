import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { deleteDraftToy, getDraftToy } from "@/lib/draft-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; id?: string };
  const ids = [
    ...(Array.isArray(body.ids) ? body.ids : []),
    ...(body.id ? [body.id] : []),
  ].filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No draft ids provided" }, { status: 400 });
  }

  const rejected: string[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const existing = await getDraftToy(id);
    if (!existing) {
      missing.push(id);
      continue;
    }
    const ok = await deleteDraftToy(id);
    if (ok) rejected.push(id);
  }

  return NextResponse.json({
    rejected,
    missing,
    count: rejected.length,
  });
}
