import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { previewAmazonImport } from "@/lib/amazon-import";

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { url?: string };
  if (!body.url) {
    return NextResponse.json({ error: "Missing Amazon URL" }, { status: 400 });
  }
  try {
    const preview = await previewAmazonImport(body.url);
    return NextResponse.json({ preview });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 400 },
    );
  }
}
