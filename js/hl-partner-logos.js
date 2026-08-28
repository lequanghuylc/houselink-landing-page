(function (global) {
  "use strict";

  function resolveApiBase() {
    if (global && typeof global.HL_resolveAuthEnv === "function") {
      return String(global.HL_resolveAuthEnv().apiBase || "").replace(/\/+$/, "");
    }
    if (global && global.HL_AUTH_ENV && global.HL_AUTH_ENV.apiBase) {
      return String(global.HL_AUTH_ENV.apiBase).replace(/\/+$/, "");
    }
    return "http://localhost:3001";
  }

  function resolveImageSrc(imageUrl) {
    var raw = String(imageUrl || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.charAt(0) === "/") {
      try {
        return new URL(raw, global.location.origin).href;
      } catch (ignore) {
        return raw;
      }
    }
    return raw;
  }

  function renderLogoGrid(grid, logos) {
    if (!grid || !Array.isArray(logos)) return;
    var html = logos
      .map(function (logo) {
        var name = String(logo && logo.name ? logo.name : "").trim();
        var src = resolveImageSrc(logo && logo.imageUrl);
        if (!name || !src) return "";
        return (
          '<div class="cust-logo"><img class="cust-logo__img" src="' +
          src.replace(/"/g, "&quot;") +
          '" alt="' +
          name.replace(/"/g, "&quot;") +
          '" loading="lazy" decoding="async"></div>'
        );
      })
      .join("");
    grid.innerHTML = html;
  }

  function loadPartnerLogos() {
    var grids = document.querySelectorAll(".customers-logo-grid[data-hl-partner-logos]");
    if (!grids.length) return Promise.resolve();

    var apiBase = resolveApiBase();
    var url = apiBase + "/api/partner-logos";

    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (result) {
        if (!result.ok || !result.body || result.body.success !== true) {
          throw new Error("Partner logos request failed");
        }
        var logos = (result.body.data && result.body.data.logos) || [];
        if (!logos.length) return;
        grids.forEach(function (grid) {
          renderLogoGrid(grid, logos);
        });
      })
      .catch(function (err) {
        if (global.console && typeof global.console.warn === "function") {
          global.console.warn("[hl-partner-logos] Could not load partner logos:", err);
        }
      });
  }

  function ensureAuthEnvThenLoad() {
    if (typeof global.HL_resolveAuthEnv === "function") {
      return loadPartnerLogos();
    }
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      try {
        s.src = new URL("js/hl-auth-env.js", document.baseURI).href;
      } catch (ignore) {
        s.src = "js/hl-auth-env.js";
      }
      s.onload = function () {
        loadPartnerLogos().finally(resolve);
      };
      s.onerror = function () {
        loadPartnerLogos().finally(resolve);
      };
      document.head.appendChild(s);
    });
  }

  global.HL_loadPartnerLogos = loadPartnerLogos;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureAuthEnvThenLoad);
  } else {
    ensureAuthEnvThenLoad();
  }
})(typeof window !== "undefined" ? window : this);
