import { NextResponse } from "next/server";
import { getParentUser } from "@/lib/parent-auth";
import {
  createParentList,
  listParentLists,
} from "@/lib/parent-list-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to see saved lists" }, { status: 401 });
  }
  const lists = await listParentLists(user.id);
  return NextResponse.json({
    lists: lists.map((list) => ({
      id: list.id,
      name: list.name,
      audience: list.audience,
      toyIds: list.toyIds,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to save a list" }, { status: 401 });
  }

  let body: { name?: string; toyIds?: unknown; audience?: unknown };
  try {
    body = (await req.json()) as {
      name?: string;
      toyIds?: unknown;
      audience?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const list = await createParentList(user.id, {
      name: body.name,
      toyIds: body.toyIds,
      audience: body.audience,
    });
    return NextResponse.json({ ok: true, list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
