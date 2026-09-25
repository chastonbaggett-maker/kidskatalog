import "server-only";
import { headers } from "next/headers";
import { hostnameOnly, resolveDeploymentMode, type DeploymentMode } from "@/lib/deployment";

export async function getDeploymentMode(): Promise<DeploymentMode> {
  const headerStore = await headers();
  const host = process.env.VERCEL
    ? headerStore.get("x-forwarded-host") || headerStore.get("host")
    : headerStore.get("host");
  return resolveDeploymentMode({ host: hostnameOnly(host) });
}
