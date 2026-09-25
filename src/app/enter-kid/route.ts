import { NextResponse } from "next/server";

/** Old same-site Kid Mode entry. The kids deployment opens the shop. */
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/shop", request.url), 302);
}
