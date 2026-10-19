(function (global) {
  "use strict";

  var selfSrc = "";
  try {
    if (document.currentScript && document.currentScript.src) {
      selfSrc = String(document.currentScript.src);
    }
  } catch (ignore) {
    selfSrc = "";
  }

  function resolveApiBase() {
    // hl-auth-env points houselink.com.vn at api.houselink.com.vn (no DNS).
    // Partner logos live on the 2026 CMS API — same as news/events.
    if (global && typeof global.HL_resolveNewsApiBase === "function") {
      return String(global.HL_resolveNewsApiBase()).replace(/\/+$/, "");
    }
    if (global && typeof global.HL_resolveAuthEnv === "function") {
      return String(global.HL_resolveAuthEnv().apiBase || "").replace(/\/+$/, "");
    }
    if (global && global.HL_AUTH_ENV && global.HL_AUTH_ENV.apiBase) {
      return String(global.HL_AUTH_ENV.apiBase).replace(/\/+$/, "");
    }
    return "http://localhost:3001";
  }

  function resolveImageSrc(imageUrl, apiBase) {
    var raw = String(imageUrl || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.charAt(0) === "/") return apiBase + raw;
    return raw;
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function pillHtml(name, src) {
    return (
      '<div class="logo-pill logo-pill--img"><img class="logo-pill__img" src="' +
      escapeAttr(src) +
      '" alt="' +
      escapeAttr(name) +
      '" decoding="async"></div>'
    );
  }

  function gridHtml(name, src) {
    return (
      '<div class="cust-logo"><img class="cust-logo__img" src="' +
      escapeAttr(src) +
      '" alt="' +
      escapeAttr(name) +
      '" loading="lazy" decoding="async"></div>'
    );
  }

  function markupFor(kind, logos, apiBase) {
    var html = "";
    for (var i = 0; i < logos.length; i++) {
      var logo = logos[i] || {};
      var name = String(logo.name || "").trim();
      var src = resolveImageSrc(logo.imageUrl, apiBase);
      if (!name || !src) continue;
      html += kind === "grid" ? gridHtml(name, src) : pillHtml(name, src);
    }
    return html;
  }

  function loadPartnerLogos() {
    var mounts = document.querySelectorAll("[data-hl-partner-logos]");
    if (!mounts.length) return Promise.resolve();

    var apiBase = resolveApiBase();
    var url = apiBase + "/api/partner-logos";

    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
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
        var pill = markupFor("pill", logos, apiBase);
        var grid = markupFor("grid", logos, apiBase);
        mounts.forEach(function (mount) {
          var kind = mount.getAttribute("data-hl-partner-logos");
          mount.innerHTML = kind === "grid" ? grid : pill;
        });
      })
      .catch(function (err) {
        if (global.console && typeof global.console.warn === "function") {
          global.console.warn("[hl-partner-logos] Could not load partner logos:", err);
        }
      });
  }

  function siblingScriptSrc(fileName) {
    if (!selfSrc) return "";
    return selfSrc.replace(/[^/]+$/, fileName);
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      if (!src) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        resolve();
      };
      document.head.appendChild(s);
    });
  }

  function ensureApiBaseThenLoad() {
    var tasks = [];
    if (typeof global.HL_resolveAuthEnv !== "function") {
      tasks.push(loadScript(siblingScriptSrc("hl-auth-env.js")));
    }
    if (typeof global.HL_resolveNewsApiBase !== "function") {
      tasks.push(loadScript(siblingScriptSrc("hl-news-api-base.js")));
    }
    return Promise.all(tasks).then(function () {
      return loadPartnerLogos();
    });
  }

  global.HL_loadPartnerLogos = loadPartnerLogos;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureApiBaseThenLoad);
  } else {
    ensureApiBaseThenLoad();
  }
})(typeof window !== "undefined" ? window : this);
