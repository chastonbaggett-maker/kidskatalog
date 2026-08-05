/** Shared route-transition lock — hides toy photos during client navigations. */
export const ROUTE_CHANGE_LOCK_MS = 450;

let lockTimer: ReturnType<typeof setTimeout> | undefined;

export function beginRouteChange(lockMs = ROUTE_CHANGE_LOCK_MS) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("route-changing");
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(() => endRouteChange(), lockMs);
}

export function extendRouteChange(lockMs = ROUTE_CHANGE_LOCK_MS) {
  beginRouteChange(lockMs);
}

export function endRouteChange() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("route-changing");
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = undefined;
  }
}

export function isInternalNavHref(href: string, origin = location.origin, pathname = location.pathname) {
  try {
    const url = new URL(href, origin);
    return url.origin === origin && url.pathname !== pathname;
  } catch {
    return false;
  }
}

/** Inline boot script — runs before React so the lock applies on the first paint after click. */
export const ROUTE_CHANGE_BOOT_SCRIPT = `(function(){
  var LOCK_MS=${ROUTE_CHANGE_LOCK_MS};
  var timer;
  function lock(){
    document.documentElement.classList.add("route-changing");
    if(timer)clearTimeout(timer);
    timer=setTimeout(function(){
      document.documentElement.classList.remove("route-changing");
      timer=undefined;
    },LOCK_MS);
  }
  function internal(href){
    try{
      var u=new URL(href,location.origin);
      return u.origin===location.origin&&u.pathname!==location.pathname;
    }catch(e){return false;}
  }
  document.addEventListener("click",function(e){
    var t=e.target;
    if(!t||!t.closest)return;
    var a=t.closest("a[href]");
    if(!a||a.target==="_blank")return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var href=a.getAttribute("href");
    if(!href||href.charAt(0)==="#")return;
    if(internal(href))lock();
  },true);
  window.addEventListener("popstate",lock);
})();`;
