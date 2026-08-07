import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { generateDraftListings } from "@/lib/generate-listings";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let count = 10;
  try {
    const body = (await req.json()) as { count?: number };
    if (typeof body.count === "number" && body.count > 0) {
      count = Math.min(20, Math.floor(body.count));
    }
  } catch {
    // default 10
  }

  try {
    const result = await generateDraftListings(count);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 },
    );
  }
}
