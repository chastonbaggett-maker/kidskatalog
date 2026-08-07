/** Inline boot — sync kart badge/count from localStorage before first React paint. */
export const KART_BOOT_SCRIPT = `(function(){
  try{
    var raw=localStorage.getItem('kidskatalog-kart');
    if(!raw)return;
    var data=JSON.parse(raw);
    var ids=data&&data.state&&data.state.ids;
    if(!Array.isArray(ids))return;
    document.documentElement.dataset.kartCount=String(ids.length);
    if(ids.length)document.documentElement.dataset.kartIds=ids.join(',');
  }catch(e){}
})();`;

export function readBootKartCount(): number {
  if (typeof document === "undefined") return 0;
  const n = Number(document.documentElement.dataset.kartCount ?? "0");
  return Number.isFinite(n) ? n : 0;
}

export function readBootInKart(toyId: string): boolean | null {
  if (typeof document === "undefined") return null;
  const raw = document.documentElement.dataset.kartIds;
  if (!raw) return null;
  return raw.split(",").includes(toyId);
}

export function syncKartBootDataset(ids: string[]) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.kartCount = String(ids.length);
  if (ids.length > 0) {
    document.documentElement.dataset.kartIds = ids.join(",");
  } else {
    delete document.documentElement.dataset.kartIds;
  }
}
