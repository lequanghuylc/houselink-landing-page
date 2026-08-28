/**
 * CMS API host (news + events calendar) — separate from hl-auth-env.
 * Login/partner logos keep dashboard API; live houselink.com.vn CMS reads 2026-api until prod API has CMS.
 */
(function (global) {
  "use strict";

  var NEWS_2026_API = "https://2026-api.houselink.com.vn";

  function trimSlash(s) {
    return String(s || "").replace(/\/+$/, "");
  }

  function isMainDomain() {
    var host =
      global && global.location && global.location.hostname
        ? String(global.location.hostname).toLowerCase()
        : "";
    return host === "houselink.com.vn" || host === "www.houselink.com.vn";
  }

  function resolveNewsApiBase() {
    if (global && global.HL_NEWS_API_BASE) return trimSlash(global.HL_NEWS_API_BASE);
    if (isMainDomain()) return NEWS_2026_API;
    if (typeof global.HL_resolveAuthEnv === "function") {
      return trimSlash(global.HL_resolveAuthEnv().apiBase || "");
    }
    if (global && global.HL_AUTH_ENV && global.HL_AUTH_ENV.apiBase) {
      return trimSlash(global.HL_AUTH_ENV.apiBase);
    }
    return "http://localhost:3001";
  }

  global.HL_resolveNewsApiBase = resolveNewsApiBase;
})(typeof window !== "undefined" ? window : this);
