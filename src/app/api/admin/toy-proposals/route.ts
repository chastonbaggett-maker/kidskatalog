import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";
import {
  ingestToyProposals,
  listToyProposals,
  toProposalApi,
} from "@/lib/toy-proposals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!requireAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status");
  const listed = await listToyProposals(status);
  if ("error" in listed) {
    return NextResponse.json({ error: listed.error }, { status: 400 });
  }
  return NextResponse.json(listed);
}

export async function POST(req: NextRequest) {
  if (!requireAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const ingested = await ingestToyProposals(body);
  if (!ingested.ok) {
    return NextResponse.json({ error: ingested.error }, { status: ingested.status });
  }

  const { proposals, count, errors, skipped } = ingested.result;
  const status =
    count > 0 ? 201 : errors.length > 0 || skipped.length > 0 ? 400 : 400;

  return NextResponse.json(
    {
      proposals: proposals.map(toProposalApi),
      drafts: proposals.map(toProposalApi),
      count,
      errors,
      skipped,
    },
    { status },
  );
}
