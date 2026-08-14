import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getMetricsSummary } from "@/lib/metrics-store";
import { getCatalogToys } from "@/lib/catalog-store";

export async function GET(req: NextRequest) {
  if (!requireAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const metrics = await getMetricsSummary();
  const toys = await getCatalogToys();
  return NextResponse.json({
    ...metrics,
    toysInCatalog: toys.length,
  });
}
