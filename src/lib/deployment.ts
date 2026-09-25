/**
 * One codebase, two deployments.
 * SITE_MODE=parent|kids wins. When it is unset, the hostname decides.
 * "kidskatalog" is the parent brand and is not a kids host.
 */

export type DeploymentMode = "parent" | "kids";

export const PARENT_ORIGIN_DEFAULT = "https://kidskatalog.com";

export function hostnameOnly(host: string | null | undefined): string {
  const raw = (host ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return raw.replace(/:\d+$/, "");
}

export function normalizeOrigin(raw: string | null | undefined, fallback = ""): string {
  const trimmed = (raw ?? "").trim().replace(/\/$/, "");
  if (!trimmed) return fallback;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

export function parentOrigin(override?: string | null): string {
  const raw = override !== undefined ? override : process.env.PARENT_ORIGIN;
  return normalizeOrigin(raw, PARENT_ORIGIN_DEFAULT);
}

export function kidsOrigin(override?: string | null): string {
  const raw = override !== undefined ? override : process.env.KIDS_ORIGIN;
  return normalizeOrigin(raw, "");
}

function labelSelectsKids(label: string): boolean {
  return label === "kids" || label.startsWith("kids-") || label.includes("-kids");
}

/** kidskatalog.app, any *.kidskatalog.app host, or a DNS label that is kids. */
export function hostSelectsKids(host: string | null | undefined): boolean {
  const name = hostnameOnly(host);
  if (!name) return false;
  if (name === "kidskatalog.app" || name.endsWith(".kidskatalog.app")) return true;
  return name.split(".").some(labelSelectsKids);
}

export function resolveDeploymentMode(input?: {
  siteMode?: string | null;
  host?: string | null;
}): DeploymentMode {
  const hasOverride = input != null && Object.prototype.hasOwnProperty.call(input, "siteMode");
  const raw = (hasOverride ? input?.siteMode : process.env.SITE_MODE) ?? "";
  const siteMode = raw.trim().toLowerCase();
  if (siteMode === "kids" || siteMode === "kid") return "kids";
  if (siteMode === "parent") return "parent";
  if (hostSelectsKids(input?.host)) return "kids";
  return "parent";
}

export function absoluteUrl(origin: string, pathname: string, search = ""): string | null {
  const base = normalizeOrigin(origin, "");
  if (!base) return null;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  return `${base}${pathname}${search}`;
}

/** Skip a redirect that would point at the host already serving the request. */
export function externalRedirect(
  currentHost: string | null | undefined,
  origin: string,
  pathname: string,
  search = "",
): string | null {
  const target = absoluteUrl(origin, pathname, search);
  if (!target) return null;
  try {
    if (new URL(target).hostname.toLowerCase() === hostnameOnly(currentHost)) return null;
  } catch {
    return null;
  }
  return target;
}
