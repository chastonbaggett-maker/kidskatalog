import { NextResponse } from "next/server";
import { deviceCookieHeader, pairDevice } from "@/lib/device-pair-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const result = await pairDevice((body.token || "").trim());
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, paired: true, deviceId: result.deviceId });
  res.headers.set("Set-Cookie", deviceCookieHeader(result.secret));
  return res;
}
