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

const KIDS_SURFACE_PREFIXES = [
  "/shop",
  "/toy",
  "/kart",
  "/menu",
  "/profile",
  "/enter-kid",
  "/leave-kid-mode",
  "/offline",
  "/pair",
  "/unpair",
];

const PARENT_SURFACE_PREFIXES = ["/p", "/privacy", "/claim", "/kid-mode", "/admin"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Old kid routes that the parent site sends to the kids deployment. */
export function isKidsSurfacePath(pathname: string): boolean {
  return KIDS_SURFACE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Parent account, claim, privacy, and admin routes. Printed /p/{id} stays here. */
export function isParentSurfacePath(pathname: string): boolean {
  if (pathname === "/api/parent" || pathname.startsWith("/api/parent/")) return true;
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) return true;
  return PARENT_SURFACE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
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
