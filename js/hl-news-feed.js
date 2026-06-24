/**
 * Lightweight browser-side news feed loader (WordPress REST).
 * Progressive enhancement: optional `.hl-news-fallback` static cards stay in HTML;
 * hidden with `.hl-feed-waiting` while JS loads; shown again if every source fails.
 * EN + JA/KO/ZH: Vietnam Construction Event (EN, cat 6). VI: Event (VI, cat 66) from data-event-vi.json.
 * Fallback: fetch data-event-en.json / data-event-vi.json from the same /js/ directory if VC or API fails.
 * Filters, cached pagination, detail links to /news/article/?id=.
 */
(function () {
  "use strict";

  var WP_BASE = "https://vietnamconstruction.vn";
  var WP_POSTS = WP_BASE + "/wp-json/wp/v2/posts";
  var INITIAL_PAGE_SIZE = 7;
  var LOAD_MORE_SIZE = 9;
  var loadMoreClickBound = false;
  var filterBarBound = false;
  /** Full EN VC list + active filter (client-side only). */
  var enNewsState = { allPosts: [], filter: "all" };

  function langKey() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("vi") === 0) return "vi";
    if (raw.indexOf("ja") === 0) return "ja";
    if (raw.indexOf("ko") === 0) return "ko";
    if (raw.indexOf("zh") === 0) return "zh";
    return "en";
  }

  function tagForLocale() {
    var forced = document.body && document.body.getAttribute("data-hl-news-tag");
    if (forced) return String(forced);
    // Mirrors `Houselink/News.API.js#getListNews(isEng)` where EN uses tag=21, otherwise tag=22.
    return langKey() === "en" ? "21" : "22";
  }

  /** EN Event feed (Vietnam Construction) also on JA / KO / ZH news pages - English copy, same data. */
  function useVcEnFeed() {
    var k = langKey();
    return k === "en" || k === "ja" || k === "ko" || k === "zh";
  }

  /** VI news page: local/API feed category 66 (Sự kiện). */
  function useVcViFeed() {
    return langKey() === "vi";
  }

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
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  /** First category name from ?_embed=1 (wp:term[0] = categories). */
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

  function allTermNames(post, termIndex) {
    try {
      var terms = post && post._embedded && post._embedded["wp:term"];
      if (!terms || !terms[termIndex]) return [];
      var arr = terms[termIndex];
      if (!Array.isArray(arr)) return [];
      return arr.map(function (c) {
        return stripHtml((c && c.name) || "").toLowerCase();
      });
    } catch (ignore) {
      return [];
    }
  }

  /** Filter keys: all | houselink | fdi | industrial | esg | supply */
  function postMatchesFilter(post, key) {
    if (!key || key === "all") return true;
    var blob =
      stripHtml((post.title && post.title.rendered) || "").toLowerCase() +
      " " +
      stripHtml((post.excerpt && post.excerpt.rendered) || "").toLowerCase();
    var cats = allTermNames(post, 0);
    var tags = allTermNames(post, 1);
    var all = blob + " " + cats.join(" ") + " " + tags.join(" ");

    if (key === "houselink") {
      if (/houselink|house\s*link|cộng đồng|cong dong|sự kiện houselink|su kien houselink/.test(all)) return true;
      if (cats.indexOf("player") !== -1 || cats.indexOf("community") !== -1) return true;
      return false;
    }
    if (key === "fdi") {
      if (
        /\b(fdi|foreign direct|investor|\binvest\b|investment|billion|\busd\b|capital inflow|rcep|trade|ministerial|intersessional|economic|business outlook|firms discuss|opportunit|gms summit|vietnam business|\bgaft\b|theleader|\beu\b.*\bvn\b|discuss business)/.test(
          all
        )
      )
        return true;
      if (
        /(đầu tư|dau tu|fdi|vốn ngoại|von ngoai|nhà đầu tư|nha dau tu|tăng trưởng|tang truong|rcep|xuất nhập khẩu|xuat nhap khau)/.test(
          all
        )
      )
        return true;
      if (cats.indexOf("invest") !== -1 || cats.indexOf("investor") !== -1) return true;
      return false;
    }
    if (key === "industrial") {
      if (cats.indexOf("industrial") !== -1 || cats.indexOf("project") !== -1 || cats.indexOf("architect") !== -1)
        return true;
      if (
        /(industrial|factory|warehouse|real estate|property festival|exhibition|secc|steel|building material|materials institute|urban area|theater|thu thiem|contest to design|anniversary|property\b|atad|concrete|floors?|\bconstruction\b|manufacturing base|plane parts|korea firm)/.test(
          all
        )
      )
        return true;
      if (
        /(kcn|Khu công nghiệp|khu công nghiệp|khu cong nghiep|hạ tầng khu công nghiệp|ha tang khu cong nghiep|nhà máy|nha may|nhà xưởng|nha xuong|xây dựng|xay dung|hạ tầng khu công nghiệp|ha tang khu cong nghiep)/.test(
          all
        )
      )
        return true;
      return false;
    }
    if (key === "esg") {
      if (/(esg|green building|renewable|solar|carbon|cbam|climate|sustainable|nudges green)/.test(all)) return true;
      if (/(bền vững|ben vung|năng lượng|nang luong|khí hậu|khi hau|dppa|re100|điện mặt trời|dien mat troi)/.test(all))
        return true;
      if (cats.indexOf("learn") !== -1) return true;
      return false;
    }
    if (key === "supply") {
      if (
        /(supply chain|semiconductor|logistics|ict|industry 4|smart factory|digital transformation|technology platform|electronics|secutech|urban safety|security expo|belt and road|smart cit|digital technology|startup|scholars|ysi|next manufacturing|sme)/.test(
          all
        )
      )
        return true;
      if (
        /(chuỗi cung ứng|chuyen cung ung|bán dẫn|ban dan|cung ứng|cung ung|hậu cần|hau can|logistics|công nghệ|cng nghe)/.test(
          all
        )
      )
        return true;
      if (cats.indexOf("tech") !== -1) return true;
      return false;
    }
    return true;
  }

  function getFilteredPosts() {
    if (!enNewsState.allPosts || !enNewsState.allPosts.length) return [];
    return enNewsState.allPosts.filter(function (p) {
      return postMatchesFilter(p, enNewsState.filter);
    });
  }

  function postsUrlForLocale() {
    if (langKey() === "en") {
      return (
        WP_POSTS +
        "?categories=6&per_page=7&offset=0&_embed=1&orderby=date&order=desc"
      );
    }
    var tag = tagForLocale();
    return (
      WP_POSTS +
      "?_embed=1&per_page=7&categories=20&tags=" +
      encodeURIComponent(tag) +
      "&orderby=modified&order=desc"
    );
  }

  function newsContinueLabel() {
    var k = langKey();
    if (k === "ja") return "続きを読む →";
    if (k === "ko") return "계속 읽기 →";
    if (k === "zh") return "继续阅读 →";
    if (k === "vi") return "Đọc tiếp →";
    return "Continue reading →";
  }

  function newsEmptyFilterHtml() {
    var k = langKey();
    var msg =
      k === "vi"
        ? "Chưa có bài viết khớp bộ lọc này. Hãy thử danh mục khác hoặc "
        : "No articles match this filter yet. Try another category or ";
    var btn = k === "vi" ? "hiện tất cả" : "show all";
    return (
      '<p class="hl-news-empty" style="grid-column:1/-1;padding:36px 20px;text-align:center;font-size:15px;color:var(--gray-600);border:1px dashed var(--gray-200);border-radius:12px;">' +
      esc(msg) +
      '<button type="button" class="hl-news-reset-filter" style="background:none;border:none;color:var(--green);font-weight:700;cursor:pointer;text-decoration:underline;padding:0;font:inherit;">' +
      esc(btn) +
      "</button>.</p>"
    );
  }

  /** VC-backed posts open on-site detail at /news/article/?id= */
  function detailHrefForPost(post) {
    if ((useVcEnFeed() || useVcViFeed()) && post && post.id != null && String(post.id).match(/^\d+$/)) {
      var u = "/news/article/?id=" + encodeURIComponent(post.id);
      var k = langKey();
      if (k !== "en") u += "&lang=" + encodeURIComponent(k);
      return u;
    }
    return (post && post.link) || "#";
  }

  function renderCard(post, isFeatured) {
    var title = stripHtml(post && post.title && post.title.rendered);
    var excerpt = stripHtml(post && post.excerpt && post.excerpt.rendered);
    var date = fmtDate(post && (post.modified || post.date));
    var href = detailHrefForPost(post);
    var img = pickImage(post);
    var cat = pickCategoryName(post);

    var cls = "nc" + (isFeatured ? " feat" : "");
    var imgHtml = img
      ? '<img src="' + esc(img) + '" alt="' + esc(title) + '" loading="lazy" decoding="async">'
      : '<div style="background:var(--gray-50);min-height:' + (isFeatured ? "300px" : "180px") + ';"></div>';

    var metaHtml = date ? '<div class="nc-meta"><span>' + esc(date) + "</span></div>" : "";

    var catHtml = "";
    if (isFeatured) {
      catHtml = '<div class="nc-cat">⭐ ' + esc(cat || "News") + "</div>";
    } else if (cat) {
      catHtml = '<div class="nc-cat">' + esc(cat) + "</div>";
    }

    return (
      '<div class="' +
      cls +
      '">' +
      imgHtml +
      '<div class="nc-b">' +
      catHtml +
      '<div class="nc-ttl">' +
      esc(title) +
      "</div>" +
      (excerpt ? '<div class="nc-tx">' + esc(excerpt) + "</div>" : "") +
      metaHtml +
      '<a href="' +
      esc(href) +
      '" class="nc-lnk">' +
      esc(newsContinueLabel()) +
      "</a>" +
      "</div></div>"
    );
  }

  function newsFeedJsonBaseDir() {
    var el = document.querySelector('script[src*="hl-news-feed.js"]');
    if (!el || !el.src) el = document.querySelector('script[src*="vietnam-construction-feed.js"]');
    if (!el || !el.src) return "";
    return el.src.replace(/[^/]+$/, "");
  }

  function filterPostsByCategories(posts, categoryIds) {
    if (!categoryIds || !categoryIds.length) return posts || [];
    return (posts || []).filter(function (p) {
      var cats = p.categories;
      if (!Array.isArray(cats)) return false;
      for (var i = 0; i < categoryIds.length; i++) {
        if (cats.indexOf(categoryIds[i]) !== -1) return true;
      }
      return false;
    });
  }

  function sortPostsByDateDesc(posts) {
    return (posts || []).slice().sort(function (a, b) {
      var da = new Date((a && (a.date || a.modified)) || 0).getTime();
      var db = new Date((b && (b.date || b.modified)) || 0).getTime();
      return db - da;
    });
  }

  /** When VC is missing or fails: same JSON as hardcodeFromVietnamconstruction / hardcodeEventVi. */
  async function loadBundledEventNews(container) {
    var base = newsFeedJsonBaseDir();
    if (!base) throw new Error("news_json_base_missing");
    var isVi = useVcViFeed();
    var url = base + (isVi ? "data-event-vi.json" : "data-event-en.json");
    var catIds = isVi ? [66] : [6];
    var res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error("event_json_http");
    var arr = await res.json();
    if (!Array.isArray(arr)) throw new Error("event_json_shape");
    var posts = sortPostsByDateDesc(filterPostsByCategories(arr, catIds));
    if (!posts.length) throw new Error("event_json_empty");

    clearNewsPagination(container);
    enNewsState.allPosts = posts;
    enNewsState.filter = "all";
    renderFeedFromCache(container);
    bindLoadMoreOnce();
    bindFilterBarOnce();
  }

  function clearNewsPagination(container) {
    enNewsState.allPosts = [];
    enNewsState.filter = "all";
    if (!container) return;
    container.removeAttribute("data-hl-news-paginated");
    container.removeAttribute("data-hl-news-shown");
    container.removeAttribute("data-hl-news-total");
    container.removeAttribute("data-hl-news-vc-strategy");
    container.removeAttribute("data-hl-news-cached");
  }

  function syncLoadMoreButton(container) {
    var btn = document.getElementById("hl-news-load-more");
    if (!btn) return;
    if (!container || container.getAttribute("data-hl-news-paginated") !== "1") {
      btn.style.display = "none";
      return;
    }
    var shown = parseInt(container.getAttribute("data-hl-news-shown") || "0", 10);
    var total = parseInt(container.getAttribute("data-hl-news-total") || "0", 10);
    btn.style.display = shown < total ? "inline-block" : "none";
  }

  function bindLoadMoreOnce() {
    if (loadMoreClickBound) return;
    var btn = document.getElementById("hl-news-load-more");
    if (!btn) return;
    loadMoreClickBound = true;
    btn.addEventListener("click", function () {
      var c = document.getElementById("hl-news-feed");
      if (!c || c.getAttribute("data-hl-news-paginated") !== "1") return;
      btn.disabled = true;
      loadMoreEnVietnamNews(c)
        .catch(function () {})
        .then(function () {
          btn.disabled = false;
        });
    });
  }

  function renderFeedFromCache(container) {
    var filtered = getFilteredPosts();
    var first = filtered.slice(0, INITIAL_PAGE_SIZE);
    var html = "";
    if (!first.length) {
      html = newsEmptyFilterHtml();
      container.innerHTML = html;
      var resetBtn = container.querySelector(".hl-news-reset-filter");
      if (resetBtn) {
        resetBtn.addEventListener("click", function () {
          enNewsState.filter = "all";
          var bar = document.getElementById("hl-news-filter-bar");
          if (bar) {
            bar.querySelectorAll(".fb").forEach(function (b) {
              b.classList.toggle("on", b.getAttribute("data-hl-filter") === "all");
            });
          }
          renderFeedFromCache(container);
        });
      }
    } else {
      first.forEach(function (p, idx) {
        html += renderCard(p, idx === 0);
      });
      container.innerHTML = html;
    }
    container.setAttribute("data-hl-news-paginated", "1");
    container.setAttribute("data-hl-news-cached", "1");
    container.setAttribute("data-hl-news-shown", String(first.length));
    container.setAttribute("data-hl-news-total", String(filtered.length));
    syncLoadMoreButton(container);
    container.classList.remove("hl-feed-waiting");
  }

  function bindFilterBarOnce() {
    if (filterBarBound) return;
    var bar = document.getElementById("hl-news-filter-bar");
    if (!bar) return;
    filterBarBound = true;
    bar.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest && e.target.closest(".fb");
      if (!btn || !bar.contains(btn)) return;
      if (!enNewsState.allPosts.length) return;
      var key = btn.getAttribute("data-hl-filter");
      if (!key) return;
      bar.querySelectorAll(".fb").forEach(function (b) {
        b.classList.remove("on");
      });
      btn.classList.add("on");
      enNewsState.filter = key;
      var c = document.getElementById("hl-news-feed");
      if (c) renderFeedFromCache(c);
    });
  }

  async function loadEnFromVietnamConstructionInitial(container) {
    var VC = window.HL_VietnamConstruction;
    if (!VC) throw new Error("vn_vc_missing");
    var mode = (document.body && document.body.getAttribute("data-hl-vn-news-source")) || "";
    mode = String(mode).toLowerCase();
    var input = {
      offset: 0,
      perPage: 100,
      page: 1,
      categories: VC.defaultEnCategories,
      embed: true
    };
    var result;
    if (mode === "hardcode") {
      result = await VC.hardcodeFromVietnamconstruction(input);
    } else if (mode === "api") {
      try {
        result = await VC.fetchFromVietnamconstruction(input);
      } catch (ignore) {
        result = { posts: [] };
      }
      var apiPostsApi = result && result.posts;
      if (!Array.isArray(apiPostsApi) || !apiPostsApi.length) {
        result = await VC.hardcodeFromVietnamconstruction(input);
      }
    } else {
      try {
        result = await VC.fetchFromVietnamconstruction(input);
      } catch (ignore) {
        result = { posts: [] };
      }
      var apiPosts = result && result.posts;
      if (!Array.isArray(apiPosts) || !apiPosts.length) {
        result = await VC.hardcodeFromVietnamconstruction(input);
      }
    }
    var posts = result && result.posts;
    if (!Array.isArray(posts) || !posts.length) throw new Error("vn_empty");

    clearNewsPagination(container);
    enNewsState.allPosts = posts;
    enNewsState.filter = "all";

    renderFeedFromCache(container);
    bindLoadMoreOnce();
    bindFilterBarOnce();
  }

  async function loadViFromVietnamConstructionInitial(container) {
    var VC = window.HL_VietnamConstruction;
    if (!VC || typeof VC.hardcodeEventViFromVietnamconstruction !== "function") throw new Error("vn_vc_vi_missing");
    var mode = (document.body && document.body.getAttribute("data-hl-vn-news-source")) || "";
    mode = String(mode).toLowerCase();
    var input = {
      offset: 0,
      perPage: 100,
      page: 1,
      categories: VC.defaultViEventCategories,
      embed: true
    };
    var result;
    if (mode === "hardcode") {
      result = await VC.hardcodeEventViFromVietnamconstruction(input);
    } else if (mode === "api") {
      try {
        result = await VC.fetchFromVietnamconstruction(input);
      } catch (ignore) {
        result = { posts: [] };
      }
      var apiPostsViApi = result && result.posts;
      if (!Array.isArray(apiPostsViApi) || !apiPostsViApi.length) {
        result = await VC.hardcodeEventViFromVietnamconstruction(input);
      }
    } else {
      try {
        result = await VC.fetchFromVietnamconstruction(input);
      } catch (ignore) {
        result = { posts: [] };
      }
      var apiPostsVi = result && result.posts;
      if (!Array.isArray(apiPostsVi) || !apiPostsVi.length) {
        result = await VC.hardcodeEventViFromVietnamconstruction(input);
      }
    }
    var posts = result && result.posts;
    if (!Array.isArray(posts) || !posts.length) throw new Error("vn_empty");

    clearNewsPagination(container);
    enNewsState.allPosts = posts;
    enNewsState.filter = "all";

    renderFeedFromCache(container);
    bindLoadMoreOnce();
    bindFilterBarOnce();
  }

  async function loadMoreEnVietnamNews(container) {
    if (container.getAttribute("data-hl-news-cached") !== "1") return;
    var filtered = getFilteredPosts();
    var shown = parseInt(container.getAttribute("data-hl-news-shown") || "0", 10);
    if (shown >= filtered.length) {
      syncLoadMoreButton(container);
      return;
    }
    var next = filtered.slice(shown, shown + Math.min(LOAD_MORE_SIZE, filtered.length - shown));
    if (!next.length) {
      syncLoadMoreButton(container);
      return;
    }
    var append = "";
    next.forEach(function (p) {
      append += renderCard(p, false);
    });
    container.insertAdjacentHTML("beforeend", append);
    shown += next.length;
    container.setAttribute("data-hl-news-shown", String(shown));
    syncLoadMoreButton(container);
  }

  async function loadInto(container) {
    try {
      if (useVcViFeed() && window.HL_VietnamConstruction) {
        try {
          await loadViFromVietnamConstructionInitial(container);
          return;
        } catch (ignore) {
          clearNewsPagination(container);
        }
      }
      if (useVcEnFeed() && window.HL_VietnamConstruction) {
        try {
          await loadEnFromVietnamConstructionInitial(container);
          return;
        } catch (ignore) {
          clearNewsPagination(container);
        }
      }

      if (useVcEnFeed() || useVcViFeed()) {
        try {
          await loadBundledEventNews(container);
          return;
        } catch (ignore) {
          clearNewsPagination(container);
        }
      }

      clearNewsPagination(container);
      var url = postsUrlForLocale();
      var res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error("wp_fetch_failed");
      var posts = await res.json();
      if (!Array.isArray(posts) || !posts.length) throw new Error("wp_empty");

      var html = "";
      posts.forEach(function (p, idx) {
        html += renderCard(p, idx === 0);
      });
      container.innerHTML = html;
      container.classList.remove("hl-feed-waiting");
    } catch (ignore) {
      /* Show static .hl-news-fallback again if all sources fail. */
      var c = document.getElementById("hl-news-feed");
      if (c) c.classList.remove("hl-feed-waiting");
    } finally {
      syncLoadMoreButton(container);
    }
  }

  function boot() {
    var container = document.getElementById("hl-news-feed");
    if (!container) return;
    if (container.getAttribute("data-hl-news-bound") === "1") return;
    container.setAttribute("data-hl-news-bound", "1");
    container.classList.add("hl-feed-waiting");

    loadInto(container).catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
