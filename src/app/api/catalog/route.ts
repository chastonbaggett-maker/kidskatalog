import { NextRequest, NextResponse } from "next/server";
import { getCatalogToys, getCatalogToysByIds } from "@/lib/catalog-store";
import {
  paginateCatalogToys,
  pickRandomCatalogToys,
  type CatalogFilters,
} from "@/lib/catalog-query";
import type { Audience, CategoryId } from "@/types/toy";

function parseFilters(req: NextRequest): CatalogFilters {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const audience = (req.nextUrl.searchParams.get("audience") ?? "all") as Audience | "all";
  const ageRaw = req.nextUrl.searchParams.get("age");
  const age = ageRaw != null && ageRaw !== "" ? Number(ageRaw) : null;
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const exclude = req.nextUrl.searchParams.get("exclude") ?? undefined;
  const hasVideoParam = req.nextUrl.searchParams.get("hasVideo");

  return {
    category: category as CategoryId | undefined,
    audience,
    age: Number.isFinite(age) ? age : null,
    q,
    excludeIds: exclude
      ? exclude.split(",").map((id) => id.trim()).filter(Boolean)
      : undefined,
    hasVideo:
      hasVideoParam === "1" ||
      hasVideoParam === "true" ||
      hasVideoParam === "yes"
        ? true
        : undefined,
  };
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    const toys = await getCatalogToysByIds(ids);
    return NextResponse.json({ toys });
  }

  const randomCount = Number(req.nextUrl.searchParams.get("random") ?? "0");
  const filters = parseFilters(req);
  const all = await getCatalogToys();

  if (randomCount > 0) {
    const seed = Number(req.nextUrl.searchParams.get("seed") ?? "1");
    const toys = pickRandomCatalogToys(
      all,
      filters,
      Math.min(Math.max(1, randomCount), 12),
      Number.isFinite(seed) ? seed : 1,
    );
    return NextResponse.json({ toys });
  }

  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? "0"));
  const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 60));
  const seedRaw = Number(req.nextUrl.searchParams.get("seed") ?? "");
  const seed = Number.isFinite(seedRaw) ? seedRaw : Date.now();
  const page = paginateCatalogToys(all, { ...filters, offset, limit, seed });

  return NextResponse.json(page);
}
