import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/metrics-store";

export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId?: string; event?: string };
  await recordVisit(body.sessionId);

  if (body.event === "kart_add") {
    const { incrementMetric } = await import("@/lib/metrics-store");
    await incrementMetric("kartAdds");
  } else if (body.event === "kart_email") {
    const { incrementMetric } = await import("@/lib/metrics-store");
    await incrementMetric("kartEmailsSent");
  } else if (body.event === "crazy_mode") {
    const { incrementMetric } = await import("@/lib/metrics-store");
    await incrementMetric("crazyModeActivations");
  }

  return NextResponse.json({ ok: true });
}
