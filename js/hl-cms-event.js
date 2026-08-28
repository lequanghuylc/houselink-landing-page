/**
 * Renders a CMS event detail page at /events-calendar/cms/?slug=
 */
(function () {
  "use strict";

  function langKey() {
    var q = new URLSearchParams(window.location.search);
    var fromQuery = (q.get("lang") || "").toLowerCase();
    if (fromQuery) return fromQuery.slice(0, 2);
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("vi") === 0) return "vi";
    if (raw.indexOf("ja") === 0) return "ja";
    if (raw.indexOf("ko") === 0) return "ko";
    if (raw.indexOf("zh") === 0) return "zh";
    return "en";
  }

  function sitePrefix() {
    var k = langKey();
    return k === "en" ? "/" : "/" + k + "/";
  }

  function localizePath(path) {
    if (!path) return path;
    var p = String(path).trim();
    if (/^https?:\/\//i.test(p) || p.indexOf("//") === 0) return p;
    if (p.charAt(0) !== "/") p = "/" + p;
    p = p.replace(/^\/(vi|ja|ko|zh)(?=\/)/, "");
    var prefix = sitePrefix();
    if (prefix === "/") return p;
    if (p.indexOf(prefix) === 0) return p;
    return prefix.replace(/\/$/, "") + p;
  }

  function resolveApiBase() {
    if (typeof window !== "undefined" && typeof window.HL_resolveNewsApiBase === "function") {
      return String(window.HL_resolveNewsApiBase()).replace(/\/+$/, "");
    }
    if (typeof window !== "undefined" && typeof window.HL_resolveAuthEnv === "function") {
      return String(window.HL_resolveAuthEnv().apiBase || "").replace(/\/+$/, "");
    }
    if (typeof window !== "undefined" && window.HL_AUTH_ENV && window.HL_AUTH_ENV.apiBase) {
      return String(window.HL_AUTH_ENV.apiBase).replace(/\/+$/, "");
    }
    return "http://localhost:3001";
  }

  function loadScript(relativePath) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      try {
        s.src = new URL(relativePath, document.baseURI).href;
      } catch (ignore) {
        s.src = "/" + String(relativePath || "").replace(/^\/+/, "");
      }
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
  }

  function ensureCmsApiBase() {
    var tasks = [];
    if (typeof window === "undefined" || typeof window.HL_resolveNewsApiBase !== "function") {
      tasks.push(loadScript("js/hl-news-api-base.js"));
    }
    if (typeof window === "undefined" || typeof window.HL_resolveAuthEnv !== "function") {
      tasks.push(loadScript("js/hl-auth-env.js"));
    }
    return Promise.all(tasks);
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getSlug() {
    return new URLSearchParams(window.location.search).get("slug") || "";
  }

  function showError(msg) {
    var root = document.getElementById("hl-event-cms-root");
    if (!root) return;
    root.innerHTML =
      '<div class="si" style="padding:48px 0;"><p>' + esc(msg) + '</p>' +
      '<a href="' + esc(sitePrefix() + "events-calendar/") + '" class="back-news">← Events calendar</a></div>';
  }

  function renderEvent(ev) {
    var root = document.getElementById("hl-event-cms-root");
    if (!root) return;
    document.title = (ev.title || "Event") + " – HOUSELINK";
    var tags = (ev.tagLabels || ev.tags || []).map(function (t) {
      return '<span class="art-tag">' + esc(t) + "</span>";
    }).join("");
    var cover = ev.coverImageUrl
      ? '<img class="art-cover" src="' + esc(ev.coverImageUrl) + '" alt="">'
      : "";
    var meta = [];
    if (ev.eventDate) meta.push('<span class="art-date">' + esc(ev.eventDate) + "</span>");
    if (ev.venue) meta.push('<span class="art-date">📍 ' + esc(ev.venue) + "</span>");
    if (ev.timeLabel) meta.push('<span class="art-date">⏰ ' + esc(ev.timeLabel) + "</span>");
    var reg = localizePath(ev.registerUrl || "/contact/");
    root.innerHTML =
      '<section class="pg-hero"><div class="pg-inner">' +
      '<div class="bc"><a href="' + esc(sitePrefix()) + '">Home</a><span>/</span>' +
      '<a href="' + esc(sitePrefix() + "events-calendar/") + '">Events calendar</a><span>/</span>' +
      '<span>' + esc(ev.title) + "</span></div>" +
      '<h1 class="pg-h1">' + esc(ev.title) + "</h1>" +
      (ev.excerpt ? '<p class="pg-sub">' + esc(ev.excerpt) + "</p>" : "") +
      "</div></section>" +
      '<section class="sec"><div class="si"><div class="art-layout"><div class="art-body">' +
      cover +
      '<div class="art-meta-bar">' + meta.join('<span class="art-sep"></span>') + "</div>" +
      (ev.excerpt ? '<p class="art-lead">' + esc(ev.excerpt) + "</p>" : "") +
      '<div class="art-content">' + (ev.body || "") + "</div>" +
      (tags ? '<div class="art-tags">' + tags + "</div>" : "") +
      "</div></div></div></section>" +
      '<section class="sec-green"><div class="si"><h2>Register for this event</h2>' +
      '<p>Contact HOUSELINK to confirm your participation.</p>' +
      '<a href="' + esc(reg) + '">Register →</a></div></section>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    var slug = getSlug();
    if (!slug) {
      showError("Missing event slug.");
      return;
    }
    ensureCmsApiBase()
      .then(function () {
        var locale = langKey();
        return fetch(
          resolveApiBase() + "/api/events/" + encodeURIComponent(slug) + "?locale=" + encodeURIComponent(locale),
          { headers: { Accept: "application/json" }, credentials: "omit" }
        );
      })
      .then(function (res) {
        if (!res.ok) throw new Error("not_found");
        return res.json();
      })
      .then(function (body) {
        if (!body || !body.data || !body.data.event) throw new Error("not_found");
        renderEvent(body.data.event);
      })
      .catch(function () {
        showError("Event not found.");
      });
  });
})();
