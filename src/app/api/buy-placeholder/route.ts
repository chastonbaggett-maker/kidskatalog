import { NextRequest, NextResponse } from "next/server";
import { parentBuyPlaceholderPath } from "@/lib/parent-paths";

/** Stable stub for Parent Buy. Swap later via resolveParentBuy / AMAZON_ASSOCIATES_TAG. */
export async function GET(req: NextRequest) {
  const toy = (req.nextUrl.searchParams.get("toy") || "").trim();
  const dest = parentBuyPlaceholderPath(toy || "unknown");
  return NextResponse.redirect(new URL(dest, req.url), 302);
}
