import { NextResponse } from "next/server";
import { createHandoff } from "@/lib/device-pair-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { toyIds?: unknown };
  try {
    body = (await req.json()) as { toyIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const result = await createHandoff(body.toyIds);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    url: result.url,
    svg: result.svg,
  });
}
