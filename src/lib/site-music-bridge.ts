/** Bridge so toy speech can duck the live site-music engine. */

import type { SiteMusicEngine } from "@/lib/site-music-engine";

let engine: SiteMusicEngine | null = null;

export function registerSiteMusicEngine(next: SiteMusicEngine | null) {
  engine = next;
}

export function duckSiteMusic(ducked: boolean) {
  engine?.setDucked(ducked);
}
