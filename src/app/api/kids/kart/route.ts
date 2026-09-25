import { NextResponse } from "next/server";
import { readDeviceCookie, syncDeviceKart } from "@/lib/device-pair-store";
import { StoreUnavailableError } from "@/lib/store-env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { toyIds?: unknown };
  try {
    body = (await req.json()) as { toyIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const result = await syncDeviceKart(readDeviceCookie(req), body.toyIds);
    if (!result.ok) {
      const status = result.status === 503 ? 503 : 401;
      return NextResponse.json(
        { error: status === 503 ? "Service not ready" : result.error },
        { status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("kids kart sync failed", error);
    const status = error instanceof StoreUnavailableError ? 503 : 500;
    return NextResponse.json({ error: "Service not ready" }, { status });
  }
}
