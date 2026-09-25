import { NextResponse } from "next/server";
import { createPairToken, listOwnerDevices } from "@/lib/device-pair-store";
import { getParentUser } from "@/lib/parent-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to set up Kid Mode" }, { status: 401 });
  }
  const setup = await createPairToken(user.id);
  const devices = await listOwnerDevices(user.id);
  return NextResponse.json({ ok: true, ...setup, devices });
}
