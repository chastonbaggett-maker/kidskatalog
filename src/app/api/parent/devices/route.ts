import { NextResponse } from "next/server";
import { listOwnerDevices, unpairOwnerDevice } from "@/lib/device-pair-store";
import { getParentUser } from "@/lib/parent-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to see devices" }, { status: 401 });
  }
  const devices = await listOwnerDevices(user.id);
  return NextResponse.json({ devices });
}

export async function DELETE(req: Request) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to unpair a device" }, { status: 401 });
  }
  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing device" }, { status: 400 });
  const removed = await unpairOwnerDevice(user.id, id);
  if (!removed) return NextResponse.json({ error: "Device not found" }, { status: 404 });
  return NextResponse.json({ ok: true, devices: await listOwnerDevices(user.id) });
}
