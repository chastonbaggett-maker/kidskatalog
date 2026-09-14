import { NextRequest, NextResponse } from "next/server";
import { getCatalogToysByIds } from "@/lib/catalog-store";

/** Parent Mode only — returns Amazon Special Links. Never called from kid shop. */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ urls: {} });
  }

  const toys = await getCatalogToysByIds(ids);
  const urls: Record<string, string> = {};
  for (const toy of toys) {
    if (toy.affiliateUrl) urls[toy.id] = toy.affiliateUrl;
  }
  return NextResponse.json({ urls });
}
