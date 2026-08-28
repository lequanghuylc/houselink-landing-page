(function () {
  "use strict";

  var AUTH_ENV =
    typeof window !== "undefined" && typeof window.HL_resolveAuthEnv === "function"
      ? window.HL_resolveAuthEnv()
      : { apiBase: "http://localhost:3001", appBase: "http://localhost:3333" };
  var API_BASE = AUTH_ENV.apiBase;
  var APP_BASE = AUTH_ENV.appBase;

  /** Email for POST /auth-code/verify-totp - from login form or Google credential payload. */
  var handoffEmail = null;
  /** Prevents double POST /auth-code (double-click / Enter+click) which overwrites the handoff code. */
  var loginSubmitInFlight = false;

  function detectLang() {
    var p = location.pathname;
    if (p.indexOf("/vi/") >= 0) return "vi";
    if (p.indexOf("/zh/") >= 0) return "zh";
    if (p.indexOf("/ko/") >= 0) return "ko";
    if (p.indexOf("/ja/") >= 0) return "ja";
    return "en";
  }

  var STR = {
    en: {
      googleBtn: "Continue with Google",
      googleCfgTitle:
        "Set meta google-signin-client_id on this page and GOOGLE_CLIENT_ID on the API server to enable Google sign-in.",
      totpTitle: "Two-factor authentication",
      totpSub: "Enter the 6-digit code from your authenticator app.",
      totpPlaceholder: "000000",
      verify: "Verify & continue",
      back: "← Back to sign in",
      totpEmpty: "Enter the 6-digit code.",
      totpBad: "Invalid code. Try again.",
      totpMany: "Too many invalid codes. Please sign in again.",
      totpNet: "Network error. Please try again.",
      loginLockout: "Too many failed sign-in attempts. Try again in 5 minutes.",
      loginInvalidCredentials: "Invalid credentials",
      loginBadResponse: "Invalid response from server.",
      loginGenericError: "Something went wrong. Please try again."
    },
    vi: {
      googleBtn: "Tiếp tục với Google",
      googleCfgTitle:
        "Thêm google-signin-client_id vào thẻ meta trang và GOOGLE_CLIENT_ID trên server để bật đăng nhập Google.",
      totpTitle: "Xác thực hai lớp",
      totpSub: "Nhập mã 6 số từ ứng dụng authenticator.",
      totpPlaceholder: "000000",
      verify: "Xác nhận và tiếp tục",
      back: "← Quay lại đăng nhập",
      totpEmpty: "Vui lòng nhập mã 6 số.",
      totpBad: "Mã không đúng. Thử lại.",
      totpMany: "Nhập sai quá nhiều lần. Vui lòng đăng nhập lại.",
      totpNet: "Lỗi mạng. Thử lại.",
      loginLockout: "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút.",
      loginInvalidCredentials: "Email hoặc mật khẩu không đúng.",
      loginBadResponse: "Phản hồi từ máy chủ không hợp lệ.",
      loginGenericError: "Đã có lỗi. Vui lòng thử lại."
    },
    zh: {
      totpTitle: "双因素认证",
      totpSub: "请输入身份验证应用中的 6 位数字。",
      totpPlaceholder: "000000",
      verify: "验证并继续",
      back: "← 返回登录",
      totpEmpty: "请输入 6 位数字。",
      totpBad: "验证码错误，请重试。",
      totpMany: "错误次数过多，请重新登录。",
      totpNet: "网络错误，请重试。",
      loginLockout: "登录失败次数过多。请 5 分钟后再试。",
      loginInvalidCredentials: "邮箱或密码不正确。",
      loginBadResponse: "服务器响应无效。",
      loginGenericError: "发生错误，请重试。"
    },
    ko: {
      googleBtn: "Google로 계속하기",
      googleCfgTitle: "페이지 meta의 google-signin-client_id와 서버 GOOGLE_CLIENT_ID를 설정하세요.",
      totpTitle: "2단계 인증",
      totpSub: "인증 앱의 6자리 코드를 입력하세요.",
      totpPlaceholder: "000000",
      verify: "확인 후 계속",
      back: "← 로그인으로 돌아가기",
      totpEmpty: "6자리 코드를 입력하세요.",
      totpBad: "코드가 올바르지 않습니다.",
      totpMany: "시도 횟수 초과. 다시 로그인하세요.",
      totpNet: "네트워크 오류. 다시 시도하세요.",
      loginLockout: "로그인 실패가 너무 많습니다. 5분 후 다시 시도하세요.",
      loginInvalidCredentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
      loginBadResponse: "서버 응답이 올바르지 않습니다.",
      loginGenericError: "문제가 발생했습니다. 다시 시도하세요."
    },
    ja: {
      googleBtn: "Googleで続ける",
      googleCfgTitle:
        "ページの meta google-signin-client_id とサーバーの GOOGLE_CLIENT_ID を設定してください。",
      totpTitle: "二要素認証",
      totpSub: "認証アプリの6桁のコードを入力してください。",
      totpPlaceholder: "000000",
      verify: "確認して続行",
      back: "← サインインに戻る",
      totpEmpty: "6桁のコードを入力してください。",
      totpBad: "コードが正しくありません。",
      totpMany: "試行回数が上限に達しました。再度サインインしてください。",
      totpNet: "ネットワークエラー。再試行してください。",
      loginLockout:
        "サインインの失敗が多すぎます。5分経ってから再度お試しください。",
      loginInvalidCredentials:
        "メールアドレスまたはパスワードが正しくありません。",
      loginBadResponse: "サーバーの応答が無効です。",
      loginGenericError: "問題が発生しました。もう一度お試しください。"
    }
  };

  function parseGoogleIdTokenEmail(credential) {
    try {
      if (!credential || typeof credential !== "string") return null;
      var parts = credential.split(".");
      if (parts.length < 2) return null;
      var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var payload = JSON.parse(atob(b64));
      return payload.email ? String(payload.email).trim().toLowerCase() : null;
    } catch (e) {
      return null;
    }
  }

  function localizeLoginApiMessage(status, apiErrorRaw) {
    var msg =
      typeof apiErrorRaw === "string" ? apiErrorRaw.trim() : String(apiErrorRaw || "");
    if (status === 429 && msg === "Too many failed sign-in attempts. Try again in 5 minutes.") {
      return t("loginLockout");
    }
    if (status === 401 && msg === "Invalid credentials") {
      return t("loginInvalidCredentials");
    }
    if (msg) return msg;
    return t("loginGenericError");
  }

  function t(key) {
    var L = STR[detectLang()] || STR.en;
    return L[key] || STR.en[key] || key;
  }

  function showApiError(form, text) {
    var box = form.querySelector(".hl-auth-client-msg");
    if (!box) {
      window.alert(text);
      return;
    }
    box.textContent = text;
    box.classList.add("is-visible");
  }

  function hideApiError(form) {
    var box = form.querySelector(".hl-auth-client-msg");
    if (!box) return;
    box.textContent = "";
    box.classList.remove("is-visible");
  }

  /**
   * Open-redirect-safe in-app path from `?next=` (relative `/…` only).
   * Mirrors `safeInternalNextPath` in the Next app (`landingUrls.ts`).
   */
  function safeInternalNextPath(raw) {
    if (raw == null) return null;
    var value = String(raw).trim();
    if (!value) return null;
    try {
      if (value.indexOf("%") >= 0) {
        value = decodeURIComponent(value);
      }
    } catch (e) {
      return null;
    }
    value = String(value).trim();
    if (value.charAt(0) !== "/" || value.indexOf("//") === 0) return null;
    if (value.indexOf("\\") >= 0) return null;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
    if (/[\x00-\x1f\x7f]/.test(value)) return null;
    return value;
  }

  function getSafeNextFromLoginQuery() {
    try {
      return safeInternalNextPath(
        new URLSearchParams(window.location.search).get("next")
      );
    } catch (e) {
      return null;
    }
  }

  /**
   * Default locale is English - paths use /login/ with no /en/ prefix.
   * Only append &lang= for non-English handoffs so the app URL stays clean for en.
   * Honors safe `?next=` so deep links survive the authCode handoff.
   */
  function redirectWithAuthCode(code) {
    var lang = detectLang();
    var nextPath = getSafeNextFromLoginQuery() || "/dashboard";
    var url;
    try {
      var appOrigin = new URL(APP_BASE).origin;
      var target = new URL(nextPath, APP_BASE);
      if (target.origin !== appOrigin) {
        target = new URL("/dashboard", APP_BASE);
      }
      target.searchParams.set("authCode", code);
      if (lang !== "en") {
        target.searchParams.set("lang", lang);
      }
      url = target.toString();
    } catch (e) {
      url = APP_BASE + "/dashboard?authCode=" + encodeURIComponent(code);
      if (lang !== "en") {
        url += "&lang=" + encodeURIComponent(lang);
      }
    }
    window.location.href = url;
  }

  function getGoogleClientId() {
    var m = document.querySelector('meta[name="google-signin-client_id"]');
    return m && m.getAttribute("content") ? String(m.getAttribute("content")).trim() : "";
  }

  function setGoogleRowVisible(show) {
    var d = show ? "" : "none";
    var divider = document.getElementById("hl-google-divider");
    var host = document.getElementById("hl-google-signin-host");
    if (divider) divider.style.display = d;
    if (host) host.style.display = d;
  }

  /** Shared: response from POST /auth-code or POST /auth-google (same `data` shape). */
  function applyHandoffResponse(form, d) {
    if (d.requiresTotp === true) {
      var panel = ensureTotpPanel(form);
      wireTotpPanel(form, panel);
      showTotpStep(form, panel);
      return;
    }
    handoffEmail = null;
    redirectWithAuthCode(d.authCode);
  }

  /** @param opts.googleCredential optional - TOTP after Google (email không nằm trong JSON API). */
  function handleAuthCodeApiJson(res, form, opts) {
    if (!res.ok || !res.data) {
      var apiErr = res.data && res.data.error;
      var err0 =
        apiErr != null
          ? localizeLoginApiMessage(res.status, apiErr)
          : t("loginGenericError");
      showApiError(form, err0);
      return;
    }
    if (!res.data.success || !res.data.data) {
      showApiError(
        form,
        localizeLoginApiMessage(res.status, res.data && res.data.error)
      );
      return;
    }
    var d = res.data.data;
    if (d.requiresTotp === true) {
      var ein = form.querySelector('input[type="email"]');
      handoffEmail = ein ? String(ein.value).trim().toLowerCase() : null;
      if (!handoffEmail && opts && opts.googleCredential) {
        handoffEmail = parseGoogleIdTokenEmail(opts.googleCredential);
      }
      applyHandoffResponse(form, d);
      return;
    }
    if (!d.authCode) {
      showApiError(form, t("loginBadResponse"));
      return;
    }
    applyHandoffResponse(form, d);
  }

  var GOOGLE_BTN_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>' +
    '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>' +
    '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>' +
    '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>' +
    "</svg>";

  function initGoogleSignInButton() {
    var clientId = getGoogleClientId();
    var host = document.getElementById("hl-google-signin-host");
    var divider = document.getElementById("hl-google-divider");
    if (!host) return;
    if (divider) divider.style.display = "";

    if (!clientId) {
      host.style.display = "";
      var L = STR[detectLang()] || STR.en;
      var label = L.googleBtn || STR.en.googleBtn;
      var hint = L.googleCfgTitle || STR.en.googleCfgTitle;
      host.innerHTML =
        '<button type="button" class="btn-google" id="hl-google-fallback-btn" title="' +
        hint.replace(/"/g, "&quot;") +
        '">' +
        GOOGLE_BTN_SVG +
        " " +
        label +
        "</button>";
      var fb = document.getElementById("hl-google-fallback-btn");
      var formEl = document.querySelector(".hl-auth-form");
      if (fb) {
        fb.addEventListener("click", function () {
          if (formEl) showApiError(formEl, hint);
          else window.alert(hint);
        });
      }
      return;
    }

    host.innerHTML = "";

    function loadGsi(cb) {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        cb();
        return;
      }
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = cb;
      document.head.appendChild(s);
    }

    loadGsi(function () {
      var form = document.querySelector(".hl-auth-form");
      if (!form || !window.google || !window.google.accounts || !window.google.accounts.id) return;
      if (host.dataset.hlGsiReady === "1") return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: function (resp) {
          if (!resp || !resp.credential) return;
          fetch(API_BASE + "/api/users/auth-google", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ credential: resp.credential })
          })
            .then(function (r) {
              return r.json().then(function (data) {
                return { ok: r.ok, status: r.status, data: data };
              });
            })
            .then(function (res) {
              handleAuthCodeApiJson(res, form, { googleCredential: resp.credential });
            })
            .catch(function () {
              showApiError(form, t("totpNet"));
            });
        }
      });

      window.setTimeout(function () {
        var w = host.offsetWidth || host.parentElement.offsetWidth;
        if (!w || w < 240) w = 400;
        window.google.accounts.id.renderButton(host, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: Math.min(Math.floor(w), 400),
          locale: detectLang()
        });
        host.dataset.hlGsiReady = "1";
      }, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGoogleSignInButton);
  } else {
    initGoogleSignInButton();
  }

  function injectHlTotpCellStyles() {
    if (document.getElementById("hl-totp-cell-styles")) return;
    var style = document.createElement("style");
    style.id = "hl-totp-cell-styles";
    style.textContent =
      ".hl-totp-cells-wrap{display:flex;flex-wrap:nowrap;justify-content:center;gap:10px;margin:4px 0 20px;}" +
      ".hl-totp-cell{width:52px;height:52px;box-sizing:border-box;margin:0;padding:0;" +
      "text-align:center;font-size:22px;font-weight:700;line-height:48px;letter-spacing:0;" +
      "font-family:Inter,system-ui,-apple-system,sans-serif;color:#0D1F2D;" +
      "border:2px solid #DDE3E8;border-radius:9px;background:#fff;outline:none;" +
      "caret-color:#00466E;-webkit-appearance:none;appearance:none;}" +
      ".hl-totp-cell:focus{border-color:#2D8B48;box-shadow:0 0 0 3px rgba(45,139,72,.12);}" +
      ".hl-totp-cell:disabled{opacity:.55;cursor:not-allowed;background:#F4F6F8;color:#7E8F9A;}";
    document.head.appendChild(style);
  }

  function totpCellEl(i) {
    return document.getElementById("hl-totp-d" + i);
  }

  function getTotpDigitsFromCells() {
    var out = "";
    for (var i = 0; i < 6; i++) {
      var el = totpCellEl(i);
      var ch = (el && el.value) ? String(el.value).replace(/\D/g, "").slice(-1) : "";
      out += ch;
    }
    return out;
  }

  function clearTotpCells() {
    for (var i = 0; i < 6; i++) {
      var el = totpCellEl(i);
      if (el) el.value = "";
    }
  }

  function focusTotpCell(i) {
    var el = totpCellEl(i);
    if (el) {
      el.focus();
      try {
        el.select();
      } catch (e) {}
    }
  }

  function setTotpCellsDisabled(disabled) {
    for (var i = 0; i < 6; i++) {
      var el = totpCellEl(i);
      if (el) el.disabled = !!disabled;
    }
  }

  function ensureTotpPanel(form) {
    var existing = document.getElementById("hl-totp-panel");
    if (existing) return existing;
    injectHlTotpCellStyles();

    var panel = document.createElement("div");
    panel.id = "hl-totp-panel";
    panel.setAttribute("style", "display:none;margin-top:8px;");
    var cellsHtml =
      '<div class="hl-totp-cells-wrap" role="group" aria-labelledby="hl-totp-title">';
    for (var c = 0; c < 6; c++) {
      cellsHtml +=
        '<input type="text" class="hl-totp-cell" id="hl-totp-d' +
        c +
        '" maxlength="1" inputmode="numeric" autocomplete="' +
        (c === 0 ? "one-time-code" : "off") +
        '" aria-label="Digit ' +
        (c + 1) +
        ' of 6">';
    }
    cellsHtml += "</div>";

    panel.innerHTML =
      '<div class="auth-top" style="margin-bottom:20px;">' +
      '<h2 class="auth-title" id="hl-totp-title"></h2>' +
      '<p class="auth-sub" id="hl-totp-sub"></p></div>' +
      '<div class="form-group" style="margin-bottom:6px;">' +
      cellsHtml +
      "</div>" +
      '<button type="button" class="btn-auth" id="hl-totp-submit"></button>' +
      '<p style="margin-top:16px;text-align:center;">' +
      '<button type="button" id="hl-totp-back" style="background:none;border:none;color:#2D8B48;font-weight:600;cursor:pointer;font-size:13px;font-family:inherit;"></button>' +
      "</p>" +
      '<div class="hl-auth-client-msg hl-totp-msg" role="alert" aria-live="polite" style="display:none;margin-top:16px;"></div>';

    form.parentNode.insertBefore(panel, form.nextSibling);

    document.getElementById("hl-totp-title").textContent = t("totpTitle");
    document.getElementById("hl-totp-sub").textContent = t("totpSub");
    document.getElementById("hl-totp-submit").textContent = t("verify");
    document.getElementById("hl-totp-back").textContent = t("back");

    return panel;
  }

  function showLoginStep(form, panel) {
    handoffEmail = null;
    loginSubmitInFlight = false;
    if (panel) panel.style.display = "none";
    var top = document.querySelector(".auth-box > .auth-top");
    if (top) top.style.display = "";
    form.style.display = "";
    setGoogleRowVisible(true);
  }

  function showTotpStep(form, panel) {
    hideApiError(form);
    var top = document.querySelector(".auth-box > .auth-top");
    if (top) top.style.display = "none";
    form.style.display = "none";
    setGoogleRowVisible(false);
    panel.style.display = "block";
    var totpMsg = panel.querySelector(".hl-totp-msg");
    if (totpMsg) {
      totpMsg.textContent = "";
      totpMsg.style.display = "none";
    }
    clearTotpCells();
    setTotpCellsDisabled(false);
    window.setTimeout(function () {
      focusTotpCell(0);
    }, 50);
  }

  function showTotpError(panel, text) {
    var totpMsg = panel.querySelector(".hl-totp-msg");
    if (!totpMsg) {
      window.alert(text);
      return;
    }
    totpMsg.textContent = text;
    totpMsg.style.display = "block";
    totpMsg.classList.add("is-visible");
  }

  function hideTotpError(panel) {
    var totpMsg = panel.querySelector(".hl-totp-msg");
    if (!totpMsg) return;
    totpMsg.textContent = "";
    totpMsg.style.display = "none";
    totpMsg.classList.remove("is-visible");
  }

  /** Clear credentials when returning via Back so nothing sensitive stays on screen. */
  function clearHlAuthFormSensitiveFields(form) {
    var els = form.querySelectorAll("input, textarea, select");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var tag = el.tagName;
      if (tag === "TEXTAREA") {
        el.value = "";
        continue;
      }
      if (tag === "SELECT") {
        el.selectedIndex = 0;
        continue;
      }
      if (tag !== "INPUT") continue;
      var typ = String(el.type || "").toLowerCase();
      if (typ === "submit" || typ === "button" || typ === "reset" || typ === "hidden") continue;
      if (typ === "checkbox" || typ === "radio") {
        el.checked = false;
        continue;
      }
      el.value = "";
      if (el.id === "pw-login" && el.type === "text") {
        el.type = "password";
        var wrap = el.closest ? el.closest(".input-wrap") : null;
        var eye = wrap && wrap.querySelector(".input-eye");
        if (eye) eye.textContent = "👁";
      }
    }
  }

  function resetLoginUiToPasswordStep() {
    var form = document.querySelector(".hl-auth-form");
    if (!form) return;
    var panel = document.getElementById("hl-totp-panel");
    showLoginStep(form, panel || null);
    hideApiError(form);
    clearHlAuthFormSensitiveFields(form);
  }

  function shouldResetLoginUiOnPageShow(ev) {
    if (ev && ev.persisted) return true;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      return !!(nav && nav.type === "back_forward");
    } catch (err) {
      return false;
    }
  }

  window.addEventListener("pageshow", function (ev) {
    if (!shouldResetLoginUiOnPageShow(ev)) return;
    resetLoginUiToPasswordStep();
  });

  function wireTotpPanel(form, panel) {
    if (panel.dataset.hlWired === "1") return;
    panel.dataset.hlWired = "1";

    var submitBtn = document.getElementById("hl-totp-submit");
    var backBtn = document.getElementById("hl-totp-back");

    function onCellChange(idx, el) {
      var raw = (el.value || "").replace(/\D/g, "");
      if (raw.length > 1) {
        for (var j = 0; j < 6; j++) {
          var cell = totpCellEl(j);
          if (cell) cell.value = raw[j] || "";
        }
        var focusAt = Math.min(raw.length, 5);
        window.setTimeout(function () {
          focusTotpCell(focusAt);
        }, 0);
        return;
      }
      el.value = raw.slice(-1);
      if (raw && idx < 5) {
        window.setTimeout(function () {
          focusTotpCell(idx + 1);
        }, 0);
      }
    }

    function onCellKeyDown(idx, el, e) {
      if (e.key !== "Backspace") return;
      if (el.value) return;
      if (idx === 0) return;
      e.preventDefault();
      var prev = totpCellEl(idx - 1);
      if (prev) prev.value = "";
      window.setTimeout(function () {
        focusTotpCell(idx - 1);
      }, 0);
    }

    /** Paste full code (e.g. "123456" or "123 456") into six cells. */
    function applyPastedOtpDigits(text) {
      var raw = String(text || "").replace(/\D/g, "").slice(0, 6);
      for (var j = 0; j < 6; j++) {
        var cell = totpCellEl(j);
        if (cell) cell.value = raw[j] ? raw[j] : "";
      }
      hideTotpError(panel);
      var focusIdx = raw.length >= 6 ? 5 : Math.max(0, raw.length);
      window.setTimeout(function () {
        focusTotpCell(focusIdx);
      }, 0);
    }

    var cellsWrap = panel.querySelector(".hl-totp-cells-wrap");
    if (cellsWrap) {
      cellsWrap.addEventListener(
        "paste",
        function (e) {
          var cd = e.clipboardData || (typeof window !== "undefined" && window.clipboardData);
          var data = cd && cd.getData ? cd.getData("text/plain") : "";
          if (!data || !String(data).trim()) return;
          e.preventDefault();
          e.stopPropagation();
          applyPastedOtpDigits(data);
        },
        true
      );
    }

    for (var i = 0; i < 6; i++) {
      (function (idx) {
        var el = totpCellEl(idx);
        if (!el) return;
        el.addEventListener("paste", function (e) {
          var cd = e.clipboardData || (typeof window !== "undefined" && window.clipboardData);
          var data = cd && cd.getData ? cd.getData("text/plain") : "";
          var digits = String(data || "").replace(/\D/g, "");
          if (digits.length >= 2) {
            e.preventDefault();
            applyPastedOtpDigits(data);
          }
        });
        el.addEventListener("input", function () {
          onCellChange(idx, el);
        });
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            doVerify();
            return;
          }
          onCellKeyDown(idx, el, e);
        });
        el.addEventListener("focus", function () {
          try {
            el.select();
          } catch (err) {}
        });
      })(i);
    }

    backBtn.addEventListener("click", function () {
      showLoginStep(form, panel);
    });

    function doVerify() {
      var emailNorm = handoffEmail;
      if (!emailNorm) {
        var ein = document.querySelector('.hl-auth-form input[type="email"]');
        emailNorm = ein ? String(ein.value).trim().toLowerCase() : "";
      }
      if (!emailNorm) {
        showTotpError(panel, t("totpBad"));
        return;
      }
      var digits = getTotpDigitsFromCells();
      if (digits.length !== 6) {
        showTotpError(panel, t("totpEmpty"));
        return;
      }
      hideTotpError(panel);
      var prev = submitBtn.textContent;
      submitBtn.disabled = true;
      setTotpCellsDisabled(true);
      submitBtn.textContent = "…";

      fetch(API_BASE + "/api/users/auth-code/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: emailNorm, code: digits })
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, status: r.status, data: data };
          });
        })
        .then(function (res) {
          submitBtn.disabled = false;
          submitBtn.textContent = prev;
          setTotpCellsDisabled(false);

          if (res.ok && res.data && res.data.success && res.data.data && res.data.data.authCode) {
            redirectWithAuthCode(res.data.data.authCode);
            return;
          }

          var err =
            (res.data && res.data.error) ||
            (res.status === 429 ? t("totpMany") : t("totpBad"));
          if (res.status === 429) {
            showTotpError(panel, err);
            showLoginStep(form, panel);
            showApiError(form, err);
            return;
          }
          showTotpError(panel, err);
          clearTotpCells();
          window.setTimeout(function () {
            focusTotpCell(0);
          }, 0);
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = prev;
          setTotpCellsDisabled(false);
          showTotpError(panel, t("totpNet"));
        });
    }

    submitBtn.addEventListener("click", doVerify);
  }

  requestAnimationFrame(function () {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (nav && nav.type === "back_forward") {
        resetLoginUiToPasswordStep();
      }
    } catch (e) {}
  });

  window.hlSubmitLoginAfterValidate = function (form, email, password) {
    if (loginSubmitInFlight) return;
    loginSubmitInFlight = true;

    var btn = form.querySelector('.btn-auth[type="submit"]');
    var prev = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "…";
    }

    fetch(API_BASE + "/api/users/auth-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        var d = res && res.data && res.data.data;
        var willRedirect =
          res &&
          res.ok &&
          res.data &&
          res.data.success &&
          d &&
          d.requiresTotp !== true &&
          d.authCode;
        if (willRedirect) {
          // Keep button disabled; navigation is about to leave this page.
          handleAuthCodeApiJson(res, form);
          return;
        }

        loginSubmitInFlight = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = prev;
        }
        handleAuthCodeApiJson(res, form);
      })
      .catch(function () {
        loginSubmitInFlight = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = prev;
        }
        showApiError(form, t("totpNet"));
      });
  };
})();
