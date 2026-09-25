import { NextResponse } from "next/server";
import { readDeviceCookie, syncDeviceKart } from "@/lib/device-pair-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { toyIds?: unknown };
  try {
    body = (await req.json()) as { toyIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const result = await syncDeviceKart(readDeviceCookie(req), body.toyIds);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
