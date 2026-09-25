import "server-only";
import { cookies } from "next/headers";
import { PARENT_GATE_COOKIE, PARENT_GATE_UNLOCKED_FLAG } from "@/lib/parent-birth-year";
import { parseSiteMode, SITE_MODE_COOKIE, type SiteMode } from "@/lib/site-mode";

export async function getSiteMode(): Promise<SiteMode> {
  const jar = await cookies();
  return parseSiteMode(jar.get(SITE_MODE_COOKIE)?.value);
}

export async function isParentGateSessionUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(PARENT_GATE_COOKIE)?.value === PARENT_GATE_UNLOCKED_FLAG;
}

/** Kid Mode devices must pass the session gate before parent HTML is rendered. */
export async function parentContentRequiresGate(): Promise<boolean> {
  if ((await getSiteMode()) !== "kid") return false;
  return !(await isParentGateSessionUnlocked());
}
