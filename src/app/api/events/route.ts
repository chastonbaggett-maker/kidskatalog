import { NextResponse } from "next/server";
import { EMPTY_PARENT_FUNNEL, sanitizeParentFunnelEvent } from "@/lib/parent-funnel";
import {
  getParentFunnelTotals,
  recordParentFunnelEvent,
} from "@/lib/metrics-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Parent Mode money-funnel events.
 * POST body is allowlisted (event name + optional toy id). No PII, no Amazon tags.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const event = sanitizeParentFunnelEvent(body);
  if (!event) {
    return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });
  }

  console.info("[parent-funnel]", JSON.stringify(event));
  try {
    await recordParentFunnelEvent(event);
  } catch (error) {
    console.warn("[parent-funnel] persist failed", error);
  }
  return NextResponse.json({ ok: true });
}

/** Aggregated funnel counts only — no sessions, emails, or Amazon tags. */
export async function GET() {
  try {
    const totals = await getParentFunnelTotals();
    return NextResponse.json({ ok: true, totals });
  } catch (error) {
    console.warn("[parent-funnel] read failed", error);
    return NextResponse.json({ ok: true, totals: { ...EMPTY_PARENT_FUNNEL } });
  }
}
