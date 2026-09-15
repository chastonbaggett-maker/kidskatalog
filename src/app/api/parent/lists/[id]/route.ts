import { NextResponse } from "next/server";
import { getParentUser } from "@/lib/parent-auth";
import {
  deleteParentList,
  getParentList,
  updateParentList,
} from "@/lib/parent-list-store";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: Props) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to open a saved list" }, { status: 401 });
  }
  const { id } = await params;
  const list = await getParentList(id, user.id);
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  return NextResponse.json({ list });
}

export async function PATCH(req: Request, { params }: Props) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to update a list" }, { status: 401 });
  }
  const { id } = await params;
  let body: { name?: string; toyIds?: unknown };
  try {
    body = (await req.json()) as { name?: string; toyIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const list = await updateParentList(id, user.id, body);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Props) {
  const user = await getParentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to delete a list" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteParentList(id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
