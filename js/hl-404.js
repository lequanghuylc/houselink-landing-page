/**
 * 404 page: search redirects to locale home with ?q= ; back uses history.
 */
(function () {
  "use strict";

  function searchBase() {
    var raw = (document.body.getAttribute("data-hl-search-base") || "/").trim();
    if (raw === "/") return "/";
    return raw.replace(/\/+$/, "") + "/";
  }

  function wire404Search() {
    var inp = document.getElementById("hl-404-q");
    var btn = document.querySelector(".hl-404-search-btn");
    if (!inp || !btn) return;
    function go() {
      var q = inp.value.trim();
      if (!q) {
        inp.focus();
        return;
      }
      var b = searchBase();
      window.location.href = (b === "/" ? "/" : b) + "?q=" + encodeURIComponent(q);
    }
    btn.addEventListener("click", go);
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        go();
      }
    });
  }

  function wire404Back() {
    var b = document.querySelector(".hl-404-back");
    if (b) b.addEventListener("click", function () { history.back(); });
  }

  function boot() {
    wire404Search();
    wire404Back();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
