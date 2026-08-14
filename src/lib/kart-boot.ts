/** Boot + runtime kart snapshot — kept off <html> to avoid hydration/HMR FOUC. */

export type KartBootSnapshot = { ids: string[] };

declare global {
  interface Window {
    __KK_KART__?: KartBootSnapshot;
  }
}

/** Inline boot — seed window snapshot from localStorage before first React paint. */
export const KART_BOOT_SCRIPT = `(function(){
  try{
    var raw=localStorage.getItem('kidskatalog-kart');
    if(!raw){window.__KK_KART__={ids:[]};return;}
    var data=JSON.parse(raw);
    var ids=data&&data.state&&data.state.ids;
    window.__KK_KART__={ids:Array.isArray(ids)?ids:[]};
  }catch(e){window.__KK_KART__={ids:[]};}
})();`;

function readSnapshot(): KartBootSnapshot {
  if (typeof window === "undefined") return { ids: [] };
  return window.__KK_KART__ ?? { ids: [] };
}

export function readBootKartCount(): number {
  return readSnapshot().ids.length;
}

export function readBootInKart(toyId: string): boolean | null {
  if (typeof window === "undefined") return null;
  if (!window.__KK_KART__) return null;
  return window.__KK_KART__.ids.includes(toyId);
}

/** Keep the boot snapshot in sync without touching documentElement attributes. */
export function syncKartBootDataset(ids: string[]) {
  if (typeof window === "undefined") return;
  window.__KK_KART__ = { ids: [...ids] };
}
