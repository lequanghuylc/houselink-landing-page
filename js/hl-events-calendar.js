/**
 * Landing events calendar — CMS-driven list (`GET /api/events`).
 */
(function () {
  "use strict";

  var calFilterTag = "all";
  var calSearchQuery = "";
  var curYear = new Date().getFullYear();
  var curMonth = new Date().getMonth();
  var eventDaysByMonth = {};
  var allEvents = [];

  function langKey() {
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

  /** Prefix locale segment for paths stored without /vi/, /ja/, etc. */
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
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var TAG_CLASS = {
    bm: "tag-bm",
    esg: "tag-esg",
    fdi: "tag-fdi",
    contractor: "tag-contractor",
    policy: "tag-policy"
  };

  var MONTH_NAMES = {
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    vi: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
    ja: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    ko: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
    zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  };

  function monthLabel(idx) {
    var k = langKey();
    var names = MONTH_NAMES[k] || MONTH_NAMES.en;
    return names[idx] || names.en[idx] || "";
  }

  function formatDateParts(iso) {
    var d = new Date(iso + "T12:00:00");
    if (isNaN(+d)) return { day: "—", mon: "", dow: "" };
    var day = String(d.getDate()).padStart(2, "0");
    var mon = "Th." + (d.getMonth() + 1);
    var dow = d.toLocaleDateString(langKey() === "vi" ? "vi-VN" : "en-US", { weekday: "long" });
    return { day: day, mon: mon, dow: dow };
  }

  function defaultRegisterUrl() {
    return sitePrefix() + "contact/";
  }

  function newsArticleHref(slug) {
    // Same as hl-news-feed.js — /news/cms/ is EN-root only; locale via ?lang=
    var u = "/news/cms/?slug=" + encodeURIComponent(slug);
    if (langKey() !== "en") u += "&lang=" + encodeURIComponent(langKey());
    return u;
  }

  /** Strip locale prefix; keep query string. CMS hosts are root-only. */
  function rootCmsPath(path) {
    var p = String(path || "").trim();
    if (!p) return p;
    if (/^https?:\/\//i.test(p) || p.indexOf("//") === 0) return p;
    if (p.charAt(0) !== "/") p = "/" + p;
    p = p.replace(/^\/(vi|ja|ko|zh)(?=\/)/, "");
    return p;
  }

  function isRootOnlyCmsPath(path) {
    var p = rootCmsPath(path).split("?")[0];
    return /\/events-calendar\/cms\/?$/.test(p) || /\/news\/cms\/?$/.test(p);
  }

  /** Register → always registerUrl, default /contact/ (upcoming or past). */
  function resolveRegisterHref(ev) {
    if (ev.registerUrl) return localizePath(ev.registerUrl);
    return defaultRegisterUrl();
  }

  /**
   * Primary content link (Details / View Report):
   * linked news for this page locale only → detailUrl for this locale only.
   * No cross-locale fallback and no default CMS page — missing link hides the button.
   */
  function resolveDetailHref(ev) {
    if (ev.newsArticleSlug) return newsArticleHref(ev.newsArticleSlug);
    if (ev.detailUrl) {
      if (isRootOnlyCmsPath(ev.detailUrl)) return rootCmsPath(ev.detailUrl);
      return localizePath(ev.detailUrl);
    }
    return null;
  }

  function renderTagSpans(ev) {
    var html = "";
    var tags = ev.tags || [];
    var labels = ev.tagLabels || tags;
    for (var i = 0; i < tags.length; i++) {
      var key = tags[i];
      var cls = TAG_CLASS[key] || "tag-bm";
      html += '<span class="ev-tag ' + cls + '">' + esc(labels[i] || key) + "</span>";
    }
    if (ev.featured) {
      html += '<span class="ev-tag tag-featured">⭐ Featured Event</span>';
    }
    if (ev.isPast) {
      html += '<span class="ev-tag tag-past">Concluded</span>';
    }
    return html;
  }

  function renderMeta(ev) {
    var parts = [];
    if (ev.venue) parts.push('<div class="ev-meta-item">📍 <span>' + esc(ev.venue) + "</span></div>");
    if (ev.timeLabel) parts.push('<div class="ev-meta-item">⏰ <span>' + esc(ev.timeLabel) + "</span></div>");
    if (ev.delegatesLabel) parts.push('<div class="ev-meta-item">👥 <span>' + esc(ev.delegatesLabel) + "</span></div>");
    if (ev.priceLabel) {
      parts.push('<div class="ev-meta-item">🎫 <span style="color:var(--green);font-weight:600;">' + esc(ev.priceLabel) + "</span></div>");
    }
    if (ev.partnersLabel) parts.push('<div class="ev-meta-item">🤝 <span>' + esc(ev.partnersLabel) + "</span></div>");
    return parts.join("");
  }

  function renderCard(ev) {
    var parts = formatDateParts(ev.eventDate);
    var tagsStr = (ev.tags || []).join(" ");
    var cardCls = "ev-card" + (ev.featured ? " featured" : "") + (ev.isPast ? " past" : "");
    var regHref = resolveRegisterHref(ev);
    var detHref = resolveDetailHref(ev);
    var actions = "";
    if (ev.isPast) {
      // View Report when this locale has news OR detail URL (Register stays hidden for past).
      if (detHref) {
        actions = '<a href="' + esc(detHref) + '" class="btn-ev-past">View Report</a>';
      }
    } else {
      actions = '<a href="' + esc(regHref) + '" class="btn-ev-reg">Register →</a>';
      if (detHref) {
        actions += '<a href="' + esc(detHref) + '" class="btn-ev-detail">Details</a>';
      }
      if (ev.spotsLabel) {
        actions += '<div class="ev-spots">' + esc(ev.spotsLabel) + "</div>";
      }
    }
    return (
      '<div class="' + cardCls + '" data-tags="' + esc(tagsStr) + '">' +
      '<div class="ev-date-col"><div class="ev-day">' + esc(parts.day) + '</div><div class="ev-mon">' + esc(parts.mon) +
      '</div><div class="ev-dow">' + esc(parts.dow) + "</div></div>" +
      '<div class="ev-body"><div class="ev-tags">' + renderTagSpans(ev) + "</div>" +
      '<div class="ev-card-title">' + esc(ev.title) + "</div>" +
      '<div class="ev-card-desc">' + esc(ev.excerpt) + "</div>" +
      '<div class="ev-card-meta">' + renderMeta(ev) + "</div></div>" +
      '<div class="ev-action-col">' + actions + "</div></div>"
    );
  }

  function groupByMonth(events) {
    var map = {};
    events.forEach(function (ev) {
      var d = new Date(ev.eventDate + "T12:00:00");
      var key = d.getFullYear() + "-" + (d.getMonth() + 1);
      if (!map[key]) map[key] = { year: d.getFullYear(), month: d.getMonth(), events: [] };
      map[key].events.push(ev);
    });
    return Object.keys(map)
      .sort()
      .map(function (k) { return map[k]; });
  }

  function rebuildEventDays(events) {
    eventDaysByMonth = {};
    events.forEach(function (ev) {
      var d = new Date(ev.eventDate + "T12:00:00");
      var key = d.getFullYear() + "-" + (d.getMonth() + 1);
      if (!eventDaysByMonth[key]) eventDaysByMonth[key] = [];
      eventDaysByMonth[key].push(d.getDate());
    });
  }

  function renderEventsList(events) {
    var list = document.getElementById("events-list");
    if (!list) return;
    if (!events.length) {
      list.innerHTML = '<p style="padding:24px;color:var(--gray-500);">No upcoming events.</p>';
      return;
    }
    var past = events.filter(function (e) { return e.isPast; });
    var upcoming = events.filter(function (e) { return !e.isPast; });
    var html = "";
    if (past.length) {
      html += '<div class="month-section past-section"><div class="past-label"><span class="past-tag">Past</span><div style="flex:1;height:1px;background:var(--gray-100);"></div></div>';
      past.forEach(function (ev) { html += renderCard(ev); });
      html += "</div>";
    }
    groupByMonth(upcoming).forEach(function (group) {
      html += '<div class="month-section" data-month="' + (group.month + 1) + '">';
      html += '<div class="month-header"><span class="month-tag">' + esc(monthLabel(group.month)) + '</span>';
      html += '<span class="month-label">' + group.year + '</span><div class="month-divider"></div></div>';
      group.events.forEach(function (ev) { html += renderCard(ev); });
      html += "</div>";
    });
    list.innerHTML = html;
    applyEventListFilters();
  }

  function calCardTagList(tagsStr) {
    return (tagsStr || "").trim().split(/\s+/).filter(Boolean);
  }

  function calCardMatchesFilter(tagsStr, tag) {
    if (tag === "all") return true;
    return calCardTagList(tagsStr).indexOf(tag) !== -1;
  }

  function applyEventListFilters() {
    var q = (calSearchQuery || "").trim().toLowerCase();
    var list = document.getElementById("events-list");
    if (!list) return;
    list.querySelectorAll(".month-section").forEach(function (section) {
      var anyVisible = false;
      section.querySelectorAll(".ev-card").forEach(function (card) {
        var tags = card.getAttribute("data-tags") || "";
        var tagOk = calCardMatchesFilter(tags, calFilterTag);
        var text = (card.textContent || "").toLowerCase();
        var searchOk = !q || text.indexOf(q) !== -1;
        var show = tagOk && searchOk;
        card.style.display = show ? "flex" : "none";
        if (show) anyVisible = true;
      });
      section.style.display = anyVisible ? "" : "none";
    });
  }

  window.filterEvents = function (tag, btn) {
    document.querySelectorAll(".filter-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    if (btn) btn.classList.add("active");
    calFilterTag = tag || "all";
    applyEventListFilters();
  };

  window.searchEvents = function (value) {
    calSearchQuery = value || "";
    applyEventListFilters();
  };

  function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }

  function renderMiniCal() {
    var labelEl = document.getElementById("mc-month-label");
    var daysEl = document.getElementById("mc-days");
    if (!labelEl || !daysEl) return;
    labelEl.textContent = monthLabel(curMonth) + ", " + curYear;
    var days = getDaysInMonth(curYear, curMonth);
    var firstDay = getFirstDay(curYear, curMonth);
    var key = curYear + "-" + (curMonth + 1);
    var evDays = eventDaysByMonth[key] || [];
    var html = "";
    for (var i = 0; i < firstDay; i++) html += '<div class="mc-day empty"></div>';
    var today = new Date();
    for (var d = 1; d <= days; d++) {
      var cls = "mc-day";
      if (evDays.indexOf(d) !== -1) cls += " has-event";
      if (curYear === today.getFullYear() && curMonth === today.getMonth() && d === today.getDate()) cls += " today";
      html += '<div class="' + cls + '">' + d + "</div>";
    }
    daysEl.innerHTML = html;
  }

  window.prevMonth = function () {
    if (curMonth > 0) curMonth--;
    else { curMonth = 11; curYear--; }
    renderMiniCal();
  };

  window.nextMonth = function () {
    if (curMonth < 11) curMonth++;
    else { curMonth = 0; curYear++; }
    renderMiniCal();
  };

  async function loadEvents() {
    await ensureAuthEnv();
    var apiBase = resolveApiBase();
    var locale = langKey();
    var res = await fetch(apiBase + "/api/events?locale=" + encodeURIComponent(locale), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit"
    });
    if (!res.ok) throw new Error("events_http");
    var body = await res.json();
    if (!body || body.success !== true) throw new Error("events_shape");
    allEvents = (body.data && body.data.events) || [];
    rebuildEventDays(allEvents);
    renderEventsList(allEvents);
    renderMiniCal();
    updateHeroStats(allEvents);
  }

  function updateHeroStats(events) {
    var statNums = document.querySelectorAll(".h-stat-num");
    if (!statNums.length) return;
    var upcoming = events.filter(function (e) { return !e.isPast; });
    if (statNums[0]) statNums[0].textContent = String(events.length || upcoming.length);
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadEvents().catch(function () {
      var list = document.getElementById("events-list");
      if (list) list.innerHTML = '<p style="padding:24px;color:var(--gray-500);">Could not load events.</p>';
    });
  });
})();
