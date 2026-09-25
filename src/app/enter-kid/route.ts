import { NextResponse } from "next/server";
import { SITE_MODE_COOKIE, SITE_MODE_KID, SITE_MODE_MAX_AGE } from "@/lib/site-mode";

/** Sets Kid Mode and opens the shop. Works without JavaScript. */
export function GET(request: Request) {
  const dest = new URL("/shop", request.url);
  const response = NextResponse.redirect(dest, 302);
  response.cookies.set(SITE_MODE_COOKIE, SITE_MODE_KID, {
    path: "/",
    sameSite: "lax",
    maxAge: SITE_MODE_MAX_AGE,
    httpOnly: false,
  });
  return response;
}
