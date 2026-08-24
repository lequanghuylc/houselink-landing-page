/**
 * Legacy `/news/article/?id=` → CMS `/news/cms/?slug=` using seed tags `vc:{id}` / `wp-id:{id}`.
 * Keeps old bookmarks/shares working after the VC feed was removed from news lists.
 */
(function () {
  "use strict";

  function langKey() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw = (
        params.get("lang") ||
        params.get("locale") ||
        document.documentElement.lang ||
        "en"
      ).toLowerCase();
      if (raw.indexOf("vi") === 0) return "vi";
      if (raw.indexOf("ja") === 0) return "ja";
      if (raw.indexOf("ko") === 0) return "ko";
      if (raw.indexOf("zh") === 0) return "zh";
    } catch (ignore) {}
    return "en";
  }

  /** List locale for CMS API (JA/KO/ZH reuse EN, same as hl-news-feed). */
  function listLocale() {
    return langKey() === "vi" ? "vi" : "en";
  }

  function resolveNewsApiBase() {
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

  function ensureAuthEnv() {
    if (typeof window !== "undefined" && typeof window.HL_resolveAuthEnv === "function") {
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      try {
        s.src = new URL("js/hl-auth-env.js", document.baseURI).href;
      } catch (ignore) {
        s.src = "/js/hl-auth-env.js";
      }
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        resolve();
      };
      document.head.appendChild(s);
    });
  }

  function cmsHref(slug) {
    var u = "/news/cms/?slug=" + encodeURIComponent(slug);
    var k = langKey();
    if (k !== "en") u += "&lang=" + encodeURIComponent(k);
    return u;
  }

  function newsIndexHref() {
    var k = langKey();
    if (k === "vi") return "/vi/news/";
    if (k === "ja") return "/ja/news/";
    if (k === "ko") return "/ko/news/";
    if (k === "zh") return "/zh/news/";
    return "/news/";
  }

  function showError(msg) {
    var title = document.getElementById("hl-vc-hero-title");
    var body = document.getElementById("hl-vc-body");
    var sub = document.getElementById("hl-vc-hero-sub");
    if (title) title.textContent = langKey() === "vi" ? "Không tìm thấy bài viết" : "Article not found";
    if (sub) sub.textContent = "";
    if (body) {
      body.innerHTML =
        "<p>" +
        String(msg || "") +
        '</p><p><a href="' +
        newsIndexHref() +
        '">' +
        (langKey() === "vi" ? "Quay lại Tin tức →" : "Back to News →") +
        "</a></p>";
    }
  }

  function matchByWpId(articles, id) {
    var needleVc = "vc:" + id;
    var needleWp = "wp-id:" + id;
    if (!Array.isArray(articles)) return null;
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      var tags = (a && a.tags) || [];
      if (!Array.isArray(tags)) continue;
      for (var t = 0; t < tags.length; t++) {
        var tag = String(tags[t] || "");
        if (tag === needleVc || tag === needleWp) return a;
      }
    }
    return null;
  }

  async function fetchLocale(apiBase, locale) {
    var res = await fetch(apiBase + "/api/news-articles?locale=" + encodeURIComponent(locale), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit"
    });
    if (!res.ok) return [];
    var body = await res.json().catch(function () {
      return null;
    });
    if (!body || body.success !== true) return [];
    return (body.data && body.data.articles) || [];
  }

  async function run() {
    var params = new URLSearchParams(window.location.search);
    var id = String(params.get("id") || "").trim();
    if (!id) {
      showError(langKey() === "vi" ? "Thiếu mã bài viết." : "Missing article id.");
      return;
    }

    await ensureAuthEnv();
    var apiBase = resolveNewsApiBase();
    try {
      var primary = listLocale();
      var articles = await fetchLocale(apiBase, primary);
      var hit = matchByWpId(articles, id);
      if (!hit && primary === "vi") {
        articles = await fetchLocale(apiBase, "en");
        hit = matchByWpId(articles, id);
      } else if (!hit && primary === "en") {
        articles = await fetchLocale(apiBase, "vi");
        hit = matchByWpId(articles, id);
      }
      if (!hit || !hit.slug) {
        showError(
          langKey() === "vi"
            ? "Không tìm thấy bài viết trong CMS."
            : "Article not found in CMS."
        );
        return;
      }
      window.location.replace(cmsHref(String(hit.slug)));
    } catch (err) {
      showError(langKey() === "vi" ? "Không tải được bài viết này." : "Could not load this article.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      run().catch(function () {});
    });
  } else {
    run().catch(function () {});
  }
})();
