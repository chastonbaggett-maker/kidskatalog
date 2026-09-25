import { NextRequest, NextResponse } from "next/server";
import { resolveParentBuyUrls } from "@/lib/associates";
import { getCatalogToysByIds } from "@/lib/catalog-store";

/** Parent Mode Buy targets rebuilt from ASIN + AMAZON_ASSOCIATES_TAG. */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ urls: {} });
  }

  const toys = await getCatalogToysByIds(ids);
  return NextResponse.json({ urls: resolveParentBuyUrls(toys) });
}
