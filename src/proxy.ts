import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkServerConfigured } from "@/lib/clerk-config";
import {
  externalRedirect,
  hostnameOnly,
  kidsOrigin,
  parentOrigin,
  resolveDeploymentMode,
} from "@/lib/deployment";
import {
  canonicalOriginForHost,
  isKidsSurfacePath,
  isParentSurfacePath,
  legacyPlaceholderDestination,
} from "@/lib/request-routing";

const REFERRER_POLICY = "strict-origin-when-cross-origin";
const HOME_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";
const HOME_VARY =
  "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Cookie";

function deploymentHost(request: NextRequest): string {
  // On Vercel the platform sets x-forwarded-host. In dev, Host is the name
  // the browser used (localhost vs kids.localhost). nextUrl can be 0.0.0.0.
  if (process.env.VERCEL) {
    return hostnameOnly(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
  }
  return hostnameOnly(request.headers.get("host"));
}

function withReferrer(
  response: NextResponse,
  pathname: string,
  mode: "parent" | "kids",
) {
  response.headers.set("Referrer-Policy", REFERRER_POLICY);
  if (mode === "kids") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  // `/` is deployment-specific. Never share that document from a public cache.
  if (pathname === "/") {
    response.headers.set("Cache-Control", HOME_CACHE_CONTROL);
    response.headers.set("Vary", HOME_VARY);
    response.headers.set("X-KidsKatalog-Home", mode);
  }
  return response;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const forwarded = hostnameOnly(
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
  );
  const canonical = canonicalOriginForHost(forwarded);
  if (canonical) {
    const dest = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      canonical,
    );
    return withReferrer(NextResponse.redirect(dest, 301), request.nextUrl.pathname, "parent");
  }

  const placeholder = legacyPlaceholderDestination(
    request.nextUrl.pathname,
    request.nextUrl.searchParams.get("toy"),
  );
  if (placeholder) {
    return withReferrer(
      NextResponse.redirect(new URL(placeholder, request.url), 301),
      request.nextUrl.pathname,
      "parent",
    );
  }

  const host = deploymentHost(request);
  const mode = resolveDeploymentMode({ host });
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // The parent deployment never renders Kid Mode, including when kk_mode is set.
  if (mode === "parent" && isKidsSurfacePath(pathname)) {
    const dest =
      externalRedirect(host, kidsOrigin(), pathname, search) ||
      new URL("/kid-mode", request.url);
    return withReferrer(NextResponse.redirect(dest, 302), pathname, mode);
  }

  if (mode === "parent" && (pathname === "/api/kids" || pathname.startsWith("/api/kids/"))) {
    return withReferrer(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
      pathname,
      mode,
    );
  }

  if (mode === "kids" && isParentSurfacePath(pathname)) {
    const dest = externalRedirect(host, parentOrigin(), pathname, search);
    if (dest) {
      return withReferrer(NextResponse.redirect(dest, 302), pathname, mode);
    }
    return withReferrer(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
      pathname,
      mode,
    );
  }

  const parentClerk =
    mode === "parent" &&
    (pathname === "/p" ||
      pathname.startsWith("/p/") ||
      pathname.startsWith("/api/parent/"));

  if (parentClerk && isClerkServerConfigured()) {
    const { clerkMiddleware } = await import("@clerk/nextjs/server");
    const result = await clerkMiddleware()(request, event);
    if (result instanceof NextResponse) return withReferrer(result, pathname, mode);
    return result;
  }

  return withReferrer(NextResponse.next(), pathname, mode);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
