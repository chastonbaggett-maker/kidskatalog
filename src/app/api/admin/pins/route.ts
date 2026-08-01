import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  createAdminPin,
  listAdminPins,
  removeAdminPin,
} from "@/lib/admin-store";

export async function GET(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pins = await listAdminPins();
  return NextResponse.json({
    pins: pins.map((p) => ({
      id: p.id,
      label: p.label,
      pin: p.pin,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { pin?: string; label?: string };
  const pin = body.pin?.replace(/\D/g, "").slice(0, 4) ?? "";
  if (pin.length !== 4) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }
  const record = await createAdminPin(pin, body.label || "Admin");
  return NextResponse.json({
    pin: { id: record.id, label: record.label, pin: record.pin, createdAt: record.createdAt },
  });
}

export async function DELETE(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const pins = await listAdminPins();
  if (pins.length <= 1) {
    return NextResponse.json({ error: "At least one admin PIN must remain" }, { status: 400 });
  }
  const ok = await removeAdminPin(id);
  if (!ok) return NextResponse.json({ error: "PIN not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
