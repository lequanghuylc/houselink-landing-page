/**
 * News index — 3 nearest upcoming (active) calendar events from GET /api/events.
 */
(function () {
  "use strict";

  var MAX_UPCOMING = 3;

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

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function eventDateYmd(iso) {
    var s = String(iso || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }

  function todayYmd() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    } catch (ignore) {
      var d = new Date();
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }
  }

  function isEventPast(ev) {
    if (ev && ev.isPast) return true;
    var ymd = eventDateYmd(ev && ev.eventDate);
    return Boolean(ymd) && ymd < todayYmd();
  }

  function copy() {
    var k = langKey();
    var T = {
      en: { register: "Register →", empty: "No upcoming events.", locPin: "📍 " },
      vi: { register: "Đăng ký →", empty: "Chưa có sự kiện sắp diễn ra.", locPin: "📍 " },
      ja: { register: "登録する →", empty: "今後のイベントはありません。", locPin: "📍 " },
      ko: { register: "등록하기 →", empty: "예정된 이벤트가 없습니다.", locPin: "📍 " },
      zh: { register: "注册 →", empty: "暂无即将举行的活动。", locPin: "📍 " }
    };
    return T[k] || T.en;
  }

  function dateParts(iso) {
    var ymd = eventDateYmd(iso);
    if (!ymd) return { day: "—", mon: "" };
    var parts = ymd.split("-");
    return { day: parts[2], mon: "Th." + Number(parts[1]) };
  }

  function registerHref(ev) {
    if (ev && ev.registerUrl) return localizePath(ev.registerUrl);
    return localizePath("/contact/");
  }

  function catLine(ev) {
    var labels = ev.tagLabels || ev.tags || [];
    return labels.filter(Boolean).join(" · ");
  }

  function locLine(ev) {
    var bits = [];
    if (ev.venue) bits.push(ev.venue);
    if (ev.delegatesLabel) bits.push(ev.delegatesLabel);
    if (ev.partnersLabel) bits.push(ev.partnersLabel);
    return bits.join(" · ");
  }

  function renderCard(ev) {
    var t = copy();
    var parts = dateParts(ev.eventDate);
    var cat = catLine(ev);
    var loc = locLine(ev);
    var href = registerHref(ev);
    return (
      '<div class="ev">' +
      '<div class="ev-dt"><div class="ev-day">' + esc(parts.day) + '</div><div class="ev-mon">' + esc(parts.mon) + "</div></div>" +
      "<div>" +
      (cat ? '<div class="ev-cat">' + esc(cat) + "</div>" : "") +
      '<div class="ev-ttl">' + esc(ev.title || "") + "</div>" +
      (loc ? '<div class="ev-loc">' + t.locPin + esc(loc) + "</div>" : "") +
      "</div>" +
      '<div class="ev-btn"><a href="' + esc(href) + '">' + esc(t.register) + "</a></div>" +
      "</div>"
    );
  }

  function pickUpcoming(events) {
    return (events || [])
      .filter(function (ev) { return !isEventPast(ev); })
      .sort(function (a, b) {
        return eventDateYmd(a.eventDate).localeCompare(eventDateYmd(b.eventDate));
      })
      .slice(0, MAX_UPCOMING);
  }

  async function loadUpcoming() {
    var root = document.getElementById("hl-news-upcoming-events");
    if (!root) return;
    var t = copy();
    try {
      var res = await fetch(resolveApiBase() + "/api/events?locale=" + encodeURIComponent(langKey()), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit"
      });
      if (!res.ok) throw new Error("events_http");
      var body = await res.json();
      var events = pickUpcoming((body && body.data && body.data.events) || []);
      if (!events.length) {
        root.innerHTML = '<p style="padding:8px 0;color:var(--gray-500);">' + esc(t.empty) + "</p>";
        return;
      }
      root.innerHTML = events.map(renderCard).join("");
    } catch (ignore) {
      root.innerHTML = '<p style="padding:8px 0;color:var(--gray-500);">' + esc(t.empty) + "</p>";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadUpcoming();
  });
})();
