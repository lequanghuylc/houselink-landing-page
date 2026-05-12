/**
 * Homepage / locale index: fill #hl-home-insights-grid with the 3 newest Insights posts
 * (Market + Learn merge — same rules as hl-insights-feed.js).
 */
(function () {
  "use strict";

  function langKey() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("vi") === 0) return "vi";
    if (raw.indexOf("ja") === 0) return "ja";
    if (raw.indexOf("ko") === 0) return "ko";
    if (raw.indexOf("zh") === 0) return "zh";
    return "en";
  }

  function useViMarket() {
    return langKey() === "vi";
  }

  function stripHtml(html) {
    if (!html) return "";
    var tmp = document.createElement("div");
    tmp.innerHTML = String(html);
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(+d)) return "";
    var k = langKey();
    if (k === "vi") return "Tháng " + (d.getMonth() + 1) + ", " + d.getFullYear();
    if (k === "ja") return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
    if (k === "ko") return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
    if (k === "zh") return d.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  function firstLocalUploadFromPostHtml(post) {
    var html =
      ((post && post.content && post.content.rendered) || "") +
      " " +
      ((post && post.excerpt && post.excerpt.rendered) || "");
    if (!html) return "";
    var m = String(html).match(/src\s*=\s*["'](\/images\/uploads\/[^"']+)["']/i);
    if (m) return m[1];
    m = String(html).match(/\/images\/uploads\/[^"'>\s#]+/i);
    if (!m) return "";
    var s = m[0];
    var q = s.indexOf("?");
    return q === -1 ? s : s.slice(0, q);
  }

  function pickImage(post) {
    try {
      var emb = post && post._embedded;
      var fm = emb && emb["wp:featuredmedia"] && emb["wp:featuredmedia"][0];
      var u = "";
      if (fm && fm.source_url) u = fm.source_url;
      if (!u && fm && fm.media_details && fm.media_details.sizes) {
        var sizes = fm.media_details.sizes;
        if (sizes.medium_large && sizes.medium_large.source_url) u = sizes.medium_large.source_url;
        else if (sizes.large && sizes.large.source_url) u = sizes.large.source_url;
        else if (sizes.medium && sizes.medium.source_url) u = sizes.medium.source_url;
      }
      if (u && u.indexOf("/images/uploads/") !== -1) return u;
      var local = firstLocalUploadFromPostHtml(post);
      if (local) return local;
      return u || "";
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

  function mergePostsByDateDescTwo(lists) {
    var seen = {};
    var out = [];
    for (var a = 0; a < lists.length; a++) {
      var list = lists[a];
      if (!Array.isArray(list)) continue;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || typeof p.id === "undefined") continue;
        if (seen[p.id]) continue;
        seen[p.id] = true;
        out.push(p);
      }
    }
    out.sort(function (x, y) {
      var dx = new Date(x.date || x.modified || 0).getTime();
      var dy = new Date(y.date || y.modified || 0).getTime();
      return dy - dx;
    });
    return out;
  }

  function estReadMin(post) {
    var ex = stripHtml((post.excerpt && post.excerpt.rendered) || "");
    var words = ex ? ex.split(/\s+/).filter(Boolean).length : 0;
    if (words < 40) {
      var co = stripHtml((post.content && post.content.rendered) || "");
      words += co ? co.split(/\s+/).filter(Boolean).length : 0;
    }
    return Math.max(1, Math.min(45, Math.round(words / 220)));
  }

  function readLine(post) {
    var d = fmtDate(post.modified || post.date);
    var n = estReadMin(post);
    var k = langKey();
    if (k === "vi") return (d ? d + " · " : "") + n + " phút đọc";
    if (k === "ja") return (d ? d + " · " : "") + "約" + n + "分";
    if (k === "ko") return (d ? d + " · " : "") + "약 " + n + "분 읽기";
    if (k === "zh") return (d ? d + " · " : "") + "约 " + n + " 分钟阅读";
    return (d ? d + " · " : "") + n + " min read";
  }

  function detailHref(post) {
    var u = "/news/article/?id=" + encodeURIComponent(post.id);
    var k = langKey();
    if (k !== "en") u += "&lang=" + encodeURIComponent(k);
    return u;
  }

  function injectCardLinkStyle() {
    if (document.getElementById("hl-home-insights-preview-style")) return;
    var s = document.createElement("style");
    s.id = "hl-home-insights-preview-style";
    s.textContent =
      "a.insight-card{display:block;text-decoration:none;color:inherit;}" +
      "a.insight-card .insight-title{color:var(--navy);}";
    document.head.appendChild(s);
  }

  function renderCards(grid, posts) {
    injectCardLinkStyle();
    var html = "";
    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var title = stripHtml(p.title && p.title.rendered);
      var excerpt = stripHtml(p.excerpt && p.excerpt.rendered);
      var img = pickImage(p);
      var cat = pickCategoryName(p) || (langKey() === "vi" ? "Thị trường" : "Market");
      var href = detailHref(p);
      var imgCls = "insight-img" + (i === 0 ? " insight-img-tall" : "");
      var imgHtml = img
        ? '<img class="' + imgCls + '" src="' + esc(img) + '" alt="' + esc(title) + '" loading="lazy" decoding="async">'
        : '<div class="' + imgCls + '" style="background:var(--gray-50);"></div>';
      html +=
        '<a class="insight-card" href="' +
        esc(href) +
        '">' +
        imgHtml +
        '<div class="insight-body">' +
        '<div class="insight-tag">' +
        esc(cat) +
        "</div>" +
        '<div class="insight-title">' +
        esc(title) +
        "</div>" +
        '<div class="insight-date">' +
        esc(readLine(p)) +
        "</div>" +
        (excerpt ? '<div class="insight-desc">' + esc(excerpt) + "</div>" : "") +
        "</div></a>";
    }
    grid.innerHTML = html;
  }

  async function fetchLearnPosts(VC, mode, isVi) {
    var catIds = isVi ? VC.defaultLearnViCategories || [74] : VC.defaultLearnEnCategories || [33];
    var learnInput = {
      offset: 0,
      perPage: 100,
      page: 1,
      categories: catIds,
      embed: true
    };
    if (isVi) learnInput.lang = "vi";

    async function fromHardcode() {
      try {
        if (isVi && typeof VC.hardcodeLearnViFromVietnamconstruction === "function") {
          var rv = await VC.hardcodeLearnViFromVietnamconstruction(learnInput);
          return (rv && rv.posts) || [];
        }
        if (!isVi && typeof VC.hardcodeLearnFromVietnamconstruction === "function") {
          var re = await VC.hardcodeLearnFromVietnamconstruction(learnInput);
          return (re && re.posts) || [];
        }
      } catch (ignore) {}
      return [];
    }

    async function fromApi() {
      try {
        var ar = await VC.fetchFromVietnamconstruction(learnInput);
        var posts = ar && ar.posts;
        if (Array.isArray(posts) && posts.length) return posts;
      } catch (ignore) {}
      return [];
    }

    if (mode === "hardcode") return fromHardcode();
    if (mode === "api") {
      var a = await fromApi();
      if (a.length) return a;
      return fromHardcode();
    }
    var a2 = await fromApi();
    if (a2.length) return a2;
    return fromHardcode();
  }

  async function loadTopPosts(VC) {
    var isVi = useViMarket();
    var mode = (document.body && document.body.getAttribute("data-hl-vn-news-source")) || "";
    mode = String(mode).toLowerCase();
    var input = {
      offset: 0,
      perPage: 100,
      page: 1,
      categories: isVi ? VC.defaultViMarketCategories : VC.defaultMarketCategories,
      embed: true
    };

    var result;
    if (mode === "hardcode") {
      result = isVi
        ? await VC.hardcodeMarketViFromVietnamconstruction(input)
        : await VC.hardcodeMarketFromVietnamconstruction(input);
    } else if (mode === "api") {
      result = await VC.fetchFromVietnamconstruction(input);
    } else {
      try {
        result = await VC.fetchFromVietnamconstruction(input);
      } catch (ignore) {
        result = { posts: [] };
      }
      var apiPosts = result && result.posts;
      if (!Array.isArray(apiPosts) || !apiPosts.length) {
        result = isVi
          ? await VC.hardcodeMarketViFromVietnamconstruction(input)
          : await VC.hardcodeMarketFromVietnamconstruction(input);
      }
    }

    var posts = (result && result.posts) || [];
    if (!Array.isArray(posts)) posts = [];

    var learnPosts = [];
    try {
      learnPosts = await fetchLearnPosts(VC, mode, isVi);
    } catch (ignore) {}

    posts = mergePostsByDateDescTwo([posts, learnPosts]);
    return posts.slice(0, 3);
  }

  async function boot() {
    var grid = document.getElementById("hl-home-insights-grid");
    if (!grid) return;
    var VC = window.HL_VietnamConstruction;
    if (!VC) return;
    try {
      var top = await loadTopPosts(VC);
      if (top.length) renderCards(grid, top);
    } catch (ignore) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
