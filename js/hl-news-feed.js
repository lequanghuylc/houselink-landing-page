/**
 * Landing news list: CMS-only (`GET /api/news-articles`).
 * Filters, cached pagination, detail links to `/news/cms/?slug=`.
 * Hardcoded / Vietnam Construction / bundled JSON feeds are no longer used on news pages.
 */
(function () {
  "use strict";

  var INITIAL_PAGE_SIZE = 7;
  var LOAD_MORE_SIZE = 9;
  var loadMoreClickBound = false;
  var filterBarBound = false;
  /** Full CMS list + active filter (client-side only). */
  var enNewsState = { allPosts: [], filter: "all" };

  function langKey() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("vi") === 0) return "vi";
    if (raw.indexOf("ja") === 0) return "ja";
    if (raw.indexOf("ko") === 0) return "ko";
    if (raw.indexOf("zh") === 0) return "zh";
    return "en";
  }

  /** EN + JA / KO / ZH news shells reuse EN CMS locale (same as prior VC EN feed). */
  function useVcEnFeed() {
    var k = langKey();
    return k === "en" || k === "ja" || k === "ko" || k === "zh";
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

  /** Wait for hl-auth-env so Netlify uses 2026-api (not localhost:3001). */
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

  function stripHtml(html) {
    if (!html) return "";
    var tmp = document.createElement("div");
    tmp.innerHTML = String(html);
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  var CMS_TYPE_LABELS = {
    houselink: { en: "HOUSELINK", vi: "HOUSELINK", ja: "HOUSELINK", ko: "HOUSELINK", zh: "HOUSELINK" },
    fdi: { en: "FDI", vi: "FDI", ja: "FDI", ko: "FDI", zh: "FDI" },
    industrial: { en: "Industrial", vi: "Công nghiệp", ja: "工業", ko: "산업", zh: "工业" },
    esg: { en: "ESG", vi: "ESG", ja: "ESG", ko: "ESG", zh: "ESG" },
    supply: { en: "Supply chain", vi: "Chuỗi cung ứng", ja: "サプライチェーン", ko: "공급망", zh: "供应链" }
  };

  function cmsTypeLabel(type) {
    var map = CMS_TYPE_LABELS[type];
    if (map) return map[langKey()] || map.en || type || "News";
    return type || "News";
  }

  function cmsDetailHref(slug) {
    var u = "/news/cms/?slug=" + encodeURIComponent(slug);
    var k = langKey();
    if (k !== "en") u += "&lang=" + encodeURIComponent(k);
    return u;
  }

  /** Map HouseLink CMS article → WP-shaped post for existing card renderer. */
  function cmsArticleToPost(article) {
    if (!article || !article.slug) return null;
    var cover = article.coverImageUrl ? String(article.coverImageUrl) : "";
    var typeKey = String(article.type || "houselink");
    var categoryKey = String(article.category || "");
    var labels = Array.isArray(article.categoryLabels)
      ? article.categoryLabels.map(String).filter(Boolean)
      : [];
    var catLabel =
      (labels.length ? labels.join(" · ") : "") ||
      String(article.categoryLabel || "").trim() ||
      categoryKey.replace(/-/g, " ") ||
      cmsTypeLabel(typeKey);
    return {
      id: "cms-" + String(article.id || article.slug),
      date: article.publishedAt || article.createdAt || "",
      modified: article.publishedAt || article.updatedAt || article.createdAt || "",
      link: cmsDetailHref(article.slug),
      title: { rendered: String(article.title || "") },
      excerpt: { rendered: String(article.excerpt || "") },
      hlCms: true,
      hlCmsType: typeKey,
      hlCmsFeatured: !!article.featured,
      hlCmsSlug: String(article.slug),
      _embedded: {
        "wp:featuredmedia": cover ? [{ source_url: cover }] : [],
        "wp:term": [[{ name: catLabel }]]
      }
    };
  }

  async function fetchCmsArticles() {
    var apiBase = resolveNewsApiBase();
    // JA/KO/ZH news shells reuse EN content (same as VC EN event feed).
    var locale = useVcEnFeed() ? "en" : "vi";
    var url = apiBase + "/api/news-articles?locale=" + encodeURIComponent(locale);
    var res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit"
    });
    if (!res.ok) throw new Error("cms_http");
    var body = await res.json();
    if (!body || body.success !== true) throw new Error("cms_shape");
    var articles = (body.data && body.data.articles) || [];
    if (!Array.isArray(articles)) return [];
    return articles
      .map(cmsArticleToPost)
      .filter(Boolean);
  }

  /** CMS feed — featured first, then publishedAt desc (matches admin + live news order). */
  async function loadCmsPrimary(container) {
    try {
      var cmsPosts = await fetchCmsArticles();
      clearNewsPagination(container);
      enNewsState.allPosts = sortPostsFeaturedThenDate(cmsPosts);
      enNewsState.filter = "all";
      renderFeedFromCache(container);
      bindLoadMoreOnce();
      bindFilterBarOnce();
      return true;
    } catch (ignore) {
      return false;
    }
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
    if (post && post.hlCms) {
      return String(post.hlCmsType || post.hlCmsCategory || "") === String(key);
    }
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
    var filtered = enNewsState.allPosts.filter(function (p) {
      return postMatchesFilter(p, enNewsState.filter);
    });
    return sortPostsFeaturedThenDate(filtered);
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

  /** CMS articles open at `/news/cms/?slug=`. */
  function detailHrefForPost(post) {
    if (post && post.hlCms && post.hlCmsSlug) {
      return cmsDetailHref(post.hlCmsSlug);
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

  /** Featured CMS articles first, then by date. */
  function sortPostsFeaturedThenDate(posts) {
    return (posts || []).slice().sort(function (a, b) {
      var fa = a && a.hlCmsFeatured ? 1 : 0;
      var fb = b && b.hlCmsFeatured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      var da = new Date((a && (a.date || a.modified)) || 0).getTime();
      var db = new Date((b && (b.date || b.modified)) || 0).getTime();
      return db - da;
    });
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
      await ensureAuthEnv();
      if (await loadCmsPrimary(container)) return;
      clearNewsPagination(container);
      enNewsState.allPosts = [];
      enNewsState.filter = "all";
      renderFeedFromCache(container);
      bindLoadMoreOnce();
      bindFilterBarOnce();
    } catch (ignore) {
      clearNewsPagination(container);
      enNewsState.allPosts = [];
      enNewsState.filter = "all";
      container.classList.remove("hl-feed-waiting");
      container.innerHTML =
        '<p class="hl-news-empty" style="grid-column:1/-1;padding:36px 20px;text-align:center;font-size:15px;color:var(--gray-600);">' +
        esc(langKey() === "vi" ? "Không tải được tin tức." : "Could not load news.") +
        "</p>";
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
