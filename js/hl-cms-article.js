/**
 * Renders a HouseLink CMS news article on /news/cms/?slug=
 * Optional `?lang=vi|ja|ko|zh` localizes chrome copy (same keys as hl-vc-article).
 * Does not touch static hardcoded article folders under /vi/news/...
 */
(function () {
  "use strict";

  var ARTICLE_UI = {
    en: {
      newsHref: "/news/",
      errMissingSlug: "Missing article slug.",
      errNotFound: "Article not found.",
      errLoad: "Could not load this article.",
      errBack: "Back to News →",
      articleFallback: "Article",
      authorTitle: "Author",
      authorAv: "HL",
      authorName: "HOUSELINK Editorial",
      authorRole: "News & Events",
      ctaTitle: "Register for the next event",
      ctaBody:
        "Business matching, forums and industry updates - get priority access to HOUSELINK events.",
      ctaLink: "Contact us →",
      ctaHref: "/contact/",
      relatedTitle: "Related articles",
      bcHome: "Home",
      bcHomeHref: "/",
      bcNews: "News & Events",
      bcNewsHref: "/news/",
      share: "Share:",
      metaCatFallback: "News",
      secGreenTitle: "Weekly market updates",
      secGreenBody: "FDI, industrial parks and ESG - on the main news page.",
      secGreenBtn: "News & Events →",
      secGreenHref: "/news/"
    },
    vi: {
      newsHref: "/vi/news/",
      errMissingSlug: "Thiếu đường dẫn bài viết.",
      errNotFound: "Không tìm thấy bài viết.",
      errLoad: "Không tải được bài viết này.",
      errBack: "Quay lại Tin tức →",
      articleFallback: "Bài viết",
      authorTitle: "Tác giả",
      authorAv: "HL",
      authorName: "Ban biên tập HOUSELINK",
      authorRole: "Tin tức & Sự kiện",
      ctaTitle: "Đăng ký tham dự sự kiện tiếp theo",
      ctaBody:
        "Kết nối doanh nghiệp, diễn đàn và cập nhật ngành - ưu tiên nhận thông tin sự kiện HOUSELINK.",
      ctaLink: "Liên hệ →",
      ctaHref: "/vi/contact/",
      relatedTitle: "Bài viết liên quan",
      bcHome: "Trang chủ",
      bcHomeHref: "/vi/",
      bcNews: "Tin tức & Sự kiện",
      bcNewsHref: "/vi/news/",
      share: "Chia sẻ:",
      metaCatFallback: "Tin tức",
      secGreenTitle: "Cập nhật thị trường hàng tuần",
      secGreenBody: "FDI, khu công nghiệp và ESG - trên trang tin chính.",
      secGreenBtn: "Tin tức & Sự kiện →",
      secGreenHref: "/vi/news/"
    },
    ja: {
      newsHref: "/ja/news/",
      errMissingSlug: "記事スラッグがありません。",
      errNotFound: "記事が見つかりません。",
      errLoad: "記事を読み込めませんでした。",
      errBack: "ニュースへ戻る →",
      articleFallback: "記事",
      authorTitle: "著者",
      authorAv: "HL",
      authorName: "HOUSELINK Editorial",
      authorRole: "News & Events",
      ctaTitle: "次のイベントに登録",
      ctaBody: "ビジネスマッチング、フォーラム、業界アップデート。",
      ctaLink: "お問い合わせ →",
      ctaHref: "/ja/contact/",
      relatedTitle: "関連記事",
      bcHome: "ホーム",
      bcHomeHref: "/ja/",
      bcNews: "ニュース＆イベント",
      bcNewsHref: "/ja/news/",
      share: "共有:",
      metaCatFallback: "ニュース",
      secGreenTitle: "週次マーケット更新",
      secGreenBody: "FDI、工業団地、ESG - メインのニュースページで。",
      secGreenBtn: "ニュース＆イベント →",
      secGreenHref: "/ja/news/"
    },
    ko: {
      newsHref: "/ko/news/",
      errMissingSlug: "기사 슬러그가 없습니다.",
      errNotFound: "기사를 찾을 수 없습니다.",
      errLoad: "기사를 불러올 수 없습니다.",
      errBack: "뉴스로 돌아가기 →",
      articleFallback: "기사",
      authorTitle: "작성자",
      authorAv: "HL",
      authorName: "HOUSELINK Editorial",
      authorRole: "News & Events",
      ctaTitle: "다음 이벤트 등록",
      ctaBody: "비즈니스 매칭, 포럼 및 업계 업데이트.",
      ctaLink: "문의하기 →",
      ctaHref: "/ko/contact/",
      relatedTitle: "관련 기사",
      bcHome: "홈",
      bcHomeHref: "/ko/",
      bcNews: "뉴스 & 이벤트",
      bcNewsHref: "/ko/news/",
      share: "공유:",
      metaCatFallback: "뉴스",
      secGreenTitle: "주간 시장 업데이트",
      secGreenBody: "FDI, 산업단지, ESG - 메인 뉴스 페이지에서.",
      secGreenBtn: "뉴스 & 이벤트 →",
      secGreenHref: "/ko/news/"
    },
    zh: {
      newsHref: "/zh/news/",
      errMissingSlug: "缺少文章 slug。",
      errNotFound: "未找到文章。",
      errLoad: "无法加载此文章。",
      errBack: "返回新闻 →",
      articleFallback: "文章",
      authorTitle: "作者",
      authorAv: "HL",
      authorName: "HOUSELINK Editorial",
      authorRole: "News & Events",
      ctaTitle: "报名下一场活动",
      ctaBody: "商务对接、论坛与行业动态。",
      ctaLink: "联系我们 →",
      ctaHref: "/zh/contact/",
      relatedTitle: "相关文章",
      bcHome: "首页",
      bcHomeHref: "/zh/",
      bcNews: "新闻与活动",
      bcNewsHref: "/zh/news/",
      share: "分享:",
      metaCatFallback: "新闻",
      secGreenTitle: "每周市场更新",
      secGreenBody: "FDI、工业园区与 ESG — 见主新闻页。",
      secGreenBtn: "新闻与活动 →",
      secGreenHref: "/zh/news/"
    }
  };

  var CATEGORY_LABELS = {
    houselink: { en: "HOUSELINK", vi: "HOUSELINK", ja: "HOUSELINK", ko: "HOUSELINK", zh: "HOUSELINK" },
    fdi: { en: "FDI", vi: "FDI", ja: "FDI", ko: "FDI", zh: "FDI" },
    industrial: { en: "Industrial", vi: "Công nghiệp", ja: "工業", ko: "산업", zh: "工业" },
    esg: { en: "ESG", vi: "ESG", ja: "ESG", ko: "ESG", zh: "ESG" },
    supply: { en: "Supply chain", vi: "Chuỗi cung ứng", ja: "サプライチェーン", ko: "공급망", zh: "供应链" }
  };

  function langKey() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw = (params.get("lang") || params.get("locale") || document.documentElement.lang || "en").toLowerCase();
      if (raw.indexOf("vi") === 0) return "vi";
      if (raw.indexOf("ja") === 0) return "ja";
      if (raw.indexOf("ko") === 0) return "ko";
      if (raw.indexOf("zh") === 0) return "zh";
    } catch (ignore) {}
    return "en";
  }

  function ui() {
    return ARTICLE_UI[langKey()] || ARTICLE_UI.en;
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

  function resolveLandingOrigin() {
    if (typeof window !== "undefined" && window.location && window.location.origin) {
      return String(window.location.origin).replace(/\/+$/, "");
    }
    return "http://localhost:3000";
  }

  function resolveImageSrc(imageUrl) {
    var raw = String(imageUrl || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.charAt(0) === "/") {
      try {
        return new URL(raw, resolveLandingOrigin() + "/").href;
      } catch (ignore) {
        return raw;
      }
    }
    return raw;
  }

  function rewriteBodyMediaHtml(html) {
    var input = String(html || "");
    if (!input) return input;
    var origin = resolveLandingOrigin();
    return input.replace(
      /\b(src|href|data-src|data-lazy-src|poster)\s*=\s*(["'])([^"']+)\2/gi,
      function (match, attr, quote, value) {
        var v = String(value || "").trim();
        if (!v) return match;
        if (/^https?:\/\//i.test(v) || v.indexOf("data:") === 0 || v.indexOf("mailto:") === 0 || v.indexOf("#") === 0) {
          return match;
        }
        if (v.indexOf("//") === 0) {
          return attr + "=" + quote + "https:" + v + quote;
        }
        if (v.indexOf("/images/") === 0 || v.indexOf("/images%2F") === 0) {
          return attr + "=" + quote + origin + v + quote;
        }
        return match;
      }
    );
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(+d)) return "";
    var locale = langKey() === "vi" ? "vi-VN" : langKey() === "ja" ? "ja-JP" : langKey() === "ko" ? "ko-KR" : langKey() === "zh" ? "zh-CN" : "en-US";
    return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  }

  function categoryLabel(category, categoryLabelFromApi, categoryLabelsFromApi) {
    if (Array.isArray(categoryLabelsFromApi) && categoryLabelsFromApi.length) {
      return categoryLabelsFromApi.map(String).filter(Boolean).join(" · ");
    }
    if (categoryLabelFromApi && String(categoryLabelFromApi).trim()) {
      return String(categoryLabelFromApi).trim();
    }
    var map = CATEGORY_LABELS[category] || null;
    if (map) return map[langKey()] || map.en || category;
    if (category) return String(category).replace(/-/g, " ");
    return ui().metaCatFallback;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text == null ? "" : String(text);
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html == null ? "" : String(html);
  }

  function applyChrome() {
    var copy = ui();
    var home = document.getElementById("hl-cms-bc-home");
    var news = document.getElementById("hl-cms-bc-news");
    if (home) {
      home.textContent = copy.bcHome;
      home.setAttribute("href", copy.bcHomeHref);
    }
    if (news) {
      news.textContent = copy.bcNews;
      news.setAttribute("href", copy.bcNewsHref);
    }
    setText("hl-cms-share-label", copy.share);
    setText("hl-cms-sc-author", copy.authorTitle);
    setText("hl-cms-author-av", copy.authorAv);
    setText("hl-cms-author-name", copy.authorName);
    setText("hl-cms-author-role", copy.authorRole);
    setText("hl-cms-cta-title", copy.ctaTitle);
    setText("hl-cms-cta-body", copy.ctaBody);
    var cta = document.getElementById("hl-cms-cta-link");
    if (cta) {
      cta.textContent = copy.ctaLink;
      cta.setAttribute("href", copy.ctaHref);
    }
    setText("hl-cms-related-sc-title", copy.relatedTitle);
    setText("hl-cms-sec-green-title", copy.secGreenTitle);
    setText("hl-cms-sec-green-body", copy.secGreenBody);
    var green = document.getElementById("hl-cms-sec-green-link");
    if (green) {
      green.textContent = copy.secGreenBtn;
      green.setAttribute("href", copy.secGreenHref);
    }
  }

  function showError(message) {
    var copy = ui();
    setText("hl-cms-hero-title", message);
    setText("hl-cms-hero-eyebrow", "");
    setText("hl-cms-hero-sub", "");
    setHtml(
      "hl-cms-body",
      '<p><a class="back-news" href="' +
        copy.newsHref +
        '">' +
        copy.errBack +
        "</a></p>"
    );
  }

  function renderRelated(articles, currentSlug) {
    var root = document.getElementById("hl-cms-related");
    if (!root) return;
    var others = (articles || []).filter(function (a) {
      return a && a.slug && a.slug !== currentSlug;
    }).slice(0, 4);
    if (!others.length) {
      var card = document.getElementById("hl-cms-related-card");
      if (card) card.style.display = "none";
      return;
    }
    root.innerHTML = others
      .map(function (a) {
        var href = "/news/cms/?slug=" + encodeURIComponent(a.slug);
        if (langKey() !== "en") href += "&lang=" + encodeURIComponent(langKey());
        var img = resolveImageSrc(a.coverImageUrl);
        var imgHtml = img
          ? '<img class="rel-img" src="' + img.replace(/"/g, "&quot;") + '" alt="" loading="lazy">'
          : '<div class="rel-img"></div>';
        return (
          '<div class="rel-item">' +
          imgHtml +
          '<div><div class="rel-ttl"><a href="' +
          href.replace(/"/g, "&quot;") +
          '">' +
          String(a.title || "").replace(/</g, "&lt;") +
          "</a></div>" +
          '<div class="rel-date">' +
          fmtDate(a.publishedAt) +
          "</div></div></div>"
        );
      })
      .join("");
  }

  function renderArticle(article, related) {
    var copy = ui();
    var cat = categoryLabel(article.category, article.categoryLabel, article.categoryLabels);
    var date = fmtDate(article.publishedAt || article.createdAt);
    document.title = String(article.title || copy.articleFallback) + " – HOUSELINK";
    setText("hl-cms-bc-last", article.title || copy.articleFallback);
    setText("hl-cms-hero-eyebrow", cat + (date ? " · " + date : ""));
    setText("hl-cms-hero-title", article.title || "");
    setText("hl-cms-hero-sub", article.excerpt || "");
    setText("hl-cms-meta-cat", cat);
    setText("hl-cms-meta-date", date || "-");

    var cover = document.getElementById("hl-cms-cover");
    var coverSrc = resolveImageSrc(article.coverImageUrl);
    if (cover) {
      if (coverSrc) {
        cover.src = coverSrc;
        cover.alt = article.title || "";
        cover.style.display = "";
      } else {
        cover.style.display = "none";
      }
    }

    var lead = document.getElementById("hl-cms-lead");
    if (lead) {
      if (article.excerpt) {
        lead.textContent = article.excerpt;
        lead.style.display = "";
      } else {
        lead.style.display = "none";
      }
    }

    setHtml("hl-cms-body", rewriteBodyMediaHtml(article.body || ""));

    // Tags are admin/ops metadata only — not shown on public detail (matches legacy landing).
    var tagsRoot = document.getElementById("hl-cms-tags");
    if (tagsRoot) {
      tagsRoot.style.display = "none";
      tagsRoot.innerHTML = "";
    }

    renderRelated(related, article.slug);
  }

  async function load() {
    applyChrome();
    var params = new URLSearchParams(window.location.search);
    var slug = String(params.get("slug") || "").trim();
    var copy = ui();
    if (!slug) {
      showError(copy.errMissingSlug);
      return;
    }

    await ensureAuthEnv();
    var apiBase = resolveNewsApiBase();
    try {
      var detailRes = await fetch(apiBase + "/api/news-articles/" + encodeURIComponent(slug), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit"
      });
      var detailBody = await detailRes.json().catch(function () {
        return null;
      });
      if (!detailRes.ok || !detailBody || detailBody.success !== true || !detailBody.data || !detailBody.data.article) {
        showError(detailRes.status === 404 ? copy.errNotFound : copy.errLoad);
        return;
      }
      var article = detailBody.data.article;
      var related = [];
      try {
        var listRes = await fetch(
          apiBase + "/api/news-articles?locale=" + encodeURIComponent(article.locale || langKey()),
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "omit"
          }
        );
        var listBody = await listRes.json();
        if (listRes.ok && listBody && listBody.success === true) {
          related = (listBody.data && listBody.data.articles) || [];
        }
      } catch (ignore) {}
      renderArticle(article, related);
    } catch (err) {
      showError(copy.errLoad);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
