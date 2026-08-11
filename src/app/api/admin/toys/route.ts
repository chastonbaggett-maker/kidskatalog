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

async function resolveToyImages(toy: ToyPayload): Promise<Toy> {
  const slug = slugify(toy.name) || toy.id;
  const { imageUrl: remoteHint, ...rest } = toy;

  const candidates = [
    ...(Array.isArray(toy.images) ? toy.images : []),
    toy.image,
    remoteHint || "",
  ].filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const src of candidates) {
    if (seen.has(src)) continue;
    seen.add(src);
    unique.push(src);
  }

  const stored: string[] = [];
  for (let i = 0; i < unique.length; i += 1) {
    const src = unique[i]!;
    if (!src.startsWith("http")) {
      stored.push(src);
      continue;
    }
    // Already on Vercel Blob — keep as-is.
    if (src.includes(".blob.vercel-storage.com")) {
      stored.push(src);
      continue;
    }
    try {
      const fileStem = i === 0 ? slug : `${slug}-${i}`;
      stored.push(await downloadToyImage(src, fileStem));
    } catch {
      stored.push(src);
    }
  }

  if (stored.length === 0) {
    return { ...rest, image: toy.image || "/categories/plush.svg" };
  }

  return {
    ...rest,
    image: stored[0]!,
    images: stored,
  };
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
    const resolved = await resolveToyImages(toy);
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
  const resolved = await resolveToyImages({ ...body.patch, id: body.id } as ToyPayload);
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
