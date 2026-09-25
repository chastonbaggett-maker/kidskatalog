import { NextResponse } from "next/server";
import { deviceCookieHeader, pairDevice } from "@/lib/device-pair-store";
import { StoreUnavailableError } from "@/lib/store-env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const result = await pairDevice((body.token || "").trim());
    if (!result.ok) {
      const status = result.status === 503 ? 503 : 400;
      return NextResponse.json(
        { error: status === 503 ? "Service not ready" : result.error },
        { status },
      );
    }
    const res = NextResponse.json({ ok: true, paired: true, deviceId: result.deviceId });
    res.headers.set("Set-Cookie", deviceCookieHeader(result.secret));
    return res;
  } catch (error) {
    console.error("kids pair failed", error);
    const status = error instanceof StoreUnavailableError ? 503 : 500;
    return NextResponse.json({ error: "Service not ready" }, { status });
  }
}
