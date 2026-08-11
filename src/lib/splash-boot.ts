/** First-paint splash cover — inline so nav can't flash before CSS/JS. */

export const SPLASH_BG_SOLID = "#3ecfc0";
export const SPLASH_BG_GRADIENT =
  "linear-gradient(165deg, #6ee8db 0%, #3ecfc0 42%, #2bb8a8 100%)";

export const SPLASH_SESSION_KEY = "kidskatalog-splash-done";

/**
 * Critical first-paint CSS. Uses html::before for the boot cover so we never
 * inject/remove a DOM node that React owns or hydrates against.
 */
export const SPLASH_BOOT_STYLE = `
html[data-splash="active"],html[data-splash="active"] body,
html[data-splash="exiting"],html[data-splash="exiting"] body{
  background-color:${SPLASH_BG_SOLID}!important;background-image:none!important;
}
html[data-splash="active"] .app-shell,
html[data-splash="active"] .bottom-nav,
html[data-splash="active"] .bottom-nav__frost{
  visibility:hidden!important;opacity:0!important;pointer-events:none!important;
}
html[data-splash="active"]::before{
  content:"";
  position:fixed;top:0;left:0;right:0;bottom:0;z-index:10001;
  width:100%;height:100%;
  min-height:100vh;min-height:100dvh;min-height:-webkit-fill-available;
  height:calc(100dvh + 4rem);
  margin:0;padding:0;border:0;
  background-color:${SPLASH_BG_SOLID};
  background-image:${SPLASH_BG_GRADIENT};
  background-size:100% 100%;background-repeat:no-repeat;background-position:center;
  pointer-events:none;
}
`.trim();

/**
 * Boot script: mark splash active for cold opens only.
 * Session-done skips so client navigations / remounts never re-hide the shell.
 */
export const SPLASH_BOOT_SCRIPT = `(function(){try{
  var root=document.documentElement;
  var m=window.matchMedia('(display-mode: standalone)').matches;
  var ios='standalone' in navigator&&navigator.standalone===true;
  if(m||ios)root.setAttribute('data-standalone','true');
  if(window.matchMedia('(pointer: coarse)').matches)root.setAttribute('data-touch','true');
  var ua=navigator.userAgent;
  if(/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))root.setAttribute('data-kart-effects-reduced','true');
  var done=false;
  try{done=sessionStorage.getItem('${SPLASH_SESSION_KEY}')==='1';}catch(e){}
  if(done){root.removeAttribute('data-splash');return;}
  root.setAttribute('data-splash','active');
}catch(e){}})();`;
