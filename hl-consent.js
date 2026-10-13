/*!
 * HOUSELINK cookie consent - hl-consent.js
 * Theo Chính sách bảo vệ dữ liệu cá nhân v2.0 (ban hành và hiệu lực 12/10/2026), mục 6.
 *
 * - Cookie không cần thiết tắt cho tới khi người dùng bật; không có ô chọn sẵn; im lặng không phải là đồng ý.
 * - Nhóm: Cần thiết (luôn bật), Đo lường (Google Analytics, mặc định tắt), Tiếp thị (không sử dụng).
 * - Nút "Từ chối tất cả" có cùng kích thước và màu với nút "Đồng ý".
 * - Lựa chọn lưu trong cookie hl_consent 12 tháng (dưới mức tối đa 13 tháng của chính sách);
 *   hỏi lại khi hết hạn hoặc khi đổi POLICY_VERSION.
 * - Mở lại bảng cài đặt: phần tử có [data-hl-cookie-settings], window.hlOpenCookieSettings(),
 *   hoặc sự kiện "hl:open-cookie-settings".
 * - Google Analytics chỉ được nạp sau khi người dùng bật "Đo lường" (điền GA_ID bên dưới).
 *   Script khác cần chặn: <script type="text/plain" data-hl-consent="analytics" data-src="..."></script>
 * - Khi lựa chọn thay đổi: phát sự kiện "hl:consent-change" (detail = trạng thái).
 *
 * API: window.hlConsent.open() | .get() | .has("analytics") | .acceptAll() | .rejectAll() | .reset()
 */
