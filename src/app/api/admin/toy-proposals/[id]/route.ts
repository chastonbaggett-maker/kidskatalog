import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";
import { patchPendingToyProposal, toProposalApi } from "@/lib/toy-proposals";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

/** Edit pending `name`, `blurb`, and `images`. Does not stage or publish. */
async function editPending(req: NextRequest, { params }: Props) {
  if (!requireAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const result = await patchPendingToyProposal(id, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ proposal: toProposalApi(result.proposal) });
}

export async function PATCH(req: NextRequest, ctx: Props) {
  return editPending(req, ctx);
}

export async function PUT(req: NextRequest, ctx: Props) {
  return editPending(req, ctx);
}
