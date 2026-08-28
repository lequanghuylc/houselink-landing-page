/**
 * Legacy landing /login and /register paths: immediate redirect to the Next app.
 * Prefer header → app directly; these pages remain only for old bookmarks.
 */
(function () {
  "use strict";

  function detectLang() {
    var p = location.pathname || "";
    if (p.indexOf("/vi/") >= 0) return "vi";
    if (p.indexOf("/zh/") >= 0) return "zh";
    if (p.indexOf("/ko/") >= 0) return "ko";
    if (p.indexOf("/ja/") >= 0) return "ja";
    return "en";
  }

  function isRegisterPath() {
    return /(^|\/)register\/?$/i.test((location.pathname || "").replace(/\/+$/, "") + "/");
  }

  function safeNextParam() {
    try {
      var raw = new URLSearchParams(location.search).get("next");
      if (raw == null) return "";
      var value = String(raw).trim();
      if (!value) return "";
      try {
        if (value.indexOf("%") >= 0) value = decodeURIComponent(value);
      } catch (ignore) {
        return "";
      }
      value = value.trim();
      if (!value.startsWith("/") || value.startsWith("//")) return "";
      if (value.indexOf("\\") >= 0) return "";
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return "";
      return value;
    } catch (ignore) {
      return "";
    }
  }

  function appAuthUrl(path, lang, nextPath) {
    var env =
      typeof window !== "undefined" && typeof window.HL_resolveAuthEnv === "function"
        ? window.HL_resolveAuthEnv()
        : { appBase: "http://localhost:3333" };
    var base = String(env.appBase || "http://localhost:3333").replace(/\/+$/, "");
    var url;
    try {
      url = new URL(path, base + "/");
    } catch (e) {
      url = null;
    }
    if (!url) {
      var q = [];
      if (lang) q.push("lang=" + encodeURIComponent(lang));
      if (nextPath) q.push("next=" + encodeURIComponent(nextPath));
      return base + path + (q.length ? "?" + q.join("&") : "");
    }
    if (lang) url.searchParams.set("lang", lang);
    if (nextPath) url.searchParams.set("next", nextPath);
    return url.toString();
  }

  var lang = detectLang();
  var nextPath = safeNextParam();
  var path = isRegisterPath() ? "/register" : "/login";
  window.location.replace(appAuthUrl(path, lang, nextPath));
})();
