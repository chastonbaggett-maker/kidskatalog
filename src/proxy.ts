import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkServerConfigured } from "@/lib/clerk-config";
import { PARENT_GATE_COOKIE } from "@/lib/parent-birth-year";
import {
  canonicalOriginForHost,
  hostnameOnly,
  kidHomeRewrite,
  legacyPlaceholderDestination,
  parentGateRewrite,
} from "@/lib/request-routing";
import { SITE_MODE_COOKIE } from "@/lib/site-mode";

const REFERRER_POLICY = "strict-origin-when-cross-origin";

function withReferrer(response: NextResponse) {
  response.headers.set("Referrer-Policy", REFERRER_POLICY);
  return response;
}

function publicHost(request: NextRequest): string {
  return hostnameOnly(
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
  );
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const host = publicHost(request);
  const canonical = canonicalOriginForHost(host);
  if (canonical) {
    const dest = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      canonical,
    );
    return withReferrer(NextResponse.redirect(dest, 301));
  }

  const placeholder = legacyPlaceholderDestination(
    request.nextUrl.pathname,
    request.nextUrl.searchParams.get("toy"),
  );
  if (placeholder) {
    return withReferrer(NextResponse.redirect(new URL(placeholder, request.url), 301));
  }

  const mode = request.cookies.get(SITE_MODE_COOKIE)?.value;
  const gate = request.cookies.get(PARENT_GATE_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;

  if (kidHomeRewrite(pathname, mode)) {
    const url = request.nextUrl.clone();
    url.pathname = "/shop";
    return withReferrer(NextResponse.rewrite(url));
  }

  if (parentGateRewrite(pathname, mode, gate)) {
    const nextPath = `${pathname}${request.nextUrl.search}`;
    const url = request.nextUrl.clone();
    url.pathname = "/leave-kid-mode";
    url.search = "";
    url.searchParams.set("next", nextPath);
    return withReferrer(NextResponse.rewrite(url));
  }

  const parentClerk =
    pathname === "/p" ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/parent/");

  if (parentClerk && isClerkServerConfigured()) {
    const { clerkMiddleware } = await import("@clerk/nextjs/server");
    const result = await clerkMiddleware()(request, event);
    if (result instanceof NextResponse) return withReferrer(result);
    return result;
  }

  return withReferrer(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
