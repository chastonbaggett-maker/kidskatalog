import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { submitToyProposals, toProposalApi } from "@/lib/toy-proposals";

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

  const result = await submitToyProposals(ids);
  return NextResponse.json({
    ...result,
    proposals: result.published.map((toy) => toProposalApi({ ...toy, reviewStatus: "published" })),
  });
}
