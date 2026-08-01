import { NextRequest, NextResponse } from "next/server";
import { getCatalogToys, getCatalogToysByIds } from "@/lib/catalog-store";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    const toys = await getCatalogToysByIds(ids);
    return NextResponse.json({ toys });
  }
  const toys = await getCatalogToys();
  return NextResponse.json({ toys });
}
