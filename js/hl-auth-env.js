(function (global) {
  "use strict";

  function trimSlash(s) {
    return String(s || "").replace(/\/+$/, "");
  }

  /**
   * Auth routing by landing hostname:
   * - localhost → landing /login/ page; after login → local frontend (:3333)
   * - houselink.com.vn → header Login opens dashboard.houselink.com.vn
   * - *.netlify.app → header Login opens app.houselink.com.vn
   */
  function resolveAuthEnv() {
    var loc = global && global.location ? global.location : null;
    var host = loc && loc.hostname ? String(loc.hostname).toLowerCase() : "";

    var api = "http://localhost:3001";
    var app = "http://localhost:3333";
    var useLandingLogin = true;

    var isLocalhost =
      !host ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "0.0.0.0";
    var isMainDomain = host === "houselink.com.vn" || host === "www.houselink.com.vn";
    var isNetlify = host.slice(-".netlify.app".length) === ".netlify.app";

    if (isMainDomain) {
      useLandingLogin = false;
      api = "https://api.houselink.com.vn";
      app = "https://dashboard.houselink.com.vn";
    } else if (isNetlify) {
      useLandingLogin = false;
      api = "https://api.houselink.com.vn";
      app = "https://app.houselink.com.vn";
    } else if (isLocalhost && loc) {
      useLandingLogin = true;
      api = "http://localhost:3001";
      app = trimSlash(loc.protocol + "//" + host + ":3333");
    }

    if (global && global.HL_API_BASE) api = String(global.HL_API_BASE);
    if (global && global.HL_APP_BASE) app = String(global.HL_APP_BASE);

    return {
      hostname: host,
      isLocalhost: isLocalhost,
      isMainDomain: isMainDomain,
      isNetlify: isNetlify,
      useLandingLogin: useLandingLogin,
      apiBase: trimSlash(api),
      appBase: trimSlash(app),
    };
  }

  global.HL_resolveAuthEnv = resolveAuthEnv;
  global.HL_AUTH_ENV = resolveAuthEnv();
})(typeof window !== "undefined" ? window : this);
