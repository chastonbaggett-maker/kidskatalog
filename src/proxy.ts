import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkServerConfigured } from "@/lib/clerk-config";
import { PARENT_GATE_COOKIE } from "@/lib/parent-birth-year";
import {
  canonicalOriginForHost,
  hostnameOnly,
  legacyPlaceholderDestination,
  parentGateRewrite,
} from "@/lib/request-routing";
import { SITE_MODE_COOKIE } from "@/lib/site-mode";

const REFERRER_POLICY = "strict-origin-when-cross-origin";
const HOME_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";
const HOME_VARY =
  "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Cookie";

function withReferrer(response: NextResponse, pathname: string) {
  response.headers.set("Referrer-Policy", REFERRER_POLICY);
  // `/` HTML depends on the Kid Mode cookie. Never share that response across visitors.
  if (pathname === "/") {
    response.headers.set("Cache-Control", HOME_CACHE_CONTROL);
    response.headers.set("Vary", HOME_VARY);
    response.headers.set("X-KidsKatalog-Home", "cookie");
  }
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
    return withReferrer(NextResponse.redirect(dest, 301), request.nextUrl.pathname);
  }

  const placeholder = legacyPlaceholderDestination(
    request.nextUrl.pathname,
    request.nextUrl.searchParams.get("toy"),
  );
  if (placeholder) {
    return withReferrer(
      NextResponse.redirect(new URL(placeholder, request.url), 301),
      request.nextUrl.pathname,
    );
  }

  const mode = request.cookies.get(SITE_MODE_COOKIE)?.value;
  const gate = request.cookies.get(PARENT_GATE_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;

  // Do not rewrite `/` to the static `/shop` document. That response was
  // publicly cached without Vary: Cookie and could be served to a fresh visit.
  if (parentGateRewrite(pathname, mode, gate)) {
    const nextPath = `${pathname}${request.nextUrl.search}`;
    const url = request.nextUrl.clone();
    url.pathname = "/leave-kid-mode";
    url.search = "";
    url.searchParams.set("next", nextPath);
    return withReferrer(NextResponse.rewrite(url), pathname);
  }

  const parentClerk =
    pathname === "/p" ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/parent/");

  if (parentClerk && isClerkServerConfigured()) {
    const { clerkMiddleware } = await import("@clerk/nextjs/server");
    const result = await clerkMiddleware()(request, event);
    if (result instanceof NextResponse) return withReferrer(result, pathname);
    return result;
  }

  return withReferrer(NextResponse.next(), pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
