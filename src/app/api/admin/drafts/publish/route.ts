import { NextRequest, NextResponse } from "next/server";
import type { Toy } from "@/types/toy";
import { requireAdminSession } from "@/lib/admin-auth";
import { addCatalogToy, getCatalogToy } from "@/lib/catalog-store";
import { deleteDraftToy, getDraftToy, toLiveToy } from "@/lib/draft-store";

export async function POST(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No draft ids provided" }, { status: 400 });
  }

  const published: Toy[] = [];
  const conflicts: string[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const draft = await getDraftToy(id);
    if (!draft) {
      missing.push(id);
      continue;
    }

    const toy = toLiveToy(draft);
    if (await getCatalogToy(toy.id)) {
      conflicts.push(toy.id);
      continue;
    }

    try {
      const created = await addCatalogToy(toy);
      await deleteDraftToy(id);
      published.push(created);
    } catch {
      conflicts.push(toy.id);
    }
  }

  return NextResponse.json({
    published,
    conflicts,
    missing,
    count: published.length,
  });
}
