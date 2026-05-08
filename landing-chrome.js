/**
 * Shared header/footer from partials/*. Requires HTTP(S) (fetch same-origin).
 * URL map: English at site root (`/`, `/about/`, …); `/vi/…`, `/ja/…`, `/ko/`, `/zh/` for other locales.
 * JA/KO locale roots use `ja/index.html` / `ko/index.html` generated from the 404 template (see `tools/sync_root_404.py`) so static servers do not directory-list `/ja/` or `/ko/`.
 * Placeholder deep links may 404; Netlify uses `_redirects` for locale `/vi/404.html` bodies. Hosts that only
 * serve root `404.html` for every miss run a small redirect in that file (see `tools/sync_root_404.py`).
 * Legacy `/en/` may redirect to `/`. Vietnamese-only deep pages (e.g. some services) stay under `/vi/…`.
 *
 * Header login (“Login / Đăng nhập”):
 * - Anchors use `data-hl-dashboard-login` + `data-hl-login-locale`; href is set after inject.
 * - Default: static mockups `/login/` (EN), `/vi/login/`, `/ja/login/`, … (same origin as this site).
 * - Optional Next app: `<meta name="hl-dashboard-base" content="https://app.example.com">` (no trailing slash)
 *   or `window.HL_DASHBOARD_BASE = "https://app.example.com";` → links become `{base}/{locale}/login`.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || !script.src) {
    script = document.querySelector('script[src*="landing-chrome.js"]');
  }
  if (!script || !script.src) return;
  var base = script.src.replace(/\/[^/]+$/, "/");

  /**
   * Auto-assign scroll reveal to every direct `body > section` (except #hero, #logos, and sections
   * with `data-hl-reveal` / `data-hl-reveal-off`). Targets: CARD_SEL (home + all vi/* inner pages), else `.si > *`.
   * Opt out: `data-hl-reveal-off="1"` on the section.
   */
  function armHlRevealDefaults() {
    var CARD_SEL =
      ".svc-card, .case-card, .comm-card, .insight-card, .tier-card, .method-card, " +
      ".chal-pill, .db-card, .flow-step, .proc-step, .b-row, " +
      ".lg-box, .pc, .ti, " +
      ".cta-inner, .pg-inner, .dbv-stat, .dbv-center, " +
      ".db-left, .db-right, .db-visual-grid, " +
      ".hero-card-tl, .hero-card-br, " +
      ".benefit-box, .flex-sb, .customer-logo-cell, " +
      ".sec-label, h2.sec-title, h3.sec-title, p.sec-sub, " +
      ".insight-body, .case-body, .comm-body, .pg-h1, .pg-sub, .pg-eye, " +
      /* vi/* inner pages + service detail + legal */
      ".page-eyebrow, .page-h1, .page-sub, " +
      ".s4, .cs, .nc, .ic, " +
      ".svc-card-sm, .std-card, .std, .pv-item, " +
      ".hero-badge, .hero-h1, .hero-sub, .hero-tags, .hero-cta-row, .hero-ctas, .hero-stat-card, .hsc, " +
      ".val-card, .ms-item, .about-split, .about-img, .about-text, " +
      ".ct-item-hero, .ci-card, .contact-form, " +
      ".tc, .job-card, .perk-item, " +
      ".esg-col, .stmt, .dp, " +
      ".legal-section, .highlight-box, " +
      ".pillar, " +
      ".ctr-card, .two-col, .img-block";
    var sections = document.querySelectorAll("body > section");
    sections.forEach(function (sec) {
      if (sec.id === "hero") return;
      if (sec.id === "logos") return;
      if (sec.getAttribute("data-hl-reveal-off") === "1") return;
      if (sec.hasAttribute("data-hl-reveal")) return;

      var seen = new Set();
      var list = [];

      function push(el) {
        if (!el || el.nodeType !== 1) return;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
        if (el.classList.contains("hl-reveal-skip")) return;
        if (el.classList.contains("marquee-track")) return;
        if (seen.has(el)) return;
        seen.add(el);
        list.push(el);
      }

      sec.querySelectorAll(CARD_SEL).forEach(push);

      if (!list.length) {
        var si = sec.querySelector(":scope > .si");
        var root = si || sec;
        Array.prototype.forEach.call(root.children, function (el) {
          push(el);
        });
      }

      if (!list.length) return;

      list.forEach(function (el) {
        if (el.classList.contains("hl-reveal-item")) return;
        el.classList.add("hl-reveal-item");
      });
    });
  }

  /**
   * Set --hl-reveal-idx for CSS stagger. Per-section indices for #logos, page-hero, data-hl-reveal-stagger;
   * #hero uses simultaneous reveal (all idx 0). Elsewhere idx=0 so deep cards are not delayed.
   */
  function assignHlRevealSeqIndices() {
    document.querySelectorAll("body > section").forEach(function (sec) {
      var useStagger =
        sec.id === "logos" ||
        sec.hasAttribute("data-hl-reveal-stagger") ||
        sec.classList.contains("page-hero");
      var i = 0;
      sec.querySelectorAll(".hl-reveal-item").forEach(function (el) {
        el.style.setProperty("--hl-reveal-idx", useStagger ? String(i++) : "0");
      });
    });
  }

  /**
   * Each .hl-reveal-item gets .hl-reveal-in when it intersects the root (IO + scroll/resize flush so nothing stays stuck).
   */
  function initHlScrollReveal() {
    armHlRevealDefaults();
    assignHlRevealSeqIndices();
    var items = document.querySelectorAll(".hl-reveal-item");
    if (!items.length) return;

    var revealObs = null;

    function revealItem(el) {
      if (!el || el.nodeType !== 1) return;
      if (el.classList.contains("hl-reveal-in")) return;
      el.classList.add("hl-reveal-in");
      if (revealObs) {
        try {
          revealObs.unobserve(el);
        } catch (ignore) {}
      }
    }

    function revealAllItems() {
      items.forEach(revealItem);
    }

    if (!("IntersectionObserver" in window)) {
      revealAllItems();
      return;
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealAllItems();
      return;
    }

    var flushRaf = 0;
    function scheduleVisibleFlush() {
      if (flushRaf) return;
      flushRaf = requestAnimationFrame(function () {
        flushRaf = 0;
        document.querySelectorAll(".hl-reveal-item:not(.hl-reveal-in)").forEach(function (el) {
          var r = el.getBoundingClientRect();
          var vh = window.innerHeight || 1;
          var inBand = r.bottom > 4 && r.top < vh * 0.92 && (r.width > 0 || r.height > 0);
          if (!inBand) return;
          var hero = el.closest && el.closest("#hero");
          if (hero) {
            hero.querySelectorAll(".hl-reveal-item").forEach(revealItem);
          } else {
            revealItem(el);
          }
        });
      });
    }

    revealObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var t = entry.target;
          var hero = t.closest && t.closest("#hero");
          if (hero) {
            hero.querySelectorAll(".hl-reveal-item").forEach(revealItem);
          } else {
            revealItem(t);
          }
        });
      },
      {
        root: null,
        /* Slight negative bottom: a touch later than default, without feeling “stuck” off-screen */
        rootMargin: "0px 0px -5% 0px",
        threshold: 0,
      }
    );

    items.forEach(function (el) {
      revealObs.observe(el);
    });

    window.addEventListener("scroll", scheduleVisibleFlush, { passive: true });
    window.addEventListener("resize", scheduleVisibleFlush);
    requestAnimationFrame(scheduleVisibleFlush);
    setTimeout(scheduleVisibleFlush, 300);
  }

  function scheduleHlScrollReveal() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initHlScrollReveal);
    } else {
      initHlScrollReveal();
    }
  }
  scheduleHlScrollReveal();

  function detectNewsletterLanguageValue() {
    var p = (window.location && window.location.pathname) || "/";
    if (p.indexOf("/vi/") === 0) return "Vietnamese";
    if (p.indexOf("/ja/") === 0) return "Japanese";
    if (p.indexOf("/ko/") === 0) return "Korean";
    if (p.indexOf("/zh/") === 0) return "Chinese";
    return "English";
  }

  function ensureHiddenIframe(id) {
    var existing = document.getElementById(id);
    if (existing) return existing;
    var iframe = document.createElement("iframe");
    iframe.id = id;
    iframe.name = id;
    iframe.tabIndex = -1;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    document.body.appendChild(iframe);
    return iframe;
  }

  function initNewsletterGoogleFormBridge() {
    var GF_ACTION =
      "https://docs.google.com/forms/d/e/1FAIpQLSfdP3saeVT46ueAbfF7zJ0OnZEe4y82Et5hshCd_fnms8r1Ig/formResponse";
    var EMAIL_ENTRY = "entry.975117866";
    var LANG_ENTRY = "entry.339917712";
    var SINK_ID = "hlNewsletterFormSink";

    function setMsg(form, text, kind) {
      var box = form.querySelector(".hl-auth-client-msg");
      if (!box) return;
      box.textContent = text || "";
      box.classList.add("is-visible");
      box.classList.remove("hl-msg-ok");
      if (kind === "ok") box.classList.add("hl-msg-ok");
      box.style.color = kind === "ok" ? "#7ED49A" : kind === "err" ? "#FCA5A5" : "";
    }

    function submitToGoogleForm(email, lang) {
      ensureHiddenIframe(SINK_ID);
      var f = document.createElement("form");
      f.method = "POST";
      f.action = GF_ACTION;
      f.target = SINK_ID;
      f.style.position = "absolute";
      f.style.left = "-9999px";
      f.style.top = "0";

      var iEmail = document.createElement("input");
      iEmail.type = "hidden";
      iEmail.name = EMAIL_ENTRY;
      iEmail.value = email;
      f.appendChild(iEmail);

      var iLang = document.createElement("input");
      iLang.type = "hidden";
      iLang.name = LANG_ENTRY;
      iLang.value = lang;
      f.appendChild(iLang);

      document.body.appendChild(f);
      try {
        f.submit();
      } finally {
        setTimeout(function () {
          try {
            document.body.removeChild(f);
          } catch (ignore) {}
        }, 0);
      }
    }

    if (typeof window.hlNewsletterOnValid !== "function") {
      window.hlNewsletterOnValid = function (form) {
        var emailEl = form && form.querySelector ? form.querySelector('input[type="email"]') : null;
        var email = (emailEl && String(emailEl.value || "").trim()) || "";
        if (!email || email.indexOf("@") === -1) return;

        setMsg(form, "Submitting…", "");
        var lang = detectNewsletterLanguageValue();
        submitToGoogleForm(email, lang);
        setMsg(form, "Thanks — you’re registered for weekly updates.", "ok");
        try {
          form.reset();
        } catch (ignore) {}
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNewsletterGoogleFormBridge);
  } else {
    initNewsletterGoogleFormBridge();
  }

  var HL_HOME = {
    vi: "/vi/",
    en: "/",
    ja: "/ja/",
    ko: "/ko/",
    zh: "/zh/",
  };

  var HL_PAGE_PATHS = {
    home: HL_HOME,
    about: { vi: "/vi/about/", en: "/about/", ja: "/ja/about/", ko: "/ko/about/", zh: "/zh/about/" },
    careers: { vi: "/vi/careers/", en: "/careers/", ja: "/ja/careers/", ko: "/ko/careers/", zh: "/zh/careers/" },
    cases: { vi: "/vi/cases/", en: "/cases/", ja: "/ja/cases/", ko: "/ko/cases/", zh: "/zh/cases/" },
    clients: { vi: "/vi/clients/", en: "/clients/", ja: "/ja/clients/", ko: "/ko/clients/", zh: "/zh/clients/" },
    contact: { vi: "/vi/contact/", en: "/contact/", ja: "/ja/contact/", ko: "/ko/contact/", zh: "/zh/contact/" },
    esg: { vi: "/vi/esg/", en: "/esg/", ja: "/ja/esg/", ko: "/ko/esg/", zh: "/zh/esg/" },
    insights: { vi: "/vi/insights/", en: "/insights/", ja: "/ja/insights/", ko: "/ko/insights/", zh: "/zh/insights/" },
    news: { vi: "/vi/news/", en: "/news/", ja: "/ja/news/", ko: "/ko/news/", zh: "/zh/news/" },
    privacy: { vi: "/vi/privacy/", en: "/privacy/", ja: "/ja/privacy/", ko: "/ko/privacy/", zh: "/zh/privacy/" },
    team: { vi: "/vi/team/", en: "/team/", ja: "/ja/team/", ko: "/ko/team/", zh: "/zh/team/" },
    terms: { vi: "/vi/terms/", en: "/terms/", ja: "/ja/terms/", ko: "/ko/terms/", zh: "/zh/terms/" },
    login: { vi: "/vi/login/", en: "/login/", ja: "/ja/login/", ko: "/ko/login/", zh: "/zh/login/" },
    register: { vi: "/vi/register/", en: "/register/", ja: "/ja/register/", ko: "/ko/register/", zh: "/zh/register/" },
    forgot: { vi: "/vi/forgot/", en: "/forgot/", ja: "/ja/forgot/", ko: "/ko/forgot/", zh: "/zh/forgot/" },
    notfound: { vi: "/vi/__hl-missing__/", en: "/__hl-missing__/", ja: "/ja/__hl-missing__/", ko: "/ko/__hl-missing__/", zh: "/zh/__hl-missing__/" },
    faq: {
      vi: "/vi/faq/",
      en: "/faq/",
      ja: "/ja/faq/",
      ko: "/ko/faq/",
      zh: "/zh/faq/",
    },
    "services-all": {
      vi: "/vi/services/",
      en: "/services/",
      ja: "/ja/services/",
      ko: "/ko/services/",
      zh: "/zh/services/",
    },
    "services-market": {
      vi: "/vi/services/market/",
      en: "/services/market/",
      ja: "/ja/services/market/",
      ko: "/ko/services/market/",
      zh: "/zh/services/market/",
    },
    "services-land": {
      vi: "/vi/services/land/",
      en: "/services/land/",
      ja: "/ja/services/land/",
      ko: "/ko/services/land/",
      zh: "/zh/services/land/",
    },
    "services-legal": {
      vi: "/vi/services/legal/",
      en: "/services/legal/",
      ja: "/ja/services/legal/",
      ko: "/ko/services/legal/",
      zh: "/zh/services/legal/",
    },
    "services-project": {
      vi: "/vi/services/project/",
      en: "/services/project/",
      ja: "/ja/services/project/",
      ko: "/ko/services/project/",
      zh: "/zh/services/project/",
    },
    "services-esg": {
      vi: "/vi/services/esg/",
      en: "/services/esg/",
      ja: "/ja/services/esg/",
      ko: "/ko/services/esg/",
      zh: "/zh/services/esg/",
    },
    "services-find-project": {
      vi: "/vi/services/find-project/",
      en: "/services/find-project/",
      ja: "/ja/services/find-project/",
      ko: "/ko/services/find-project/",
      zh: "/zh/services/find-project/",
    },
    "services-find-project-pricing": {
      vi: "/vi/services/find-project/pricing/",
      en: "/services/find-project/pricing/",
      ja: "/ja/services/find-project/pricing/",
      ko: "/ko/services/find-project/pricing/",
      zh: "/zh/services/find-project/pricing/",
    },
    "services-find-project-contract": {
      vi: "/vi/services/find-project/contract/",
      en: "/services/find-project/contract/",
      ja: "/ja/services/find-project/contract/",
      ko: "/ko/services/find-project/contract/",
      zh: "/zh/services/find-project/contract/",
    },
    "case-exxon": {
      vi: "/vi/cases/exxon/",
      en: "/cases/exxon/",
      ja: "/ja/cases/exxon/",
      ko: "/ko/cases/exxon/",
      zh: "/zh/cases/exxon/",
    },
    "insight-fdi-recap": {
      vi: "/vi/insights/fdi-recap/",
      en: "/insights/fdi-recap/",
      ja: "/ja/insights/fdi-recap/",
      ko: "/ko/insights/fdi-recap/",
      zh: "/zh/insights/fdi-recap/",
    },
    "news-esg-forum": {
      vi: "/vi/news/esg-forum/",
      en: "/news/esg-forum/",
      ja: "/ja/news/esg-forum/",
      ko: "/ko/news/esg-forum/",
      zh: "/zh/news/esg-forum/",
    },
    "news-fdi-q1": {
      vi: "/vi/news/fdi/",
      en: "/news/fdi/",
      ja: "/ja/news/fdi/",
      ko: "/ko/news/fdi/",
      zh: "/zh/news/fdi/",
    },
    "events-kcn-mien-bac": {
      vi: "/vi/events-calendar/kcn-mien-bac-2026/",
      en: "/events-calendar/kcn-mien-bac-2026/",
      ja: "/ja/events-calendar/kcn-mien-bac-2026/",
      ko: "/ko/events-calendar/kcn-mien-bac-2026/",
      zh: "/zh/events-calendar/kcn-mien-bac-2026/",
    },
    "events-calendar": {
      vi: "/vi/events-calendar/",
      en: "/events-calendar/",
      ja: "/ja/events-calendar/",
      ko: "/ko/events-calendar/",
      zh: "/zh/events-calendar/",
    },
    "job-analyst": {
      vi: "/vi/jobs/analyst/",
      en: "/en/jobs/analyst/",
      ja: "/ja/jobs/analyst/",
      ko: "/ko/jobs/analyst/",
      zh: "/zh/jobs/analyst/",
    },
    "job-esg": {
      vi: "/vi/jobs/esg/",
      en: "/en/jobs/esg/",
      ja: "/ja/jobs/esg/",
      ko: "/ko/jobs/esg/",
      zh: "/zh/jobs/esg/",
    },
    "team-ceo": {
      vi: "/vi/team/ceo/",
      en: "/team/ceo/",
      ja: "/ja/team/ceo/",
      ko: "/ko/team/ceo/",
      zh: "/zh/team/ceo/",
    },
  };

  var LANG_ORDER = ["vi", "en", "ja", "ko", "zh"];
  var LANG_LABELS = {
    vi: "🇻🇳 Tiếng Việt",
    en: "🇬🇧 English",
    ja: "🇯🇵 日本語",
    ko: "🇰🇷 한국어",
    zh: "🇨🇳 中文",
  };
  /** Flag-only language options when viewport width ≤1620px (see landing-chrome.css). */
  var LANG_LABELS_COMPACT = {
    vi: "🇻🇳",
    en: "🇬🇧",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳",
  };

  function isNarrowHeaderActionsMq() {
    return window.matchMedia("(max-width: 1620px)").matches;
  }

  function initHeaderActionsBreakpoint() {
    var mql = window.matchMedia("(max-width: 1620px)");
    function onChange() {
      populateLangSelect();
    }
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else if (mql.addListener) mql.addListener(onChange);
  }

  function langPack() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase().trim();
    if (raw === "vi") return "vi";
    if (raw === "en") return "en";
    if (raw === "ja") return "ja";
    if (raw === "ko") return "ko";
    if (raw === "zh-hans" || raw === "zh-cn" || raw.indexOf("zh") === 0) return "zh";
    return "en";
  }

  function inject(targetId, html) {
    var el = document.getElementById(targetId);
    if (!el) return;
    var tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    el.replaceWith(tpl.content);
  }

  function fetchPartial(name, pack) {
    var path = "partials/" + name + "-" + pack + ".html";
    return fetch(new URL(path, base), { credentials: "same-origin" }).then(function (r) {
      if (r.ok) return r.text();
      if (pack !== "en") return fetchPartial(name, "en");
      throw new Error(path);
    });
  }

  var DASHBOARD_LOGIN_LOCALES = { vi: 1, en: 1, zh: 1, ja: 1, ko: 1 };

  /** Rewrite `a[data-hl-dashboard-login]` → static login HTML or optional dashboard URL. */
  function wireDashboardLoginLinks() {
    var dashBase = null;
    var defaultDashBase = "https://dashboard.houselink.com.vn";
    if (typeof window !== "undefined" && window.HL_DASHBOARD_BASE) {
      dashBase = String(window.HL_DASHBOARD_BASE).replace(/\/+$/, "");
    }
    if (!dashBase) {
      var meta = document.querySelector('meta[name="hl-dashboard-base"]');
      if (meta) {
        var raw = (meta.getAttribute("content") || "").trim();
        if (raw) dashBase = raw.replace(/\/+$/, "");
      }
    }
    if (!dashBase && defaultDashBase) {
      dashBase = String(defaultDashBase).replace(/\/+$/, "");
    }

    document.querySelectorAll("a[data-hl-dashboard-login]").forEach(function (a) {
      var loc = (a.getAttribute("data-hl-login-locale") || "vi").toLowerCase().trim();
      if (!DASHBOARD_LOGIN_LOCALES[loc]) loc = "vi";
      if (dashBase) {
        try {
          a.href = new URL("/", dashBase + "/").href;
        } catch (ignore) {
          a.href = dashBase + "/";
        }
      } else {
        var loginPaths = {
          vi: "/vi/login/",
          en: "/login/",
          ja: "/ja/login/",
          ko: "/ko/login/",
          zh: "/zh/login/",
        };
        a.href = loginPaths[loc] || loginPaths.vi;
      }
      a.removeAttribute("target");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }

  function initHeaderScroll() {
    var hdr = document.getElementById("header");
    if (!hdr) return;
    function onScroll() {
      hdr.classList.toggle("scrolled", window.scrollY > 10);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function normalizePathname(p) {
    if (!p || p === "") return "/";
    var x = p.split("#")[0].split("?")[0].replace(/\/index\.html$/i, "");
    if (x.length > 1 && x.endsWith("/")) x = x.slice(0, -1);
    return x.toLowerCase() || "/";
  }

  /** Path-only ref for same-site navigation (no `https://` host baked in). */
  function sameSiteLocationRef(href) {
    if (!href) return href;
    var h = String(href).trim();
    if (h.charAt(0) === "/") return h;
    try {
      var u = new URL(h, window.location.href);
      if (u.origin === window.location.origin) {
        return u.pathname + u.search + u.hash;
      }
    } catch (ignore) {}
    return h;
  }

  function pathnameForLangMatch(href) {
    if (!href) return "";
    var h = String(href).trim();
    if (h.charAt(0) === "/") return normalizePathname(h);
    try {
      return normalizePathname(new URL(h, window.location.href).pathname);
    } catch (ignore) {
      return "";
    }
  }

  function inferPageKeyExactMatch() {
    var cur = normalizePathname(window.location.pathname);
    var keys = Object.keys(HL_PAGE_PATHS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var row = HL_PAGE_PATHS[k];
      if (!row || typeof row !== "object") continue;
      for (var j = 0; j < LANG_ORDER.length; j++) {
        var code = LANG_ORDER[j];
        var href = row[code];
        if (!href) continue;
        if (pathnameForLangMatch(href) === cur) return k;
      }
    }
    return null;
  }

  /**
   * Deep URLs (e.g. `/vi/careers/business-development-manager/`) are often not listed in HL_PAGE_PATHS.
   * Pick the longest known path prefix so the language switcher falls back to the right hub (`careers`,
   * `news`, `services-market`, …) instead of `notfound` → `__hl-missing__`.
   */
  function inferPageKeyFromPathPrefix() {
    var cur = normalizePathname(window.location.pathname);
    var bestKey = null;
    var bestLen = -1;
    var keys = Object.keys(HL_PAGE_PATHS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === "notfound" || k === "home") continue;
      var row = HL_PAGE_PATHS[k];
      if (!row || typeof row !== "object") continue;
      for (var j = 0; j < LANG_ORDER.length; j++) {
        var href = row[LANG_ORDER[j]];
        if (!href) continue;
        var np = pathnameForLangMatch(href);
        if (!np) continue;
        if (cur === np || cur.startsWith(np + "/")) {
          if (np.length > bestLen) {
            bestLen = np.length;
            bestKey = k;
          }
        }
      }
    }
    if (bestKey) return bestKey;
    for (var h = 0; h < LANG_ORDER.length; h++) {
      var hp = HL_HOME[LANG_ORDER[h]];
      if (hp && pathnameForLangMatch(hp) === cur) return "home";
    }
    return null;
  }

  /**
   * Host 404 responses reuse `404.html` with `data-hl-page="notfound"` while the address bar still shows
   * the requested path (e.g. `/services/land/`). Map that path back to a HL_PAGE_PATHS row so the language
   * switcher can offer the correct locale (VI uses `/vi/services/.../` detail URLs; EN/JA/KO/ZH use hub anchors
   * such as `/ja/services/land/`).
   */
  function inferPageKeyFromPathname() {
    var exact = inferPageKeyExactMatch();
    if (exact) return exact;
    return inferPageKeyFromPathPrefix();
  }

  function pathKey() {
    var fromBody = document.body && document.body.getAttribute("data-hl-page");
    if (fromBody === "notfound") {
      var inferred = inferPageKeyFromPathname();
      if (inferred) return inferred;
    }
    return fromBody || "home";
  }

  function pageMapForKey(key) {
    return HL_PAGE_PATHS[key] || HL_PAGE_PATHS.home;
  }

  function populateLangSelect() {
    var sel = document.getElementById("hl-lang-select");
    if (!sel) return;
    var map = pageMapForKey(pathKey());
    sel.innerHTML = "";
    var labels = isNarrowHeaderActionsMq() ? LANG_LABELS_COMPACT : LANG_LABELS;
    LANG_ORDER.forEach(function (code) {
      var opt = document.createElement("option");
      opt.value = map[code] || HL_HOME[code];
      opt.textContent = labels[code] || LANG_LABELS[code] || code;
      sel.appendChild(opt);
    });
    syncLangSelect(sel, map);
  }

  function syncLangSelect(sel, map) {
    var cur = normalizePathname(window.location.pathname);
    var matched = null;
    LANG_ORDER.forEach(function (code) {
      var v = map[code] || "";
      if (v && pathnameForLangMatch(v) === cur) matched = v;
    });
    if (matched) {
      sel.value = matched;
      return;
    }
    var pack = langPack();
    /* JA/KO: bare `/ja` or `/ko` in the bar should still match the home option */
    if (pathKey() === "home" && (pack === "ja" || pack === "ko")) {
      var hp = "/" + pack;
      if (cur === hp || cur === hp + "/") {
        var fb = map[pack] || HL_HOME[pack];
        if (fb) {
          sel.value = fb;
          return;
        }
      }
    }
    sel.value = map[pack] || map.vi || HL_HOME[pack];
  }

  function isMobileNavMq() {
    return window.matchMedia("(max-width: 1100px)").matches;
  }

  function initMobileNav() {
    var header = document.getElementById("header");
    var toggle = document.getElementById("hl-nav-toggle");
    var panel = document.getElementById("hl-nav-panel");
    if (!header || !toggle || !panel) return;

    function setOpen(open) {
      header.classList.toggle("hl-nav-open", open);
      document.body.classList.toggle("hl-nav-no-scroll", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) {
        header.querySelectorAll(".has-mega.hl-mega-open").forEach(function (el) {
          el.classList.remove("hl-mega-open");
        });
      }
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!header.classList.contains("hl-nav-open"));
    });

    panel.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (href === "#" || href === "") return;
      setOpen(false);
    });

    header.addEventListener("click", function (e) {
      if (!isMobileNavMq()) return;
      var t = e.target.closest(".has-mega > a");
      if (!t || t.getAttribute("href") !== "#") return;
      e.preventDefault();
      var mega = t.closest(".has-mega");
      var wasOpen = mega.classList.contains("hl-mega-open");
      header.querySelectorAll(".has-mega.hl-mega-open").forEach(function (el) {
        el.classList.remove("hl-mega-open");
      });
      if (!wasOpen) mega.classList.add("hl-mega-open");
    });

    document.addEventListener(
      "click",
      function (e) {
        if (!header.classList.contains("hl-nav-open")) return;
        if (toggle.contains(e.target)) return;
        if (panel.contains(e.target)) return;
        setOpen(false);
      },
      true
    );

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!header.classList.contains("hl-nav-open")) return;
      setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (!isMobileNavMq()) setOpen(false);
    });

    var sel = document.getElementById("hl-lang-select");
    if (sel) {
      sel.addEventListener("change", function () {
        setOpen(false);
      });
    }
  }

  /**
   * Header / in-page CTAs: same behavior as contact “Chọn khung giờ” — open #consultFormModal
   * when the page defines window.openConsultForm (e.g. contact, vi/faq); else go to locale contact.
   */
  function wireOpenConsultHeaderCta() {
    if (window.__hlOpenConsultCtaWired) return;
    window.__hlOpenConsultCtaWired = true;
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest && e.target.closest("a[data-hl-open-consult]");
        if (!a) return;
        e.preventDefault();

        var headerEl = document.getElementById("header");
        if (headerEl && headerEl.classList.contains("hl-nav-open")) {
          headerEl.classList.remove("hl-nav-open");
          document.body.classList.remove("hl-nav-no-scroll");
          var nt = document.getElementById("hl-nav-toggle");
          if (nt) nt.setAttribute("aria-expanded", "false");
        }

        var modal = document.getElementById("consultFormModal");
        if (modal && typeof window.openConsultForm === "function") {
          window.openConsultForm(e);
          return;
        }
        if (modal) {
          modal.classList.add("open");
          modal.setAttribute("aria-hidden", "false");
          document.body.style.overflow = "hidden";
          return;
        }
        var fb = (a.getAttribute("data-hl-contact-fallback") || "").trim();
        if (fb) window.location.assign(fb);
      },
      true
    );
  }

  function wireLangSelect() {
    var sel = document.getElementById("hl-lang-select");
    if (!sel) return;
    sel.addEventListener("change", function () {
      var v = sel.value;
      if (!v) return;
      var ref = sameSiteLocationRef(v);
      var tgt = pathnameForLangMatch(v);
      var topHere = normalizePathname(window.location.pathname);

      function goTop() {
        window.top.location.assign(ref);
      }

      if (window.top !== window) {
        goTop();
        return;
      }

      if (tgt === topHere) return;
      goTop();
    });
  }

  wireOpenConsultHeaderCta();

  var pack = langPack();
  Promise.all([fetchPartial("header", pack), fetchPartial("footer", pack)])
    .then(function (parts) {
      inject("hl-chrome-header", parts[0]);
      inject("hl-chrome-footer", parts[1]);
      wireDashboardLoginLinks();
      initHeaderScroll();
      populateLangSelect();
      initHeaderActionsBreakpoint();
      wireLangSelect();
      initMobileNav();
    })
    .catch(function () {
      console.warn(
        "[landing-chrome] Không tải được partials. Chạy site qua HTTP (vd: npx serve trong thư mục landing-page)."
      );
    });
})();
