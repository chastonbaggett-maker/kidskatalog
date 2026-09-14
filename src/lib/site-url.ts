/** Resolve the public site origin for parent / print / email links. */
export function siteOriginFromRequest(request?: Request): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (explicit) {
    return explicit.startsWith("http")
      ? explicit.replace(/\/$/, "")
      : `https://${explicit.replace(/\/$/, "")}`;
  }

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "https://kidskatalog.vercel.app";
}

export function siteOriginFromWindow(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://kidskatalog.vercel.app";
}
