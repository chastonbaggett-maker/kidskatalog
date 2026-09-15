import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkServerConfigured } from "@/lib/clerk-config";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isClerkServerConfigured()) {
    return NextResponse.next();
  }

  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: ["/p", "/p/(.*)", "/api/parent/(.*)"],
};
