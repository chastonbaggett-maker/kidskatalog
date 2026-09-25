import { NextResponse } from "next/server";
import {
  clearDeviceCookieHeader,
  readDeviceCookie,
  unpairDeviceSecret,
} from "@/lib/device-pair-store";
import { PARENT_GATE_COOKIE, PARENT_GATE_UNLOCKED_FLAG } from "@/lib/parent-birth-year";

export const runtime = "nodejs";

function gateUnlocked(req: Request): boolean {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed === `${PARENT_GATE_COOKIE}=${PARENT_GATE_UNLOCKED_FLAG}`) return true;
  }
  return false;
}

export async function POST(req: Request) {
  if (!gateUnlocked(req)) {
    return NextResponse.json({ error: "Grown-up check required" }, { status: 403 });
  }
  await unpairDeviceSecret(readDeviceCookie(req));
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", clearDeviceCookieHeader());
  return res;
}
