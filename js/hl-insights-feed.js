/**
 * Market Insights: Market + Learn. Learn: WP REST first (VI categories=74&lang=vi, EN categories=33),
 * then data-learn-vi.json / data-learn-en.json. Same data-hl-vn-news-source as Market (api | hardcode | default).
 * /vi/insights/ + /vi/: đặt data-hl-vn-news-source="hardcode" và chạy tools/merge_json_from_uploads_dir.py để ảnh /images/uploads/.
 * Fallback: fetch data-market-*.json + data-learn-*.json from /js/ if HL_VietnamConstruction fails or returns empty.
 */
(function () {
  "use strict";

  var INITIAL_PAGE_SIZE = 7;
  var LOAD_MORE_SIZE = 9;
  var loadMoreClickBound = false;
  var filterBarBound = false;
  var insightsState = { allPosts: [], filter: "all", cmsMode: false, loadingFilter: false };

  /**
   * Single source for filter **tag-row** chips only (FDI, ESG, Learn, …).
   * Card `.ic-tag` badges use original WP names (Thị trường / Học hỏi / …) — different source by design.
   */
  var INSIGHTS_KIND_CHIPS = [
    {
      key: "all",
      labels: { en: "All", vi: "Tất cả", ja: "すべて", ko: "전체", zh: "全部" },
    },
    {
      key: "learn",
      labels: { en: "Learn", vi: "Học hỏi", ja: "学ぶ", ko: "학습", zh: "学习" },
    },
    {
      key: "industrial",
      category: "infra",
      labels: {
        en: "Industrial infrastructure",
        vi: "Hạ tầng công nghiệp",
        ja: "産業インフラ",
        ko: "산업 인프라",
        zh: "产业基础设施",
      },
    },
    {
      key: "fdi",
      category: "fdi",
      labels: { en: "FDI & Investment", vi: "FDI & Đầu tư", ja: "FDI・投資", ko: "FDI & 투자", zh: "FDI与投资" },
    },
    {
      key: "esg",
      category: "esg",
      labels: { en: "ESG & Energy", vi: "ESG & Năng lượng", ja: "ESG・エネルギー", ko: "ESG & 에너지", zh: "ESG与能源" },
    },
    {
      key: "supply",
      category: "supply",
      labels: { en: "Supply Chain", vi: "Chuỗi cung ứng", ja: "サプライチェーン", ko: "공급망", zh: "供应链" },
    },
    {
      key: "textile",
      category: "textile",
      labels: { en: "Textile", vi: "Dệt may", ja: "繊維", ko: "섬유", zh: "纺织" },
    },
    {
      key: "semi",
      category: "semiconductor",
      labels: {
        en: "Semiconductors & Electronics",
        vi: "Bán dẫn & Điện tử",
        ja: "半導体・電子",
        ko: "반도체 & 전자",
        zh: "半导体与电子",
      },
    },
  ];

  function insightsKindChipByKey(key) {
    var k = String(key || "").trim().toLowerCase();
    for (var i = 0; i < INSIGHTS_KIND_CHIPS.length; i++) {
      if (INSIGHTS_KIND_CHIPS[i].key === k) return INSIGHTS_KIND_CHIPS[i];
    }
    return null;
  }

  function insightsKindChipByCategory(category) {
    var c = String(category || "").trim().toLowerCase();
    if (!c) return null;
    if (c === "infra" || c === "industrial") return insightsKindChipByKey("industrial");
    if (c === "semiconductor" || c === "semi") return insightsKindChipByKey("semi");
    for (var i = 0; i < INSIGHTS_KIND_CHIPS.length; i++) {
      var chip = INSIGHTS_KIND_CHIPS[i];
      if (chip.category && chip.category === c) return chip;
    }
    return null;
  }

  function insightsKindLabel(keyOrCategory) {
    var chip =
      insightsKindChipByKey(keyOrCategory) || insightsKindChipByCategory(keyOrCategory);
    if (!chip) return "";
    var k = langKey();
    return chip.labels[k] || chip.labels.en || "";
  }

  /** Sync tag-row button text from INSIGHTS_KIND_CHIPS (same strings as card badges). */
  function syncInsightsTagRowLabels() {
    var bar = document.getElementById("hl-insights-tag-row");
    if (!bar) return;
    bar.querySelectorAll(".tag[data-hl-filter]").forEach(function (btn) {
      var key = btn.getAttribute("data-hl-filter");
      var label = insightsKindLabel(key);
      if (label) btn.textContent = label;
    });
  }

  function langKey() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("vi") === 0) return "vi";
    if (raw.indexOf("ja") === 0) return "ja";
    if (raw.indexOf("ko") === 0) return "ko";
    if (raw.indexOf("zh") === 0) return "zh";
    return "en";
  }

  /** Market feed (EN WP JSON) on EN / JA / KO / ZH insights - same reports, localized chrome. */
  function useVcEnMarketFeed() {
    var k = langKey();
    return k === "en" || k === "ja" || k === "ko" || k === "zh";
  }

  /** VI insights: Vietnam Construction Thị trường (3813) from data-market-vi.json / API. */
  function useVcViMarketFeed() {
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

  function pickCategorySlug(post) {
    try {
      var terms = post && post._embedded && post._embedded["wp:term"];
      if (!terms || !terms.length) return "";
      var cats = terms[0];
      if (!Array.isArray(cats) || !cats.length) return "";
      return String((cats[0] && cats[0].slug) || "")
        .trim()
        .toLowerCase();
    } catch (ignore) {}
    return "";
  }

  /**
   * Card badge = original WP category (Thị trường / Học hỏi / Công nghiệp / …).
   * Filter tag-row chips stay separate (FDI, ESG, …) — do not overwrite badge with those.
   */
  function cardInsightsBadgeLabel(post) {
    if (post && post.hlInsightsCms) {
      var fromTags = wpBadgeLabelFromCmsTags(post.hlInsightsTags, langKey());
      if (fromTags) return fromTags;
      if (post.hlInsightsLearn === true) return learnCategoryLabel();
      return marketFeedBadgeLabel();
    }
    var original = pickCategoryName(post);
    if (original) return original;
    if (isLearnInsightsPost(post)) return learnCategoryLabel();
    return marketFeedBadgeLabel();
  }

  function marketFeedBadgeLabel() {
    var k = langKey();
    return (
      { en: "Market", vi: "Thị trường", ja: "マーケット", ko: "시장", zh: "市场" }[k] || "Market"
    );
  }

  function wpBadgeLabelFromCmsTags(tags, lang) {
    if (!Array.isArray(tags) || !tags.length) return "";
    var primary = lang === "vi" ? "wp-badge-vi:" : "wp-badge-en:";
    var fallback = lang === "vi" ? "wp-badge-en:" : "wp-badge-vi:";
    var legacy = "wp-badge:";
    var found = "";
    for (var i = 0; i < tags.length; i++) {
      var t = String(tags[i] || "");
      if (t.indexOf(primary) === 0) return t.slice(primary.length).trim();
      if (!found && t.indexOf(fallback) === 0) found = t.slice(fallback.length).trim();
      if (!found && t.indexOf(legacy) === 0) found = t.slice(legacy.length).trim();
    }
    return found;
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

  /** Learn (Học hỏi) trong Insights - category 33 (EN) / 74 (VI), hoặc slug learn / hoc-hoi. */
  function isLearnInsightsPost(post) {
    try {
      var ids = post && post.categories;
      if (Array.isArray(ids)) {
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i];
          if (id === 74 || id === 33) return true;
        }
      }
    } catch (ignore) {}
    try {
      var terms = post && post._embedded && post._embedded["wp:term"];
      var cats = terms && terms[0];
      if (!Array.isArray(cats)) return false;
      for (var j = 0; j < cats.length; j++) {
        var sl = String((cats[j] && cats[j].slug) || "").toLowerCase();
        if (sl === "learn" || sl === "hoc-hoi") return true;
      }
    } catch (ignore2) {}
    return false;
  }

  /** Dedupe by post id, sort newest first (same idea as vietnam-construction-feed mergePostsByDateDesc). */
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

  function insightsJsonBaseDir() {
    var el = document.querySelector('script[src*="hl-insights-feed.js"]');
    if (!el || !el.src) el = document.querySelector('script[src*="vietnam-construction-feed.js"]');
    if (!el || !el.src) return "";
    return el.src.replace(/[^/]+$/, "");
  }

  function filterInsightsPostsByCategories(posts, categoryIds) {
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

  /** Same merge as loadMarketInitial when VC script fails or returns empty. */
  async function loadBundledInsightsMerge(container) {
    var base = insightsJsonBaseDir();
    if (!base) throw new Error("insights_json_base_missing");
    var isVi = useVcViMarketFeed();
    var marketFile = isVi ? "data-market-vi.json" : "data-market-en.json";
    var learnFile = isVi ? "data-learn-vi.json" : "data-learn-en.json";
    var catM = isVi ? [3813] : [3879];
    var catL = isVi ? [74] : [33];
    var rm = await fetch(base + marketFile, { credentials: "omit" });
    var rl = await fetch(base + learnFile, { credentials: "omit" });
    if (!rm.ok || !rl.ok) throw new Error("insights_json_http");
    var marketArr = await rm.json();
    var learnArr = await rl.json();
    if (!Array.isArray(marketArr) || !Array.isArray(learnArr)) throw new Error("insights_json_shape");
    var posts = mergePostsByDateDescTwo([
      filterInsightsPostsByCategories(marketArr, catM),
      filterInsightsPostsByCategories(learnArr, catL)
    ]);
    if (!posts.length) throw new Error("insights_json_empty");
    clearInsightsPagination(container);
    insightsState.allPosts = posts;
    insightsState.filter = "all";
    renderFeedFromCache(container);
    bindLoadMoreOnce();
    bindFilterBarOnce();
  }

  function insightsLoadFailedHtml() {
    var k = langKey();
    if (k === "ja") return "レポートを読み込めませんでした。ページを再読み込みするか、しばらくしてからお試しください。";
    if (k === "ko") return "보고서를 불러오지 못했습니다. 페이지를 새로 고침하거나 잠시 후 다시 시도하세요.";
    if (k === "zh") return "无法加载报告。请刷新页面或稍后再试。";
    if (k === "vi") return "Không tải được báo cáo. Hãy tải lại trang hoặc thử lại sau.";
    return "Could not load reports. Try refreshing the page or again in a moment.";
  }

  /**
   * Learn posts for Insights: try WP JSON API, then local JSON (Polylang: lang=vi for category 74).
   * Mirrors Market strategy for data-hl-vn-news-source.
   */
  async function fetchInsightsLearnPosts(VC, mode, isVi) {
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

    if (mode === "hardcode") {
      return fromHardcode();
    }
    if (mode === "api") {
      var a = await fromApi();
      if (a.length) return a;
      return fromHardcode();
    }
    var a2 = await fromApi();
    if (a2.length) return a2;
    return fromHardcode();
  }

  function readMoreLabel() {
    var k = langKey();
    if (k === "ja") return "続きを読む →";
    if (k === "ko") return "계속 읽기 →";
    if (k === "zh") return "继续阅读 →";
    if (k === "vi") return "Đọc tiếp →";
    return "Continue reading →";
  }

  /**
   * Filter keys: all | learn | industrial | fdi | esg | supply | textile | semi
   * CMS articles: exact contentKind / category (same as app + API).
   * Legacy WP/JSON fallback: keyword heuristics.
   */
  function postMatchesFilter(post, key) {
    if (!key || key === "all") return true;

    if (post && post.hlInsightsCms) {
      var isLearnCms = post.hlInsightsLearn === true;
      if (key === "learn") return isLearnCms;
      if (isLearnCms) return false;
      var cat = String(post.hlInsightsCategory || "")
        .trim()
        .toLowerCase();
      if (key === "industrial") return cat === "infra";
      if (key === "fdi") return cat === "fdi";
      if (key === "esg") return cat === "esg";
      if (key === "supply") return cat === "supply";
      if (key === "textile") return cat === "textile";
      if (key === "semi") return cat === "semiconductor";
      return true;
    }

    var isLearn =
      (!post.hlInsightsCms && isLearnInsightsPost(post));
    if (key === "learn") return isLearn;
    if (isLearn) return false;
    var blob =
      stripHtml((post.title && post.title.rendered) || "").toLowerCase() +
      " " +
      stripHtml((post.excerpt && post.excerpt.rendered) || "").toLowerCase();
    var cats = allTermNames(post, 0);
    var tags = allTermNames(post, 1);
    var all = blob + " " + cats.join(" ") + " " + tags.join(" ");

    if (key === "fdi") {
      if (
        /\b(fdi|foreign direct|investor|\binvest\b|investment|billion|\busd\b|capital inflow|rcep|trade|ministerial|economic|business outlook|opportunit|vietnam business)/.test(
          all
        )
      )
        return true;
      if (/(đầu tư|dau tu|fdi|vốn|von|nhà đầu tư|nha dau tu|rcep)/.test(all)) return true;
      if (cats.indexOf("invest") !== -1 || cats.indexOf("investor") !== -1) return true;
      return false;
    }
    if (key === "industrial") {
      if (cats.indexOf("industrial") !== -1 || cats.indexOf("project") !== -1 || cats.indexOf("architect") !== -1)
        return true;
      if (
        /(industrial|factory|warehouse|real estate|industrial parks|\bip\b|kcn|occupancy|rental|steel|building material|urban area|manufacturing base)/.test(
          all
        )
      )
        return true;
      if (/(Khu công nghiệp|khu công nghiệp|khu cong nghiep|hạ tầng khu công nghiệp|ha tang khu cong nghiep|nhà xưởng|nha xuong|thuê|thue)/.test(all))
        return true;
      return false;
    }
    if (key === "esg") {
      if (/(esg|green building|renewable|solar|carbon|cbam|climate|sustainable|energy transition|power purchase|dppa)/.test(all))
        return true;
      if (/(bền vững|ben vung|năng lượng|nang luong|khí hậu|khi hau|carbon)/.test(all)) return true;
      return false;
    }
    if (key === "supply") {
      if (/(supply chain|logistics|belt and road|procurement|vendor|distribution|import export)/.test(all)) return true;
      if (/(chuỗi cung ứng|chuyen cung ung|logistics|cung ứng|cung ung)/.test(all)) return true;
      if (cats.indexOf("tech") !== -1 && /supply|logistics|chain/.test(all)) return true;
      return false;
    }
    if (key === "textile") {
      if (/(textile|garment|fabric|yarn|cotton|apparel|clothing|fiber|denim|footwear|t\s*&\s*g)/.test(all)) return true;
      return false;
    }
    if (key === "semi") {
      if (
        /(semiconductor|chip|wafer|packaging|foundry|electronics|pcb|smt|amkor|intel|samsung|hynix|\bic\b|microchip)/.test(
          all
        )
      )
        return true;
      return false;
    }
    return true;
  }

  function learnCategoryLabel() {
    return insightsKindLabel("learn");
  }

  function marketCategoryLabel(code) {
    var chip = insightsKindChipByCategory(code);
    if (chip) return insightsKindLabel(chip.key);
    var c = String(code || "").trim().toLowerCase();
    if (!c) {
      var k = langKey();
      return (
        { en: "Market", vi: "Thị trường", ja: "マーケット", ko: "시장", zh: "市场" }[k] || "Market"
      );
    }
    return c.replace(/_/g, " ");
  }

  function getFilteredPosts() {
    if (!insightsState.allPosts || !insightsState.allPosts.length) return [];
    // CMS list is already filtered server-side (contentKind / category).
    if (insightsState.cmsMode) return insightsState.allPosts;
    return insightsState.allPosts.filter(function (p) {
      return postMatchesFilter(p, insightsState.filter);
    });
  }

  function resolveInsightsApiBase() {
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

  function insightsLocaleForApi() {
    var k = langKey();
    if (k === "vi") return "vi";
    return "en";
  }

  function cmsInsightsDetailHref(slug) {
    var u = "/insights/cms/?slug=" + encodeURIComponent(slug);
    var k = langKey();
    if (k !== "en") u += "&lang=" + encodeURIComponent(k);
    return u;
  }

  function cmsInsightsArticleToPost(article) {
    if (!article || !article.slug) return null;
    var cover = article.coverImageUrl ? String(article.coverImageUrl) : "";
    var isLearn = article.contentKind === "learn";
    var tags = Array.isArray(article.tags) ? article.tags : [];
    var catLabel = cardInsightsBadgeLabel({
      hlInsightsCms: true,
      hlInsightsLearn: isLearn,
      hlInsightsTags: tags,
    });
    var catSlug = isLearn ? "learn" : "market";
    return {
      id: "insights-" + String(article.id || article.slug),
      date: article.publishedAt || "",
      modified: article.publishedAt || "",
      link: cmsInsightsDetailHref(article.slug),
      title: { rendered: String(article.title || "") },
      excerpt: { rendered: String(article.excerpt || "") },
      hlInsightsCms: true,
      hlInsightsLearn: isLearn,
      hlInsightsCategory: article.category || "",
      hlInsightsTags: tags,
      hlInsightsSlug: String(article.slug),
      _embedded: {
        "wp:featuredmedia": cover ? [{ source_url: cover }] : [],
        // Preserve original WP badge label (Thị trường / Học hỏi / …), not filter-chip names.
        "wp:term": [[{ id: 0, name: catLabel, slug: catSlug, taxonomy: "category" }]],
      },
    };
  }

  async function fetchInsightsCmsArticles(filterKey) {
    var apiBase = resolveInsightsApiBase();
    var locale = insightsLocaleForApi();
    var url =
      apiBase +
      "/api/report-articles/insights?locale=" +
      encodeURIComponent(locale);
    var key = filterKey && filterKey !== "all" ? String(filterKey) : "";
    if (key) url += "&insightsFilter=" + encodeURIComponent(key);
    var res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
    });
    if (!res.ok) throw new Error("insights_cms_http");
    var body = await res.json();
    if (!body || body.success !== true) throw new Error("insights_cms_shape");
    var articles = (body.data && body.data.articles) || [];
    if (!Array.isArray(articles)) return [];
    return articles.map(cmsInsightsArticleToPost).filter(Boolean);
  }

  async function applyCmsFilter(container, filterKey) {
    insightsState.loadingFilter = true;
    insightsState.filter = filterKey || "all";
    container.innerHTML =
      '<p style="grid-column:1/-1;padding:36px 20px;text-align:center;font-size:15px;color:var(--gray-600);">…</p>';
    try {
      var posts = await fetchInsightsCmsArticles(filterKey);
      clearInsightsPagination(container);
      insightsState.allPosts = posts;
      renderFeedFromCache(container);
      bindLoadMoreOnce();
    } catch (ignore) {
      container.innerHTML =
        '<p class="hl-insights-load-fail" style="grid-column:1/-1;padding:36px 20px;text-align:center;font-size:15px;color:var(--gray-600);">' +
        esc(insightsLoadFailedHtml()) +
        "</p>";
    } finally {
      insightsState.loadingFilter = false;
    }
  }

  async function loadInsightsCmsPrimary(container) {
    try {
      var posts = await fetchInsightsCmsArticles("all");
      if (!posts.length) throw new Error("insights_cms_empty");
      insightsState.cmsMode = true;
      if (container) container.setAttribute("data-hl-insights-cms", "1");
      clearInsightsPagination(container);
      insightsState.allPosts = posts;
      insightsState.filter = "all";
      renderFeedFromCache(container);
      bindLoadMoreOnce();
      bindFilterBarOnce();
      return true;
    } catch (ignore) {
      insightsState.cmsMode = false;
      if (container) container.removeAttribute("data-hl-insights-cms");
      return false;
    }
  }

  function detailHrefForPost(post) {
    if (post && post.hlInsightsCms && post.hlInsightsSlug) {
      return cmsInsightsDetailHref(post.hlInsightsSlug);
    }
    if ((useVcEnMarketFeed() || useVcViMarketFeed()) && post && post.id != null && String(post.id).match(/^\d+$/)) {
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
    var cat = cardInsightsBadgeLabel(post);
    var linkLbl = readMoreLabel();

    var cls = "ic" + (isFeatured ? " hero" : "");
    var imgHtml = img
      ? '<img src="' + esc(img) + '" alt="' + esc(title) + '" loading="lazy" decoding="async">'
      : '<div style="background:var(--gray-50);min-height:' + (isFeatured ? "280px" : "196px") + ';"></div>';

    var tagLine = isFeatured ? "⭐ " + (cat || "Report") : cat || "Report";
    var tagHtml = '<div class="ic-tag">' + esc(tagLine) + "</div>";

    var metaHtml = date ? '<div class="ic-meta"><span>' + esc(date) + "</span></div>" : "";

    return (
      '<div class="' +
      cls +
      '">' +
      imgHtml +
      '<div class="ic-b">' +
      tagHtml +
      '<div class="ic-ttl">' +
      esc(title) +
      "</div>" +
      (excerpt ? '<div class="ic-tx">' + esc(excerpt) + "</div>" : "") +
      metaHtml +
      '<a href="' +
      esc(href) +
      '" class="ic-lnk">' +
      esc(linkLbl) +
      "</a>" +
      "</div></div>"
    );
  }

  function clearInsightsPagination(container) {
    insightsState.allPosts = [];
    insightsState.filter = "all";
    if (!container) return;
    container.removeAttribute("data-hl-insights-paginated");
    container.removeAttribute("data-hl-insights-shown");
    container.removeAttribute("data-hl-insights-total");
    container.removeAttribute("data-hl-insights-cached");
  }

  function syncLoadMoreButton(container) {
    var btn = document.getElementById("hl-insights-load-more");
    if (!btn) return;
    if (!container || container.getAttribute("data-hl-insights-paginated") !== "1") {
      btn.style.display = "none";
      return;
    }
    var shown = parseInt(container.getAttribute("data-hl-insights-shown") || "0", 10);
    var total = parseInt(container.getAttribute("data-hl-insights-total") || "0", 10);
    btn.style.display = shown < total ? "inline-block" : "none";
  }

  function emptyFilterMessage() {
    var k = langKey();
    if (k === "ja") return "この条件に一致するレポートはまだありません。別のタグを選ぶか、";
    if (k === "ko") return "이 필터와 일치하는 보고서가 없습니다. 다른 태그를 선택하거나 ";
    if (k === "zh") return "没有符合此筛选条件的报告。请尝试其他标签或";
    if (k === "vi") return "Chưa có báo cáo khớp bộ lọc này. Hãy thử thẻ khác hoặc ";
    return "No reports match this filter yet. Try another tag or ";
  }

  function showAllLabel() {
    var k = langKey();
    if (k === "ja") return "すべて表示";
    if (k === "ko") return "전체 보기";
    if (k === "zh") return "显示全部";
    if (k === "vi") return "hiện tất cả";
    return "show all";
  }

  function bindLoadMoreOnce() {
    if (loadMoreClickBound) return;
    var btn = document.getElementById("hl-insights-load-more");
    if (!btn) return;
    loadMoreClickBound = true;
    btn.addEventListener("click", function () {
      var c = document.getElementById("hl-insights-feed");
      if (!c || c.getAttribute("data-hl-insights-paginated") !== "1") return;
      btn.disabled = true;
      loadMoreInsights(c)
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
      html =
        '<p class="hl-insights-empty" style="grid-column:1/-1;padding:36px 20px;text-align:center;font-size:15px;color:var(--gray-600);border:1px dashed var(--gray-200);border-radius:12px;">' +
        esc(emptyFilterMessage()) +
        '<button type="button" class="hl-insights-reset-filter" style="background:none;border:none;color:var(--green);font-weight:700;cursor:pointer;text-decoration:underline;padding:0;font:inherit;">' +
        esc(showAllLabel()) +
        "</button>.</p>";
      container.innerHTML = html;
      var resetBtn = container.querySelector(".hl-insights-reset-filter");
      if (resetBtn) {
        resetBtn.addEventListener("click", function () {
          var bar = document.getElementById("hl-insights-tag-row");
          if (bar) {
            bar.querySelectorAll(".tag").forEach(function (b) {
              b.classList.toggle("on", b.getAttribute("data-hl-filter") === "all");
            });
          }
          if (insightsState.cmsMode) {
            void applyCmsFilter(container, "all");
          } else {
            insightsState.filter = "all";
            renderFeedFromCache(container);
          }
        });
      }
    } else {
      first.forEach(function (p, idx) {
        html += renderCard(p, idx === 0);
      });
      container.innerHTML = html;
    }
    container.setAttribute("data-hl-insights-paginated", "1");
    container.setAttribute("data-hl-insights-cached", "1");
    container.setAttribute("data-hl-insights-shown", String(first.length));
    container.setAttribute("data-hl-insights-total", String(filtered.length));
    syncLoadMoreButton(container);
  }

  function bindFilterBarOnce() {
    if (filterBarBound) return;
    var bar = document.getElementById("hl-insights-tag-row");
    if (!bar) return;
    filterBarBound = true;
    syncInsightsTagRowLabels();
    bar.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest && e.target.closest(".tag");
      if (!btn || !bar.contains(btn)) return;
      if (insightsState.loadingFilter) return;
      var key = btn.getAttribute("data-hl-filter");
      if (!key) return;
      bar.querySelectorAll(".tag").forEach(function (b) {
        b.classList.remove("on");
      });
      btn.classList.add("on");
      var c = document.getElementById("hl-insights-feed");
      if (!c) return;
      if (insightsState.cmsMode) {
        void applyCmsFilter(c, key);
        return;
      }
      if (!insightsState.allPosts.length) return;
      insightsState.filter = key;
      renderFeedFromCache(c);
    });
  }

  async function loadMarketInitial(container) {
    var VC = window.HL_VietnamConstruction;
    if (!VC) throw new Error("vn_vc_missing");
    var isVi = useVcViMarketFeed();
    if (isVi && typeof VC.hardcodeMarketViFromVietnamconstruction !== "function") throw new Error("vn_vc_vi_market_missing");
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
      try {
        result = await VC.fetchFromVietnamconstruction(input);
      } catch (ignore) {
        result = { posts: [] };
      }
      var apiPostsM = result && result.posts;
      if (!Array.isArray(apiPostsM) || !apiPostsM.length) {
        result = isVi
          ? await VC.hardcodeMarketViFromVietnamconstruction(input)
          : await VC.hardcodeMarketFromVietnamconstruction(input);
      }
    } else {
      try {
        result = await VC.fetchFromVietnamconstruction(input);
      } catch (ignore) {
        result = { posts: [] };
      }
      var apiPostsM = result && result.posts;
      if (!Array.isArray(apiPostsM) || !apiPostsM.length) {
        result = isVi
          ? await VC.hardcodeMarketViFromVietnamconstruction(input)
          : await VC.hardcodeMarketFromVietnamconstruction(input);
      }
    }
    var posts = result && result.posts;
    if (!Array.isArray(posts)) posts = [];

    var learnPosts = [];
    try {
      learnPosts = await fetchInsightsLearnPosts(VC, mode, isVi);
    } catch (ignore) {}
    posts = mergePostsByDateDescTwo([posts, learnPosts]);

    if (!Array.isArray(posts) || !posts.length) throw new Error("vn_empty");

    clearInsightsPagination(container);
    insightsState.allPosts = posts;
    insightsState.filter = "all";

    renderFeedFromCache(container);
    bindLoadMoreOnce();
    bindFilterBarOnce();
  }

  async function loadMoreInsights(container) {
    if (container.getAttribute("data-hl-insights-cached") !== "1") return;
    var filtered = getFilteredPosts();
    var shown = parseInt(container.getAttribute("data-hl-insights-shown") || "0", 10);
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
    container.setAttribute("data-hl-insights-shown", String(shown));
    syncLoadMoreButton(container);
  }

  async function loadInto(container) {
    try {
      if (await loadInsightsCmsPrimary(container)) return;
    } catch (ignoreCms) {}
    try {
      if ((useVcEnMarketFeed() || useVcViMarketFeed()) && window.HL_VietnamConstruction) {
        try {
          await loadMarketInitial(container);
          return;
        } catch (ignore) {
          clearInsightsPagination(container);
        }
      }
    } catch (ignore) {}
    try {
      if (useVcEnMarketFeed() || useVcViMarketFeed()) {
        await loadBundledInsightsMerge(container);
        return;
      }
    } catch (ignore2) {}
    if (useVcEnMarketFeed() || useVcViMarketFeed()) {
      container.innerHTML =
        '<p class="hl-insights-load-fail" style="grid-column:1/-1;padding:36px 20px;text-align:center;font-size:15px;color:var(--gray-600);border:1px dashed var(--gray-200);border-radius:12px;">' +
        esc(insightsLoadFailedHtml()) +
        "</p>";
    }
    syncLoadMoreButton(container);
  }

  function boot() {
    var container = document.getElementById("hl-insights-feed");
    if (!container) return;
    if (container.getAttribute("data-hl-insights-bound") === "1") return;
    container.setAttribute("data-hl-insights-bound", "1");

    loadInto(container).catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
