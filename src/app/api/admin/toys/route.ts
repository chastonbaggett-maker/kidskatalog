import { NextRequest, NextResponse } from "next/server";
import type { Toy } from "@/types/toy";
import { requireAdminSession } from "@/lib/admin-auth";
import { downloadToyImage } from "@/lib/amazon-import";
import { slugify } from "@/lib/slugify";
import {
  addCatalogToy,
  deleteCatalogToy,
  getCatalogToys,
  updateCatalogToy,
} from "@/lib/catalog-store";

type ToyPayload = Toy & { imageUrl?: string };

async function resolveToyImage(toy: ToyPayload): Promise<Toy> {
  const remote = toy.imageUrl || (toy.image.startsWith("http") ? toy.image : "");
  if (!remote) return toy;

  const slug = slugify(toy.name) || toy.id;
  const localImage = await downloadToyImage(remote, slug);
  const { imageUrl: _drop, ...rest } = toy;
  return { ...rest, image: localImage };
}

export async function GET(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const toys = await getCatalogToys();
  return NextResponse.json({ toys });
}

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const toy = (await req.json()) as ToyPayload;
  if (!toy.id || !toy.name || !toy.affiliateUrl) {
    return NextResponse.json({ error: "Missing required toy fields" }, { status: 400 });
  }
  try {
    const resolved = await resolveToyImage(toy);
    const created = await addCatalogToy(resolved);
    return NextResponse.json({ toy: created });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not add toy" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id: string; patch: ToyPayload };
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const resolved = await resolveToyImage({ ...body.patch, id: body.id } as ToyPayload);
  const { id: _id, ...patch } = resolved;
  const updated = await updateCatalogToy(body.id, patch);
  if (!updated) return NextResponse.json({ error: "Toy not found" }, { status: 404 });
  return NextResponse.json({ toy: updated });
}

export async function DELETE(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteCatalogToy(id);
  if (!ok) return NextResponse.json({ error: "Toy not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
