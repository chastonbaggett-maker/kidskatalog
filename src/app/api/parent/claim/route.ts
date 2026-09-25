import { NextResponse } from "next/server";
import { claimHandoff } from "@/lib/device-pair-store";
import { getParentUser } from "@/lib/parent-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to claim this list" }, { status: 401 });
  }
  let body: { code?: string };
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const result = await claimHandoff(user.id, body.code || "");
  if (!result.ok) {
    const status = result.error.includes("already") ? 409 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({
    ok: true,
    list: {
      id: result.list.id,
      name: result.list.name,
      toyIds: result.list.toyIds,
    },
  });
}
