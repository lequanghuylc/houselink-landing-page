/**
 * Renders an Insights report from CMS on /insights/cms/?slug=
 * Landing shows HTML article only — PDF download is app-only (paid members).
 */
(function () {
  "use strict";

  var UI = {
    en: {
      insightsHref: "/insights/",
      bcInsights: "Market Insights",
      errMissingSlug: "Missing report slug.",
      errNotFound: "Report not found.",
      errLoad: "Could not load this report.",
      errBack: "Back to Insights →",
      metaFallback: "Report",
    },
    vi: {
      insightsHref: "/vi/insights/",
      bcInsights: "Market Insights",
      errMissingSlug: "Thiếu đường dẫn báo cáo.",
      errNotFound: "Không tìm thấy báo cáo.",
      errLoad: "Không tải được báo cáo này.",
      errBack: "Quay lại Insights →",
      metaFallback: "Báo cáo",
    },
  };

  function langKey() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw = (params.get("lang") || document.documentElement.lang || "en").toLowerCase();
      if (raw.indexOf("vi") === 0) return "vi";
      if (raw.indexOf("ja") === 0) return "ja";
      if (raw.indexOf("ko") === 0) return "ko";
      if (raw.indexOf("zh") === 0) return "zh";
    } catch (ignore) {}
    return "en";
  }

  function ui() {
    return UI[langKey()] || UI.en;
  }

  function apiLocale() {
    return langKey() === "vi" ? "vi" : "en";
  }

  function resolveApiBase() {
    if (typeof window.HL_resolveNewsApiBase === "function") {
      return String(window.HL_resolveNewsApiBase()).replace(/\/+$/, "");
    }
    if (typeof window.HL_resolveAuthEnv === "function") {
      return String(window.HL_resolveAuthEnv().apiBase || "").replace(/\/+$/, "");
    }
    return "http://localhost:3001";
  }

  function learnCategoryLabel() {
    var k = langKey();
    if (k === "vi") return "Học hỏi";
    if (k === "ja") return "学ぶ";
    if (k === "ko") return "학습";
    if (k === "zh") return "学习";
    return "Learn";
  }

  /** Original market-feed badge (WP), not topic filter chips. */
  function marketFeedBadgeLabel() {
    var k = langKey();
    return (
      { en: "Market", vi: "Thị trường", ja: "マーケット", ko: "시장", zh: "市场" }[k] || "Market"
    );
  }

  function wpBadgeFromTags(tags, lang) {
    if (!Array.isArray(tags) || !tags.length) return "";
    var primary = lang === "vi" ? "wp-badge-vi:" : "wp-badge-en:";
    var fallback = lang === "vi" ? "wp-badge-en:" : "wp-badge-vi:";
    var found = "";
    for (var i = 0; i < tags.length; i++) {
      var t = String(tags[i] || "");
      if (t.indexOf(primary) === 0) return t.slice(primary.length).trim();
      if (!found && t.indexOf(fallback) === 0) found = t.slice(fallback.length).trim();
      if (!found && t.indexOf("wp-badge:") === 0) found = t.slice("wp-badge:".length).trim();
    }
    return found;
  }

  /** Same Insights-kind labels as tag row / hl-insights-feed.js INSIGHTS_KIND_CHIPS */
  function marketCategoryLabel(code) {
    var c = String(code || "").trim().toLowerCase();
    var k = langKey();
    var map = {
      infra: { en: "Industrial infrastructure", vi: "Hạ tầng công nghiệp", ja: "産業インフラ", ko: "산업 인프라", zh: "产业基础设施" },
      industrial: { en: "Industrial infrastructure", vi: "Hạ tầng công nghiệp", ja: "産業インフラ", ko: "산업 인프라", zh: "产业基础设施" },
      fdi: { en: "FDI & Investment", vi: "FDI & Đầu tư", ja: "FDI・投資", ko: "FDI & 투자", zh: "FDI与投资" },
      esg: { en: "ESG & Energy", vi: "ESG & Năng lượng", ja: "ESG・エネルギー", ko: "ESG & 에너지", zh: "ESG与能源" },
      supply: { en: "Supply Chain", vi: "Chuỗi cung ứng", ja: "サプライチェーン", ko: "공급망", zh: "供应链" },
      textile: { en: "Textile", vi: "Dệt may", ja: "繊維", ko: "섬유", zh: "纺织" },
      semiconductor: { en: "Semiconductors & Electronics", vi: "Bán dẫn & Điện tử", ja: "半導体・電子", ko: "반도체 & 전자", zh: "半导体与电子" },
      semi: { en: "Semiconductors & Electronics", vi: "Bán dẫn & Điện tử", ja: "半導体・電子", ko: "반도체 & 전자", zh: "半导体与电子" },
    };
    var row = map[c];
    if (!row) {
      if (!c) return ui().metaFallback;
      return c.replace(/_/g, " ");
    }
    return row[k] || row.en;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text == null ? "" : String(text);
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html == null ? "" : String(html);
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(+d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function showError(msg) {
    setText("hl-insights-cms-title", msg);
    setHtml("hl-insights-cms-body", "");
  }

  async function loadArticle() {
    var copy = ui();
    var params = new URLSearchParams(window.location.search);
    var slug = String(params.get("slug") || "").trim();
    if (!slug) {
      showError(copy.errMissingSlug);
      return;
    }

    var url =
      resolveApiBase() +
      "/api/report-articles/insights/" +
      encodeURIComponent(slug) +
      "?locale=" +
      encodeURIComponent(apiLocale());

    var res = await fetch(url, { headers: { Accept: "application/json" }, credentials: "omit" });
    if (res.status === 404) {
      showError(copy.errNotFound);
      return;
    }
    if (!res.ok) throw new Error("http");
    var body = await res.json();
    var article = body && body.data && body.data.article;
    if (!article) throw new Error("shape");

    setText("hl-insights-cms-title", article.title || "");
    setText("hl-insights-cms-date", fmtDate(article.publishedAt || article.asOfDate));
    var catLabel =
      article.contentKind === "learn"
        ? learnCategoryLabel()
        : wpBadgeFromTags(article.tags, langKey()) || marketFeedBadgeLabel();
    setText("hl-insights-cms-cat", catLabel);
    setHtml("hl-insights-cms-body", article.body || "");

    var cover = document.getElementById("hl-insights-cms-cover");
    if (cover && article.coverImageUrl) {
      cover.src = article.coverImageUrl;
      cover.style.display = "block";
    }

    var bcInsights = document.getElementById("hl-insights-cms-bc-insights");
    if (bcInsights) {
      bcInsights.textContent = copy.bcInsights;
      bcInsights.setAttribute("href", copy.insightsHref);
    }
  }

  function boot() {
    loadArticle().catch(function () {
      showError(ui().errLoad);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
