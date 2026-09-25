/** Resolve the public site origin for parent share links. */

export const CANONICAL_SITE_ORIGIN = "https://kidskatalog.com";
export const DEFAULT_SITE_ORIGIN = CANONICAL_SITE_ORIGIN;

/** Old hosts that must not be written into new parent share links. */
const LEGACY_PUBLIC_HOSTS = new Set([
  "www.kidskatalog.com",
  "kidskatalog.vercel.app",
  "kidskatalog.app",
  "www.kidskatalog.app",
]);

/** Apex/www .app host is not the public site. */
const UNCONFIGURED_HOSTS = new Set(["kidskatalog.app", "www.kidskatalog.app"]);

function hostnameOf(raw: string): string | null {
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isUnconfiguredCustomHost(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const host = hostnameOf(raw.trim());
  return Boolean(host && UNCONFIGURED_HOSTS.has(host));
}

/**
 * Normalize an origin. Rewrites www, the production vercel.app host, and the
 * unconfigured .app hosts to https://kidskatalog.com. Preview *.vercel.app
 * hosts are left alone.
 */
export function canonicalizeSiteOrigin(raw?: string | null): string {
  if (!raw || !raw.trim()) return DEFAULT_SITE_ORIGIN;
  const trimmed = raw.trim().replace(/\/$/, "");
  const withProto = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return DEFAULT_SITE_ORIGIN;
    }
    if (LEGACY_PUBLIC_HOSTS.has(url.hostname.toLowerCase())) {
      return CANONICAL_SITE_ORIGIN;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function siteOriginFromRequest(request?: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit?.trim()) return canonicalizeSiteOrigin(explicit);

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
      return canonicalizeSiteOrigin(`${proto}://${host}`);
    }
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd?.trim()) return canonicalizeSiteOrigin(vercelProd);

  if (process.env.VERCEL_URL) {
    return canonicalizeSiteOrigin(`https://${process.env.VERCEL_URL.replace(/\/$/, "")}`);
  }

  return DEFAULT_SITE_ORIGIN;
}

export function siteOriginFromWindow(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return canonicalizeSiteOrigin(window.location.origin);
  }
  return canonicalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
}
