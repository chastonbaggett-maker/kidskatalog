/* KidsKatalog first-paint boot — plain file so React never renders <script> children. */
(function () {
  try {
    var root = document.documentElement;

    var m = window.matchMedia("(display-mode: standalone)").matches;
    var ios = "standalone" in navigator && navigator.standalone === true;
    if (m || ios) root.setAttribute("data-standalone", "true");
    if (window.matchMedia("(pointer: coarse)").matches) {
      root.setAttribute("data-touch", "true");
    }
    var ua = navigator.userAgent;
    if (
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) {
      root.setAttribute("data-kart-effects-reduced", "true");
    }

    // Cold-open splash cover (CSS html::before). Cleared by AppSplash when done.
    root.setAttribute("data-splash", "active");

    try {
      localStorage.removeItem("kidskatalog-accent");
      localStorage.removeItem("kidskatalog-crazy-mode");
      localStorage.removeItem("kidskatalog-toy-pile-mode");
      root.dataset.accent = "both";
    } catch (e) {}

    try {
      var raw = localStorage.getItem("kidskatalog-kart");
      if (!raw) {
        window.__KK_KART__ = { ids: [] };
      } else {
        var data = JSON.parse(raw);
        var ids = data && data.state && data.state.ids;
        window.__KK_KART__ = { ids: Array.isArray(ids) ? ids : [] };
      }
    } catch (e) {
      window.__KK_KART__ = { ids: [] };
    }

    var LOCK_MS = 650;
    var timer;
    function lock() {
      root.classList.add("route-changing");
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        root.classList.remove("route-changing");
        timer = undefined;
      }, LOCK_MS);
    }
    function internal(href) {
      try {
        var u = new URL(href, location.origin);
        return u.origin === location.origin && u.pathname !== location.pathname;
      } catch (e) {
        return false;
      }
    }
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var a = t.closest("a[href]");
        if (!a || a.target === "_blank") return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var href = a.getAttribute("href");
        if (!href || href.charAt(0) === "#") return;
        if (internal(href)) lock();
      },
      true,
    );
    window.addEventListener("popstate", lock);
  } catch (e) {}
})();
