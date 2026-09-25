import { PARENT_GATE_UNLOCKED_FLAG } from "@/lib/parent-birth-year";
import { SITE_MODE_KID } from "@/lib/site-mode";
import { CANONICAL_SITE_ORIGIN } from "@/lib/site-url";

export { CANONICAL_SITE_ORIGIN };

const CANONICAL_REDIRECT_HOSTS = new Set([
  "www.kidskatalog.com",
  "kidskatalog.vercel.app",
]);

export function hostnameOnly(host: string | null | undefined): string {
  const raw = (host ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return raw.replace(/:\d+$/, "");
}

/** 301 target for apex aliases. Preview *.vercel.app hosts stay put. */
export function canonicalOriginForHost(host: string | null | undefined): string | null {
  const name = hostnameOnly(host);
  if (!CANONICAL_REDIRECT_HOSTS.has(name)) return null;
  return CANONICAL_SITE_ORIGIN;
}

export function legacyPlaceholderDestination(
  pathname: string,
  toy: string | null | undefined,
): string | null {
  if (pathname !== "/p/buy-placeholder" && pathname !== "/api/buy-placeholder") {
    return null;
  }
  const id = (toy ?? "").trim();
  if (!id || id === "unknown" || /[\\/#?]/.test(id) || id.includes("..")) {
    return "/";
  }
  return `/p/${encodeURIComponent(id)}`;
}

export function kidHomeRewrite(pathname: string, mode: string | undefined): boolean {
  return pathname === "/" && mode === SITE_MODE_KID;
}

export function parentGateRewrite(
  pathname: string,
  mode: string | undefined,
  gate: string | undefined,
): boolean {
  if (mode !== SITE_MODE_KID) return false;
  if (gate === PARENT_GATE_UNLOCKED_FLAG) return false;
  if (pathname.startsWith("/api/")) return false;
  return pathname === "/p" || pathname.startsWith("/p/");
}

/** In-app return path after the birth-year gate. Drops open redirects. */
export function safeParentReturnPath(raw: string | undefined | null): string {
  const path = (raw ?? "").trim();
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("//") || path.includes("://") || path.includes("\\")) return "/";
  return path;
}