(function () {
  "use strict";
  if (window.hlConsent) return;

  /* ---------- CẤU HÌNH ---------- */
  var me = document.currentScript;
  function attr(name, fallback) {
    var v = me && me.getAttribute(name);
    return v === null || v === undefined || v === "" ? fallback : v;
  }
  var CONFIG = {
    POLICY_VERSION: "2.0",            // đổi khi chính sách thay đổi nhóm cookie -> mọi người được hỏi lại
    GA_ID: attr("data-ga-id", "G-N49QB0S01P"),    // điền mã GA4 dạng "G-XXXXXXXXXX" vào chuỗi rỗng này; để trống nếu chưa dùng Google Analytics
    LOG_ENDPOINT: attr("data-log-endpoint", ""), // tùy chọn: URL API lưu bằng chứng đồng ý (POST, thân là JSON dạng text/plain; chỉ có mã đồng ý ngẫu nhiên, không có dữ liệu định danh)
    COOKIE_NAME: "hl_consent",
    MAX_AGE_DAYS: 365,
    SHOW_IN_IFRAME: attr("data-show-in-iframe", "") === "true"
  };

  /* ---------- NGÔN NGỮ ---------- */
  var T = {
    vi: {
      region: "Đồng ý cookie",
      title: "HOUSELINK tôn trọng quyền riêng tư của bạn",
      text: "Website chỉ dùng cookie cần thiết để hoạt động. Cookie đo lường giúp chúng tôi thống kê lượt truy cập ở dạng tổng hợp bằng Google Analytics và chỉ bật khi bạn đồng ý. HOUSELINK không dùng cookie tiếp thị. Bạn có thể đổi lựa chọn bất kỳ lúc nào tại “Cài đặt cookie” ở chân trang. Xem {policy}.",
      customize: "Tùy chỉnh", reject: "Từ chối tất cả", accept: "Đồng ý",
      panelTitle: "Cài đặt cookie",
      intro: "Theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, cookie không cần thiết chỉ bật khi bạn đồng ý. Không có ô nào được chọn sẵn và im lặng không được coi là đồng ý. Lựa chọn của bạn được lưu trên trình duyệt này trong 12 tháng.",
      nec: "Cần thiết", necDesc: "Đăng nhập, bảo mật, ghi nhớ ngôn ngữ và lựa chọn cookie của bạn. Website không hoạt động nếu thiếu nhóm này.", always: "Luôn bật",
      ana: "Đo lường", anaDesc: "Thống kê lượt truy cập và trang được xem nhiều ở dạng tổng hợp bằng Google Analytics, không gắn với danh tính của bạn.", anaMeta: "Nhà cung cấp: Google · Thời hạn tối đa 13 tháng",
      mkt: "Tiếp thị", mktDesc: "HOUSELINK không sử dụng cookie tiếp thị. Nếu sau này sử dụng, chúng tôi sẽ cập nhật chính sách và chỉ bật khi bạn đồng ý.", notUsed: "Không sử dụng",
      save: "Lưu lựa chọn", acceptAll: "Đồng ý tất cả", rejectAll: "Từ chối tất cả",
      current: "Lựa chọn hiện tại", on: "Đo lường: bật", off: "Đo lường: tắt", id: "Mã đồng ý",
      saved: "Đã lưu lựa chọn cookie của bạn.", policy: "Chính sách bảo vệ dữ liệu cá nhân", rights: "Quyền của bạn",
      close: "Đóng", footer: "Cài đặt cookie"
    },
    en: {
      region: "Cookie consent",
      title: "Your privacy on HOUSELINK",
      text: "This website uses only the cookies it needs to work. Analytics cookies help us count visits in aggregate using Google Analytics and are turned on only if you accept. HOUSELINK does not use marketing cookies. You can change your choice at any time via “Cookie settings” in the footer. See our {policy}.",
      customize: "Customize", reject: "Reject all", accept: "Accept",
      panelTitle: "Cookie settings",
      intro: "Under Vietnam's Law on Personal Data Protection No. 91/2025/QH15, non-essential cookies are turned on only with your consent. Nothing is pre-selected, and silence is not consent. Your choice is stored in this browser for 12 months.",
      nec: "Necessary", necDesc: "Sign-in, security, remembering your language and your cookie choices. The website cannot function without them.", always: "Always on",
      ana: "Analytics", anaDesc: "Aggregate statistics on visits and the most viewed pages using Google Analytics, not linked to your identity.", anaMeta: "Provider: Google · Maximum duration 13 months",
      mkt: "Marketing", mktDesc: "HOUSELINK does not use marketing cookies. If we use them in future, we will update our policy and turn them on only with your consent.", notUsed: "Not used",
      save: "Save choices", acceptAll: "Accept all", rejectAll: "Reject all",
      current: "Current choice", on: "Analytics on", off: "Analytics off", id: "Consent ID",
      saved: "Your cookie choice has been saved.", policy: "Personal Data Protection Policy", rights: "Your rights",
      close: "Close", footer: "Cookie settings"
    },
    ja: {
      region: "Cookieの同意",
      title: "HOUSELINKはお客様のプライバシーを尊重します",
      text: "本ウェブサイトは、動作に必要なCookieのみを使用しています。測定Cookieは、Google Analyticsを用いてアクセス数を集計形式で把握するためのもので、お客様が同意した場合にのみ有効になります。HOUSELINKはマーケティングCookieを使用していません。選択内容はフッターの「Cookie設定」からいつでも変更できます。詳しくは{policy}をご覧ください。",
      customize: "カスタマイズ", reject: "すべて拒否", accept: "同意する",
      panelTitle: "Cookie設定",
      intro: "ベトナムの個人データ保護法（第91/2025/QH15号）に基づき、必須ではないCookieはお客様の同意がある場合にのみ有効になります。事前に選択された項目はなく、沈黙は同意とみなされません。選択内容はこのブラウザに12か月間保存されます。",
      nec: "必須", necDesc: "ログイン、セキュリティ、言語設定およびCookie選択の記憶に使用します。これがないとウェブサイトは機能しません。", always: "常にオン",
      ana: "測定", anaDesc: "Google Analyticsを用いた、アクセス数および閲覧数の多いページに関する集計形式の統計です。お客様の身元とは結び付けません。", anaMeta: "提供者：Google · 最長保存期間：13か月",
      mkt: "マーケティング", mktDesc: "HOUSELINKはマーケティングCookieを使用していません。将来使用する場合は、本方針を更新し、お客様が同意した場合にのみ有効にします。", notUsed: "使用しない",
      save: "選択を保存", acceptAll: "すべて同意", rejectAll: "すべて拒否",
      current: "現在の選択", on: "測定：オン", off: "測定：オフ", id: "同意ID",
      saved: "Cookieの選択を保存しました。", policy: "個人データ保護方針", rights: "お客様の権利",
      close: "閉じる", footer: "Cookie設定"
    },
    ko: {
      region: "쿠키 동의",
      title: "HOUSELINK는 귀하의 개인정보를 존중합니다",
      text: "이 웹사이트는 작동에 필요한 쿠키만 사용합니다. 측정 쿠키는 Google Analytics로 방문 수를 집계 형태로 파악하기 위한 것으로, 귀하가 동의한 경우에만 켜집니다. HOUSELINK는 마케팅 쿠키를 사용하지 않습니다. 페이지 하단의 “쿠키 설정”에서 언제든지 선택을 변경할 수 있습니다. 자세한 내용은 {policy}을 참조하십시오.",
      customize: "맞춤 설정", reject: "모두 거부", accept: "동의",
      panelTitle: "쿠키 설정",
      intro: "베트남 개인정보보호법(제91/2025/QH15호)에 따라 필수가 아닌 쿠키는 귀하의 동의가 있는 경우에만 켜집니다. 미리 선택된 항목은 없으며, 침묵은 동의로 간주되지 않습니다. 선택 사항은 이 브라우저에 12개월 동안 저장됩니다.",
      nec: "필수", necDesc: "로그인, 보안, 언어 및 쿠키 선택 사항 저장에 사용됩니다. 이 쿠키가 없으면 웹사이트가 작동하지 않습니다.", always: "항상 켜짐",
      ana: "측정", anaDesc: "Google Analytics를 이용한 방문 수 및 많이 조회된 페이지의 집계 통계로, 귀하의 신원과 연결되지 않습니다.", anaMeta: "제공자: Google · 최대 보관 기간 13개월",
      mkt: "마케팅", mktDesc: "HOUSELINK는 마케팅 쿠키를 사용하지 않습니다. 향후 사용하게 되는 경우 방침을 업데이트하고 귀하가 동의한 경우에만 켭니다.", notUsed: "사용하지 않음",
      save: "선택 저장", acceptAll: "모두 동의", rejectAll: "모두 거부",
      current: "현재 선택", on: "측정: 켜짐", off: "측정: 꺼짐", id: "동의 ID",
      saved: "쿠키 선택이 저장되었습니다.", policy: "개인정보보호방침", rights: "귀하의 권리",
      close: "닫기", footer: "쿠키 설정"
    },
    zh: {
      region: "Cookie同意",
      title: "HOUSELINK尊重您的隐私",
      text: "本网站仅使用网站运行所必需的Cookie。统计分析Cookie用于通过Google Analytics以汇总形式统计访问量，仅在您同意后开启。HOUSELINK不使用营销Cookie。您可随时通过页脚的“Cookie设置”更改选择。详情请参阅{policy}。",
      customize: "自定义", reject: "全部拒绝", accept: "同意",
      panelTitle: "Cookie设置",
      intro: "根据越南《个人数据保护法》（第91/2025/QH15号），非必要Cookie仅在您同意后开启。所有选项均未预先勾选，沉默不视为同意。您的选择将在此浏览器中保存12个月。",
      nec: "必要", necDesc: "用于登录、安全、记住您的语言及Cookie选择。缺少此类Cookie网站将无法运行。", always: "始终开启",
      ana: "统计分析", anaDesc: "使用Google Analytics以汇总形式统计访问量和热门页面，不与您的身份关联。", anaMeta: "提供方：Google · 最长保存期限13个月",
      mkt: "营销", mktDesc: "HOUSELINK不使用营销Cookie。如日后使用，我们将更新政策，并仅在您同意后开启。", notUsed: "不使用",
      save: "保存选择", acceptAll: "全部同意", rejectAll: "全部拒绝",
      current: "当前选择", on: "统计分析：开启", off: "统计分析：关闭", id: "同意编号",
      saved: "已保存您的Cookie选择。", policy: "个人数据保护政策", rights: "您的权利",
      close: "关闭", footer: "Cookie设置"
    }
  };
  var DATE_LOCALE = { vi: "vi-VN", en: "en-GB", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN" };

  function detectLang() {
    var seg = (location.pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
    if (T[seg]) return seg;
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("zh") === 0) return "zh";
    raw = raw.slice(0, 2);
    return T[raw] ? raw : "en";
  }
  var LANG = detectLang();
  var L = T[LANG];
  var PREFIX = LANG === "en" ? "" : "/" + LANG;
  var POLICY_URL = PREFIX + "/privacy/#s6";
  var RIGHTS_URL = PREFIX + "/privacy/#s11";

  /* ---------- LƯU TRỮ ---------- */
  function cookieDomain() {
    var h = location.hostname;
    return /(^|\.)houselink\.com\.vn$/.test(h) ? ".houselink.com.vn" : "";
  }
  function readState() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + CONFIG.COOKIE_NAME + "=([^;]*)"));
    if (!m) return null;
    try {
      var s = JSON.parse(decodeURIComponent(m[1]));
      if (!s || s.v !== CONFIG.POLICY_VERSION || typeof s.t !== "number") return null;
      if (Date.now() - s.t > CONFIG.MAX_AGE_DAYS * 864e5) return null;
      return s;
    } catch (e) { return null; }
  }
  function writeState(s) {
    var c = CONFIG.COOKIE_NAME + "=" + encodeURIComponent(JSON.stringify(s)) +
      "; Max-Age=" + CONFIG.MAX_AGE_DAYS * 86400 + "; Path=/; SameSite=Lax";
    var d = cookieDomain();
    if (d) c += "; Domain=" + d;
    if (location.protocol === "https:") c += "; Secure";
    document.cookie = c;
  }
  function newId() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", out = "", buf = new Uint8Array(8);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < 8; i++) out += a[buf[i] % a.length] + (i === 3 ? "-" : "");
    return out;
  }

  var state = readState();

  /* ---------- GOOGLE ANALYTICS VÀ SCRIPT BỊ CHẶN ---------- */
  var gaLoaded = false;
  function loadAnalytics() {
    if (CONFIG.GA_ID) {
      window["ga-disable-" + CONFIG.GA_ID] = false;
      if (!gaLoaded) {
        gaLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        window.gtag("js", new Date());
        window.gtag("config", CONFIG.GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
        var s = document.createElement("script");
        s.async = true;
        s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.GA_ID);
        document.head.appendChild(s);
      } else if (window.gtag) {
        window.gtag("consent", "update", { analytics_storage: "granted" });
      }
    }
    [].forEach.call(document.querySelectorAll('script[type="text/plain"][data-hl-consent="analytics"]'), function (old) {
      var s = document.createElement("script");
      [].forEach.call(old.attributes, function (a) {
        if (a.name !== "type" && a.name !== "data-src" && a.name !== "data-hl-consent") s.setAttribute(a.name, a.value);
      });
      if (old.getAttribute("data-src")) s.src = old.getAttribute("data-src");
      else s.text = old.text;
      old.parentNode.replaceChild(s, old);
    });
  }
  function stopAnalytics() {
    if (CONFIG.GA_ID) window["ga-disable-" + CONFIG.GA_ID] = true;
    if (window.gtag && gaLoaded) window.gtag("consent", "update", { analytics_storage: "denied" });
    var names = document.cookie.split("; ").map(function (c) { return c.split("=")[0]; })
      .filter(function (n) { return /^(_ga|_ga_.+|_gid|_gat.*)$/.test(n); });
    var host = location.hostname, domains = ["", host, "." + host];
    var parts = host.split(".");
    for (var i = 1; i < parts.length - 1; i++) domains.push("." + parts.slice(i).join("."));
    names.forEach(function (n) {
      domains.forEach(function (d) {
        document.cookie = n + "=; Max-Age=0; Path=/" + (d ? "; Domain=" + d : "");
      });
    });
  }

  /* ---------- GHI NHẬN LỰA CHỌN ---------- */
  function commit(analytics, action) {
    var prev = state;
    state = { v: CONFIG.POLICY_VERSION, id: prev ? prev.id : newId(), t: Date.now(), a: analytics ? 1 : 0, m: 0 };
    writeState(state);
    if (analytics) loadAnalytics(); else stopAnalytics();
    if (CONFIG.LOG_ENDPOINT) {
      var payload = JSON.stringify({ consent_id: state.id, policy_version: state.v, analytics: !!analytics, marketing: false,
        action: action, at: new Date(state.t).toISOString(), lang: LANG, page: location.pathname });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon(CONFIG.LOG_ENDPOINT, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
        else fetch(CONFIG.LOG_ENDPOINT, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
      } catch (e) { /* bỏ qua lỗi ghi log, lựa chọn vẫn có hiệu lực */ }
    }
    try { document.dispatchEvent(new CustomEvent("hl:consent-change", { detail: api.get() })); } catch (e) { }
    hideBanner();
    closePanel();
    toast(L.saved);
  }

  /* ---------- GIAO DIỆN ---------- */
  var CSS = [
    ".hlc,.hlc *{box-sizing:border-box}",
    ".hlc{font-family:var(--font-main,'Inter',system-ui,-apple-system,'Segoe UI',sans-serif);color:#0D1F2D;-webkit-font-smoothing:antialiased}",
    ".hlc-banner{position:fixed;left:0;right:0;bottom:0;z-index:9000;background:#fff;border-top:1px solid #DDE3E8;box-shadow:0 -10px 32px rgba(0,52,87,.14);transform:translateY(100%);transition:transform .32s cubic-bezier(.2,.8,.2,1)}",
    ".hlc-banner.is-in{transform:none}",
    ".hlc-banner-inner{max-width:1240px;margin:0 auto;padding:18px 28px;display:flex;align-items:center;gap:22px}",
    ".hlc-ic{flex:0 0 44px;height:44px;border-radius:12px;background:#EBF7EF;color:#2D8B48;display:flex;align-items:center;justify-content:center}",
    ".hlc-ic svg{width:22px;height:22px}",
    ".hlc-copy{flex:1 1 auto;min-width:0}",
    ".hlc-title{font-size:15px;font-weight:700;color:#00466E;margin:0 0 4px;line-height:1.35}",
    ".hlc-text{font-size:13px;line-height:1.6;color:#4A5A65;margin:0}",
    ".hlc a{color:#2D8B48;text-decoration:underline;text-underline-offset:2px;font-weight:600}",
    ".hlc a:hover{color:#00466E}",
    ".hlc-actions{flex:0 0 auto;display:flex;gap:10px;align-items:center}",
    ".hlc-btn{appearance:none;font:inherit;font-size:14px;font-weight:600;line-height:1.2;border-radius:8px;padding:11px 18px;min-height:44px;cursor:pointer;border:1.5px solid #00466E;white-space:nowrap;transition:background .15s,color .15s,border-color .15s}",
    ".hlc-btn--solid{background:#00466E;color:#fff}",
    ".hlc-btn--solid:hover{background:#003457;border-color:#003457}",
    ".hlc-btn--line{background:#fff;color:#00466E}",
    ".hlc-btn--line:hover{background:#F4F6F8}",
    ".hlc-actions .hlc-btn--solid{min-width:140px}",
    ".hlc-btn:focus-visible,.hlc-x:focus-visible,.hlc a:focus-visible,.hlc-sw input:focus-visible+span{outline:3px solid #3AAD5C;outline-offset:2px}",
    ".hlc-overlay{position:fixed;inset:0;z-index:9001;background:rgba(0,30,50,.55);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity .2s}",
    ".hlc-overlay.is-in{opacity:1}",
    ".hlc-panel{background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:calc(100vh - 48px);display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,30,50,.3);overflow:hidden}",
    ".hlc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 24px 14px;border-bottom:1px solid #EEF1F4}",
    ".hlc-head h2{font-size:19px;font-weight:700;color:#00466E;margin:0;line-height:1.3}",
    ".hlc-x{appearance:none;border:0;background:#F4F6F8;color:#00466E;width:36px;height:36px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:0 0 36px}",
    ".hlc-x:hover{background:#EEF1F4}",
    ".hlc-body{padding:16px 24px 8px;overflow:auto}",
    ".hlc-intro{font-size:13.5px;line-height:1.65;color:#4A5A65;margin:0 0 14px}",
    ".hlc-cat{border:1px solid #DDE3E8;border-radius:12px;padding:14px 16px;margin:0 0 10px}",
    ".hlc-cat-top{display:flex;align-items:center;justify-content:space-between;gap:12px}",
    ".hlc-cat h3{font-size:15px;font-weight:700;color:#00466E;margin:0}",
    ".hlc-cat p{font-size:13px;line-height:1.6;color:#4A5A65;margin:6px 0 0}",
    ".hlc-meta{font-size:12px!important;color:#7E8F9A!important}",
    ".hlc-pill{font-size:12px;font-weight:600;border-radius:999px;padding:4px 10px;white-space:nowrap}",
    ".hlc-pill--on{background:#EBF7EF;color:#1E7038}",
    ".hlc-pill--off{background:#EEF1F4;color:#4A5A65}",
    ".hlc-sw{position:relative;display:inline-flex;align-items:center;cursor:pointer;flex:0 0 auto}",
    ".hlc-sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}",
    ".hlc-sw span{width:46px;height:26px;border-radius:999px;background:#BEC8D0;position:relative;transition:background .15s}",
    ".hlc-sw span:after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .15s}",
    ".hlc-sw input:checked+span{background:#2D8B48}",
    ".hlc-sw input:checked+span:after{transform:translateX(20px)}",
    ".hlc-rec{font-size:12px;color:#7E8F9A;margin:10px 0 4px;line-height:1.6}",
    ".hlc-links{font-size:13px;margin:4px 0 8px;display:flex;flex-wrap:wrap;gap:6px 16px}",
    ".hlc-foot{display:flex;gap:10px;padding:14px 24px 20px;border-top:1px solid #EEF1F4;flex-wrap:wrap}",
    ".hlc-foot .hlc-btn{flex:1 1 0}",
    ".hlc-toast{position:fixed;left:50%;bottom:24px;z-index:9002;transform:translate(-50%,16px);background:#00466E;color:#fff;font-size:13.5px;font-weight:500;padding:11px 18px;border-radius:10px;box-shadow:0 10px 30px rgba(0,30,50,.25);opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;max-width:calc(100vw - 32px);text-align:center}",
    ".hlc-toast.is-in{opacity:1;transform:translate(-50%,0)}",
    "@media (max-width:900px){.hlc-banner-inner{flex-wrap:wrap;gap:14px;padding:16px 20px}.hlc-copy{flex:1 1 calc(100% - 70px)}.hlc-actions{flex:1 1 100%}.hlc-actions .hlc-btn{flex:1 1 0}}",
    "@media (max-width:560px){.hlc-banner-inner{padding:14px 16px calc(14px + env(safe-area-inset-bottom));gap:12px}.hlc-ic{display:none}.hlc-copy{flex-basis:100%}.hlc-title{font-size:14.5px}.hlc-text{font-size:12.5px}",
    ".hlc-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.hlc-actions .hlc-btn{padding:10px 8px;font-size:13.5px;white-space:normal}.hlc-actions .hlc-btn--line{grid-column:1/-1;order:3;border-color:transparent;min-height:36px;padding:6px;text-decoration:underline;text-underline-offset:3px}",
    ".hlc-overlay{padding:0;align-items:flex-end}.hlc-panel{max-width:none;border-radius:16px 16px 0 0;max-height:92vh}.hlc-head{padding:16px 16px 12px}.hlc-body{padding:14px 16px 6px}.hlc-foot{padding:12px 16px calc(16px + env(safe-area-inset-bottom));flex-direction:column}.hlc-foot .hlc-btn{flex:none;width:100%}}",
    "@media (prefers-reduced-motion:reduce){.hlc-banner,.hlc-overlay,.hlc-toast{transition:none}}",
    "@media print{.hlc-banner,.hlc-overlay,.hlc-toast{display:none!important}}"
  ].join("\n");

  var ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>';
  var ICON_X = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function policyLink() { return '<a href="' + POLICY_URL + '">' + esc(L.policy) + "</a>"; }

  var banner, overlay, toastEl, lastFocus, styleDone = false;

  function ensureStyle() {
    if (styleDone) return;
    styleDone = true;
    var st = document.createElement("style");
    st.id = "hlc-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function padBody() {
    if (!banner || !banner.classList.contains("is-in")) { document.body.style.paddingBottom = ""; return; }
    document.body.style.paddingBottom = banner.offsetHeight + "px";
  }

  function showBanner() {
    if (banner) return;
    ensureStyle();
    banner = document.createElement("section");
    banner.className = "hlc hlc-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", L.region);
    banner.setAttribute("lang", document.documentElement.getAttribute("lang") || LANG);
    banner.innerHTML =
      '<div class="hlc-banner-inner">' +
        '<div class="hlc-ic">' + ICON_SHIELD + "</div>" +
        '<div class="hlc-copy"><p class="hlc-title" id="hlc-title">' + esc(L.title) + '</p>' +
        '<p class="hlc-text">' + esc(L.text).replace("{policy}", policyLink()) + "</p></div>" +
        '<div class="hlc-actions">' +
          '<button type="button" class="hlc-btn hlc-btn--line" data-hlc="custom">' + esc(L.customize) + "</button>" +
          '<button type="button" class="hlc-btn hlc-btn--solid" data-hlc="reject">' + esc(L.reject) + "</button>" +
          '<button type="button" class="hlc-btn hlc-btn--solid" data-hlc="accept">' + esc(L.accept) + "</button>" +
        "</div>" +
      "</div>";
    // Đặt đầu <body> để người dùng bàn phím và trình đọc màn hình gặp banner trước
    document.body.insertBefore(banner, document.body.firstChild);
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-hlc]");
      if (!b) return;
      var act = b.getAttribute("data-hlc");
      if (act === "accept") commit(true, "accept_all_banner");
      else if (act === "reject") commit(false, "reject_all_banner");
      else openPanel(b);
    });
    var b = banner;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (b !== banner) return; b.classList.add("is-in"); padBody(); });
    });
    if (window.ResizeObserver) new ResizeObserver(padBody).observe(banner);
    else window.addEventListener("resize", padBody);
  }

  function hideBanner() {
    if (!banner) return;
    var b = banner;
    banner = null;
    b.classList.remove("is-in");
    document.body.style.paddingBottom = "";
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 350);
  }

  function fmtDate(t) {
    try { return new Date(t).toLocaleDateString(DATE_LOCALE[LANG], { year: "numeric", month: "2-digit", day: "2-digit" }); }
    catch (e) { return new Date(t).toISOString().slice(0, 10); }
  }

  function openPanel(opener) {
    if (overlay) { var f = overlay.querySelector("input,button"); if (f) f.focus(); return; }
    ensureStyle();
    lastFocus = opener && opener.focus ? opener : document.activeElement;
    var on = !!(state && state.a);
    overlay = document.createElement("div");
    overlay.className = "hlc hlc-overlay";
    overlay.innerHTML =
      '<div class="hlc-panel" role="dialog" aria-modal="true" aria-labelledby="hlc-ptitle" lang="' + esc(document.documentElement.getAttribute("lang") || LANG) + '">' +
        '<div class="hlc-head"><h2 id="hlc-ptitle">' + esc(L.panelTitle) + '</h2>' +
          '<button type="button" class="hlc-x" data-hlc="close" aria-label="' + esc(L.close) + '">' + ICON_X + "</button></div>" +
        '<div class="hlc-body">' +
          '<p class="hlc-intro">' + esc(L.intro) + "</p>" +
          '<div class="hlc-cat"><div class="hlc-cat-top"><h3>' + esc(L.nec) + '</h3><span class="hlc-pill hlc-pill--on">' + esc(L.always) + "</span></div>" +
            "<p>" + esc(L.necDesc) + "</p></div>" +
          '<div class="hlc-cat"><div class="hlc-cat-top"><h3 id="hlc-ana-l">' + esc(L.ana) + "</h3>" +
            '<label class="hlc-sw"><input type="checkbox" role="switch" id="hlc-ana" aria-labelledby="hlc-ana-l" aria-describedby="hlc-ana-d"' + (on ? " checked" : "") + "><span></span></label></div>" +
            '<p id="hlc-ana-d">' + esc(L.anaDesc) + '</p><p class="hlc-meta">' + esc(L.anaMeta) + "</p></div>" +
          '<div class="hlc-cat"><div class="hlc-cat-top"><h3>' + esc(L.mkt) + '</h3><span class="hlc-pill hlc-pill--off">' + esc(L.notUsed) + "</span></div>" +
            "<p>" + esc(L.mktDesc) + "</p></div>" +
          (state ? '<p class="hlc-rec">' + esc(L.current) + ": " + esc(state.a ? L.on : L.off) + " · " + esc(fmtDate(state.t)) + " · " + esc(L.id) + " " + esc(state.id) + "</p>" : "") +
          '<p class="hlc-links">' + policyLink() + '<a href="' + RIGHTS_URL + '">' + esc(L.rights) + "</a></p>" +
        "</div>" +
        '<div class="hlc-foot">' +
          '<button type="button" class="hlc-btn hlc-btn--solid" data-hlc="reject">' + esc(L.rejectAll) + "</button>" +
          '<button type="button" class="hlc-btn hlc-btn--line" data-hlc="save">' + esc(L.save) + "</button>" +
          '<button type="button" class="hlc-btn hlc-btn--solid" data-hlc="accept">' + esc(L.acceptAll) + "</button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { closePanel(); return; }
      var b = e.target.closest("[data-hlc]");
      if (!b) return;
      var act = b.getAttribute("data-hlc");
      if (act === "close") closePanel();
      else if (act === "accept") commit(true, "accept_all_settings");
      else if (act === "reject") commit(false, "reject_all_settings");
      else if (act === "save") commit(overlay.querySelector("#hlc-ana").checked, "save_settings");
    });
    overlay.addEventListener("keydown", trap);
    var o = overlay;
    requestAnimationFrame(function () {
      if (o !== overlay) return;
      o.classList.add("is-in");
      o.querySelector(".hlc-x").focus();
    });
  }

  function trap(e) {
    if (e.key === "Escape") { e.preventDefault(); closePanel(); return; }
    if (e.key !== "Tab") return;
    var f = [].filter.call(overlay.querySelectorAll("a[href],button,input"), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function closePanel() {
    if (!overlay) return;
    var o = overlay;
    overlay = null;
    document.documentElement.style.overflow = "";
    o.parentNode && o.parentNode.removeChild(o);
    var target = banner ? banner.querySelector('[data-hlc="custom"]') : lastFocus;
    if (target && target.focus && document.contains(target)) target.focus();
  }

  var toastTimer;
  function toast(msg) {
    ensureStyle();
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "hlc hlc-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("is-in");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-in"); }, 2800);
  }

  /* ---------- LIÊN KẾT "CÀI ĐẶT COOKIE" Ở CHÂN TRANG ---------- */
  // Nếu partials/footer-*.html chưa có liên kết, tự thêm vào .ftr-bottom-links sau khi footer được nạp.
  function ensureFooterLink() {
    var box = document.querySelector(".ftr-bottom-links");
    if (!box || box.querySelector("[data-hl-cookie-settings]")) return !!box;
    var a = document.createElement("a");
    a.href = POLICY_URL;
    a.setAttribute("data-hl-cookie-settings", "");
    a.textContent = L.footer;
    box.appendChild(a);
    return true;
  }
  function watchFooter() {
    if (ensureFooterLink()) return;
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function () { if (ensureFooterLink()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 15000);
  }

  /* ---------- API ---------- */
  var api = {
    open: function () { openPanel(document.activeElement); },
    get: function () {
      return state ? { version: state.v, id: state.id, date: new Date(state.t).toISOString(), necessary: true, analytics: !!state.a, marketing: false }
                   : { version: CONFIG.POLICY_VERSION, id: null, date: null, necessary: true, analytics: false, marketing: false };
    },
    has: function (cat) { return cat === "necessary" ? true : cat === "analytics" ? !!(state && state.a) : false; },
    acceptAll: function () { commit(true, "accept_all_api"); },
    rejectAll: function () { commit(false, "reject_all_api"); },
    reset: function () {
      document.cookie = CONFIG.COOKIE_NAME + "=; Max-Age=0; Path=/" + (cookieDomain() ? "; Domain=" + cookieDomain() : "");
      state = null; stopAnalytics(); showBanner();
    }
  };
  window.hlConsent = api;
  window.hlOpenCookieSettings = api.open;
  document.addEventListener("hl:open-cookie-settings", function () { api.open(); });
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-hl-cookie-settings]");
    if (!el) return;
    e.preventDefault();
    openPanel(el);
  });

  /* ---------- KHỞI ĐỘNG ---------- */
  function start() {
    watchFooter();
    if (state && state.a) loadAnalytics();
    if (!state && (window.top === window || CONFIG.SHOW_IN_IFRAME)) showBanner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
