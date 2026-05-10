/**
 * Renders a Vietnam Construction (WordPress) post on /news/article/?id=
 * Optional `?lang=vi|ja|ko|zh` (or `locale=`) localizes sidebar, CTA, breadcrumb, dates, related links.
 * Same source strategy as hl-news-feed (optional data-hl-vn-news-source on body).
 */
(function () {
  "use strict";

  /** UI copy for article page sidebar, CTA, breadcrumb, footer strip — keyed by `?lang=`. */
  var ARTICLE_UI = {
    en: {
      newsHref: "/news/",
      errMissingId: "Missing article id.",
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
        "Business matching, forums and industry updates — get priority access to HOUSELINK events.",
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
      secGreenBody: "FDI, industrial parks and ESG — on the main news page.",
      secGreenBtn: "News & Events →",
      secGreenHref: "/news/"
    },
    vi: {
      newsHref: "/vi/news/",
      errMissingId: "Thiếu mã bài viết.",
      errNotFound: "Không tìm thấy bài viết.",
      errLoad: "Không tải được bài viết này.",
      errBack: "Quay lại Tin tức →",
      articleFallback: "Bài viết",
      authorTitle: "Tác giả",
      authorAv: "MH",
      authorName: "Mai Hương",
      authorRole: "Community & Events Manager",
      ctaTitle: "Đăng ký tham dự sự kiện tiếp theo",
      ctaBody: "ESG Forum tháng 6/2026 tại TP.HCM — đăng ký sớm để nhận ưu tiên.",
      ctaLink: "Liên hệ ngay →",
      ctaHref: "/vi/contact/",
      relatedTitle: "Bài viết liên quan",
      bcHome: "Trang chủ",
      bcHomeHref: "/vi/",
      bcNews: "Tin tức & Sự kiện",
      bcNewsHref: "/vi/news/",
      share: "Chia sẻ:",
      metaCatFallback: "Tin tức",
      secGreenTitle: "Cập nhật thị trường hàng tuần",
      secGreenBody: "FDI, khu công nghiệp và ESG — trên trang tin chính.",
      secGreenBtn: "Tin tức & Sự kiện →",
      secGreenHref: "/vi/news/"
    },
    ja: {
      newsHref: "/ja/news/",
      errMissingId: "記事IDがありません。",
      errNotFound: "記事が見つかりません。",
      errLoad: "記事を読み込めませんでした。",
      errBack: "ニュースへ戻る →",
      articleFallback: "記事",
      authorTitle: "著者",
      authorAv: "HL",
      authorName: "HOUSELINK 編集部",
      authorRole: "ニュース・イベント",
      ctaTitle: "次のイベントに登録",
      ctaBody: "ビジネスマッチング、フォーラム、業界アップデート — HOUSELINKイベントの優先案内を受け取れます。",
      ctaLink: "お問い合わせ →",
      ctaHref: "/ja/contact/",
      relatedTitle: "関連記事",
      bcHome: "ホーム",
      bcHomeHref: "/ja/",
      bcNews: "ニュース・イベント",
      bcNewsHref: "/ja/news/",
      share: "共有:",
      metaCatFallback: "ニュース",
      secGreenTitle: "週次マーケットアップデート",
      secGreenBody: "FDI、工業団地、ESG — メインのニュースページで。",
      secGreenBtn: "ニュース・イベント →",
      secGreenHref: "/ja/news/"
    },
    ko: {
      newsHref: "/ko/news/",
      errMissingId: "기사 ID가 없습니다.",
      errNotFound: "기사를 찾을 수 없습니다.",
      errLoad: "기사를 불러오지 못했습니다.",
      errBack: "뉴스로 돌아가기 →",
      articleFallback: "기사",
      authorTitle: "저자",
      authorAv: "HL",
      authorName: "HOUSELINK 편집부",
      authorRole: "뉴스 및 이벤트",
      ctaTitle: "다음 행사 등록하기",
      ctaBody: "비즈니스 매칭, 포럼, 업계 소식 — HOUSELINK 행사 우선 안내를 받으세요.",
      ctaLink: "문의하기 →",
      ctaHref: "/ko/contact/",
      relatedTitle: "관련 기사",
      bcHome: "홈",
      bcHomeHref: "/ko/",
      bcNews: "뉴스 및 이벤트",
      bcNewsHref: "/ko/news/",
      share: "공유:",
      metaCatFallback: "뉴스",
      secGreenTitle: "주간 시장 업데이트",
      secGreenBody: "FDI, 산업단지, ESG — 메인 뉴스 페이지에서 확인하세요.",
      secGreenBtn: "뉴스 및 이벤트 →",
      secGreenHref: "/ko/news/"
    },
    zh: {
      newsHref: "/zh/news/",
      errMissingId: "缺少文章编号。",
      errNotFound: "未找到文章。",
      errLoad: "无法加载此文章。",
      errBack: "返回新闻 →",
      articleFallback: "文章",
      authorTitle: "作者",
      authorAv: "HL",
      authorName: "HOUSELINK 编辑部",
      authorRole: "新闻与活动",
      ctaTitle: "注册参加下一场活动",
      ctaBody: "商务对接、论坛与行业动态 — 优先获取 HOUSELINK 活动资讯。",
      ctaLink: "联系我们 →",
      ctaHref: "/zh/contact/",
      relatedTitle: "相关文章",
      bcHome: "首页",
      bcHomeHref: "/zh/",
      bcNews: "新闻与活动",
      bcNewsHref: "/zh/news/",
      share: "分享：",
      metaCatFallback: "新闻",
      secGreenTitle: "每周市场动态",
      secGreenBody: "FDI、工业园区与 ESG — 前往主新闻页了解更多。",
      secGreenBtn: "新闻与活动 →",
      secGreenHref: "/zh/news/"
    }
  };

  function stripHtml(html) {
    if (!html) return "";
    var tmp = document.createElement("div");
    tmp.innerHTML = String(html);
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(+d)) return "";
    var loc = getArticleLocale();
    if (loc === "vi") return "Tháng " + (d.getMonth() + 1) + ", " + d.getFullYear();
    var localeTag =
      loc === "ja" ? "ja-JP" : loc === "ko" ? "ko-KR" : loc === "zh" ? "zh-CN" : "";
    if (localeTag)
      return d.toLocaleDateString(localeTag, { year: "numeric", month: "short", day: "numeric" });
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  /** dd/mm/yyyy — matches esg-forum pg-eye line (e.g. 31/03/2026). */
  function fmtDateEyebrow(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(+d)) return "";
    var dd = d.getDate();
    var mm = d.getMonth() + 1;
    var yyyy = d.getFullYear();
    return (dd < 10 ? "0" : "") + dd + "/" + (mm < 10 ? "0" : "") + mm + "/" + yyyy;
  }

  /** e.g. HOUSELINK Event · 31/03/2026 */
  function heroEyebrowFromPost(post) {
    var cat = pickCategoryName(post) || "Event";
    var d = fmtDateEyebrow(post && (post.modified || post.date));
    if (d) return "HOUSELINK " + cat + " · " + d;
    return "HOUSELINK " + cat;
  }

  function pickImage(post) {
    try {
      var emb = post && post._embedded;
      var fm = emb && emb["wp:featuredmedia"] && emb["wp:featuredmedia"][0];
      if (fm && fm.source_url) return fm.source_url;
      if (fm && fm.media_details && fm.media_details.sizes) {
        var sizes = fm.media_details.sizes;
        if (sizes.medium_large && sizes.medium_large.source_url) return sizes.medium_large.source_url;
        if (sizes.large && sizes.large.source_url) return sizes.large.source_url;
        if (sizes.medium && sizes.medium.source_url) return sizes.medium.source_url;
      }
    } catch (ignore) {}
    return "";
  }

  function pickCategoryName(post) {
    try {
      var terms = post && post._embedded && post._embedded["wp:term"];
      if (!terms || !terms.length) return "";
      var cats = terms[0];
      if (!Array.isArray(cats) || !cats.length) return "";
      return stripHtml((cats[0] && cats[0].name) || "");
    } catch (ignore) {}
    return "";
  }

  function sanitizeWpHtml(html) {
    var d = document.createElement("div");
    d.innerHTML = String(html || "");
    var scripts = d.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) scripts[i].remove();
    return d.innerHTML;
  }

  function getQueryId() {
    var m = /[?&]id=(\d+)/.exec(window.location.search);
    return m ? parseInt(m[1], 10) : NaN;
  }

  /** `?lang=` / `?locale=` — e.g. links from /ja/news/, /vi/insights/ (`lang=ja`, `lang=vi`). */
  function getArticleLocale() {
    var q = window.location.search || "";
    var m = /[?&](?:lang|locale)=([a-z]{2})(?:&|$)/i.exec(q);
    if (m) {
      var k = m[1].toLowerCase();
      if (ARTICLE_UI[k]) return k;
    }
    return "en";
  }

  function getArticleUi() {
    var loc = getArticleLocale();
    return ARTICLE_UI[loc] || ARTICLE_UI.en;
  }

  function syncArticleChromeLocale() {
    var ui = getArticleUi();
    var loc = getArticleLocale();
    document.documentElement.setAttribute("lang", loc === "en" ? "en" : loc);

    setText("hl-vc-sc-author", ui.authorTitle);
    setText("hl-vc-author-av", ui.authorAv);
    setText("hl-vc-author-name", ui.authorName);
    setText("hl-vc-author-role", ui.authorRole);
    setText("hl-vc-cta-title", ui.ctaTitle);
    setText("hl-vc-cta-body", ui.ctaBody);
    var ctaA = document.getElementById("hl-vc-cta-link");
    if (ctaA) {
      ctaA.textContent = ui.ctaLink;
      ctaA.setAttribute("href", ui.ctaHref);
    }
    setText("hl-vc-related-sc-title", ui.relatedTitle);

    var home = document.getElementById("hl-vc-bc-home");
    var news = document.getElementById("hl-vc-bc-news");
    if (home) {
      home.textContent = ui.bcHome;
      home.setAttribute("href", ui.bcHomeHref);
    }
    if (news) {
      news.textContent = ui.bcNews;
      news.setAttribute("href", ui.bcNewsHref);
    }
    setText("hl-vc-share-label", ui.share);

    setText("hl-vc-sec-green-title", ui.secGreenTitle);
    setText("hl-vc-sec-green-body", ui.secGreenBody);
    var sg = document.getElementById("hl-vc-sec-green-link");
    if (sg) {
      sg.textContent = ui.secGreenBtn;
      sg.setAttribute("href", ui.secGreenHref);
    }
  }

  function articleDetailHref(postId) {
    var href = "/news/article/?id=" + encodeURIComponent(postId);
    var loc = getArticleLocale();
    if (loc !== "en") href += "&lang=" + encodeURIComponent(loc);
    return href;
  }

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * @param {{ offset: number, perPage: number, page: number, categories: number[], embed: boolean }} input
   * @param {string} hardFnName key on HL_VietnamConstruction for hardcode list fetch
   */
  async function fetchVcPostBatch(input, hardFnName) {
    var VC = window.HL_VietnamConstruction;
    if (!VC) throw new Error("vc");
    var mode = (document.body && document.body.getAttribute("data-hl-vn-news-source")) || "";
    mode = String(mode).toLowerCase();
    var hardFn = VC[hardFnName];
    if (mode === "hardcode") {
      if (typeof hardFn !== "function") throw new Error("vc_hard");
      return hardFn(input);
    }
    if (mode === "api") return VC.fetchFromVietnamconstruction(input);
    try {
      var apiRes = await VC.fetchFromVietnamconstruction(input);
      var plist = (apiRes && apiRes.posts) || [];
      if (Array.isArray(plist) && plist.length) return apiRes;
    } catch (ignore) {}
    if (typeof hardFn !== "function") throw new Error("vc_hard");
    return hardFn(input);
  }

  async function fetchRelatedPostsPool(currentId) {
    var VC = window.HL_VietnamConstruction;
    if (!VC) return [];
    var specs = [
      { cats: VC.defaultViEventCategories, hard: "hardcodeEventViFromVietnamconstruction" },
      { cats: VC.defaultEnCategories, hard: "hardcodeFromVietnamconstruction" },
      { cats: VC.defaultViMarketCategories, hard: "hardcodeMarketViFromVietnamconstruction" },
      { cats: VC.defaultMarketCategories, hard: "hardcodeMarketFromVietnamconstruction" }
    ];
    var inputBase = { offset: 0, perPage: 100, page: 1, embed: true };
    for (var i = 0; i < specs.length; i++) {
      try {
        var input = Object.assign({}, inputBase, { categories: specs[i].cats });
        var result = await fetchVcPostBatch(input, specs[i].hard);
        var posts = (result && result.posts) || [];
        var has = false;
        for (var j = 0; j < posts.length; j++) {
          if (posts[j].id === currentId) {
            has = true;
            break;
          }
        }
        if (has && posts.length) return posts;
      } catch (ignore) {}
    }
    for (var k = 0; k < specs.length; k++) {
      try {
        var input2 = Object.assign({}, inputBase, { categories: specs[k].cats });
        var r2 = await fetchVcPostBatch(input2, specs[k].hard);
        var p2 = (r2 && r2.posts) || [];
        if (p2.length) return p2;
      } catch (ignore2) {}
    }
    return [];
  }

  async function populateRelated(currentId) {
    var card = document.getElementById("hl-vc-related-card");
    var el = document.getElementById("hl-vc-related");
    if (!el || !card) return;
    try {
      var VC = window.HL_VietnamConstruction;
      if (!VC) {
        card.style.display = "none";
        return;
      }
      var posts = await fetchRelatedPostsPool(currentId);
      var others = [];
      for (var i = 0; i < posts.length; i++) {
        if (posts[i].id !== currentId) others.push(posts[i]);
        if (others.length >= 3) break;
      }
      if (!others.length) {
        card.style.display = "none";
        return;
      }
      card.style.display = "";
      var html = "";
      for (var j = 0; j < others.length; j++) {
        var p = others[j];
        var t = stripHtml(p.title && p.title.rendered);
        var href = articleDetailHref(p.id);
        var im = pickImage(p);
        var dt = fmtDate(p.modified || p.date);
        html += '<div class="rel-item">';
        if (im) {
          html += '<img class="rel-img" src="' + escHtml(im) + '" alt="' + escHtml(t) + '">';
        } else {
          html += '<div class="rel-img" aria-hidden="true"></div>';
        }
        html +=
          '<div><div class="rel-ttl"><a href="' +
          escHtml(href) +
          '">' +
          escHtml(t) +
          '</a></div><div class="rel-date">' +
          escHtml(dt) +
          "</div></div></div>";
      }
      el.innerHTML = html;
    } catch (ignore) {
      card.style.display = "none";
    }
  }

  async function loadPost(id) {
    var VC = window.HL_VietnamConstruction;
    if (!VC) throw new Error("vc_missing");
    var mode = (document.body && document.body.getAttribute("data-hl-vn-news-source")) || "";
    mode = String(mode).toLowerCase();
    var input = { id: id };
    var hardcodeChain = [
      VC.hardcodeEventViPostFromVietnamconstruction,
      VC.hardcodePostFromVietnamconstruction,
      VC.hardcodeMarketViPostFromVietnamconstruction,
      VC.hardcodeMarketPostFromVietnamconstruction
    ];
    if (mode === "hardcode") {
      for (var i = 0; i < hardcodeChain.length; i++) {
        if (typeof hardcodeChain[i] !== "function") continue;
        var hi = await hardcodeChain[i](input);
        if (hi && hi.post) return hi;
      }
      return { post: null, meta: { source: "hardcode", id: id } };
    }
    if (mode === "api") {
      return VC.fetchPostFromVietnamconstruction(input);
    }
    try {
      var r = await VC.fetchPostFromVietnamconstruction(input);
      if (r && r.post) return r;
    } catch (ignore) {}
    for (var j = 0; j < hardcodeChain.length; j++) {
      if (typeof hardcodeChain[j] !== "function") continue;
      var hj = await hardcodeChain[j](input);
      if (hj && hj.post) return hj;
    }
    return { post: null, meta: { source: "hardcode", id: id } };
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function showErr(msg) {
    var ui = getArticleUi();
    var root = document.getElementById("hl-vc-article-root");
    if (root) {
      root.innerHTML =
        '<p style="padding:48px 0;font-size:15px;color:var(--gray-600);">' +
        msg +
        ' <a href="' +
        escHtml(ui.newsHref) +
        '" style="color:var(--green);font-weight:700;">' +
        escHtml(ui.errBack) +
        "</a></p>";
    }
    var h = document.getElementById("hl-vc-hero-title");
    if (h) h.textContent = ui.articleFallback;
  }

  async function boot() {
    syncArticleChromeLocale();
    var id = getQueryId();
    if (!id) {
      showErr(getArticleUi().errMissingId);
      return;
    }

    var root = document.getElementById("hl-vc-article-root");
    if (!root) return;

    try {
      var pack = await loadPost(id);
      var post = pack && pack.post;
      if (!post) {
        showErr(getArticleUi().errNotFound);
        return;
      }

      var title = stripHtml(post.title && post.title.rendered);
      var excerpt = stripHtml(post.excerpt && post.excerpt.rendered);
      var cat = pickCategoryName(post);
      var date = fmtDate(post.modified || post.date);
      var img = pickImage(post);
      var contentHtml = (post.content && post.content.rendered) || "";

      document.title = title ? title + " – HOUSELINK" : document.title;

      setText("hl-vc-bc-last", title.slice(0, 72) + (title.length > 72 ? "…" : ""));
      setText("hl-vc-hero-eyebrow", heroEyebrowFromPost(post));
      setText("hl-vc-hero-title", title);
      setText("hl-vc-hero-sub", excerpt || "");
      setText("hl-vc-meta-cat", cat || getArticleUi().metaCatFallback);
      setText("hl-vc-meta-date", date || "—");

      var cover = document.getElementById("hl-vc-cover");
      if (cover) {
        if (img) {
          cover.src = img;
          cover.alt = title;
          cover.style.display = "";
        } else {
          cover.style.display = "none";
        }
      }

      var lead = document.getElementById("hl-vc-lead");
      if (lead) {
        if (excerpt) {
          lead.textContent = excerpt;
          lead.style.display = "";
        } else {
          lead.style.display = "none";
        }
      }

      setHtml("hl-vc-body", sanitizeWpHtml(contentHtml));
      await populateRelated(id);
    } catch (e) {
      showErr(getArticleUi().errLoad);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
