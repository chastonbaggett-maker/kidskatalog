import { NextResponse } from "next/server";
import { deviceSession, readDeviceCookie } from "@/lib/device-pair-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await deviceSession(readDeviceCookie(req));
  return NextResponse.json(session);
}
