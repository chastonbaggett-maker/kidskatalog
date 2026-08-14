import { NextResponse } from "next/server";
import {
  clearFailedAttempts,
  createAdminPin,
  hasAdminPins,
  isLockedOut,
  recordFailedAttempt,
  verifyAdminPin,
} from "@/lib/admin-store";
import {
  clearSessionCookieHeader,
  getSessionFromRequest,
  sessionCookieHeader,
  signSession,
} from "@/lib/admin-auth";

function setupErrorResponse(error: unknown) {
  console.error("Admin setup failed", error);
  const message =
    error instanceof Error ? error.message : "Could not save admin PIN";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(req: Request) {
  const session = getSessionFromRequest(req as import("next/server").NextRequest);
  const pinsExist = await hasAdminPins();
  return NextResponse.json({
    pinsExist,
    authenticated: Boolean(session),
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { action?: string; pin?: string; label?: string };

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", clearSessionCookieHeader());
    return res;
  }

  const pin = body.pin?.replace(/\D/g, "").slice(0, 4) ?? "";
  if (pin.length !== 4) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }

  if (body.action === "setup") {
    try {
      const record = await createAdminPin(pin, body.label || "Admin");
      const token = signSession(record.id);
      const res = NextResponse.json({ ok: true, authenticated: true });
      res.headers.set("Set-Cookie", sessionCookieHeader(token));
      return res;
    } catch (error) {
      return setupErrorResponse(error);
    }
  }

  if (body.action === "verify") {
    if (await isLockedOut()) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const record = await verifyAdminPin(pin);
    if (!record) {
      await recordFailedAttempt();
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }
    await clearFailedAttempts();
    const token = signSession(record.id);
    const res = NextResponse.json({ ok: true, authenticated: true });
    res.headers.set("Set-Cookie", sessionCookieHeader(token));
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
