import { NextResponse } from "next/server";
import { createHandoff } from "@/lib/device-pair-store";
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
    const result = await createHandoff(body.toyIds);
    if (!result.ok) {
      const status = result.status === 503 ? 503 : 400;
      return NextResponse.json(
        { error: status === 503 ? "Service not ready" : result.error },
        { status },
      );
    }
    return NextResponse.json({
      ok: true,
      code: result.code,
      url: result.url,
      svg: result.svg,
    });
  } catch (error) {
    console.error("kids handoff failed", error);
    const status = error instanceof StoreUnavailableError ? 503 : 500;
    return NextResponse.json({ error: "Service not ready" }, { status });
  }
}
