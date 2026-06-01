(function () {
  "use strict";

  var AUTH_ENV =
    typeof window !== "undefined" && typeof window.HL_resolveAuthEnv === "function"
      ? window.HL_resolveAuthEnv()
      : { apiBase: "http://localhost:3001", appBase: "http://localhost:3333" };
  var API_BASE = AUTH_ENV.apiBase;
  var APP_BASE = AUTH_ENV.appBase;

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
      registerNet: "Network error. Please try again.",
      registerBadResponse: "Invalid response from server.",
      registerGeneric: "Something went wrong. Please try again.",
      emailExists: "This email is already registered.",
      phoneExists: "This phone number is already registered.",
    },
    vi: {
      registerNet: "Lỗi mạng. Vui lòng thử lại.",
      registerBadResponse: "Phản hồi từ máy chủ không hợp lệ.",
      registerGeneric: "Đã có lỗi. Vui lòng thử lại.",
      emailExists: "Email này đã được đăng ký.",
      phoneExists: "Số điện thoại này đã được đăng ký.",
    },
    zh: {
      registerNet: "网络错误，请重试。",
      registerBadResponse: "服务器响应无效。",
      registerGeneric: "发生错误，请重试。",
      emailExists: "该邮箱已注册。",
      phoneExists: "该手机号已注册。",
    },
    ko: {
      registerNet: "네트워크 오류. 다시 시도하세요.",
      registerBadResponse: "서버 응답이 올바르지 않습니다.",
      registerGeneric: "문제가 발생했습니다. 다시 시도하세요.",
      emailExists: "이미 등록된 이메일입니다.",
      phoneExists: "이미 등록된 전화번호입니다.",
    },
    ja: {
      registerNet: "ネットワークエラー。再試行してください。",
      registerBadResponse: "サーバーの応答が無効です。",
      registerGeneric: "問題が発生しました。もう一度お試しください。",
      emailExists: "このメールアドレスは既に登録されています。",
      phoneExists: "この電話番号は既に登録されています。",
    },
  };

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

  function splitFullName(raw) {
    var s = String(raw || "").trim();
    if (!s) return { firstName: "", lastName: "" };
    var parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  function localizeRegisterError(status, apiErrorRaw) {
    var msg =
      typeof apiErrorRaw === "string" ? apiErrorRaw.trim() : String(apiErrorRaw || "");
    if (msg === "Email existed") return t("emailExists");
    if (msg === "Phone existed") return t("phoneExists");
    if (msg) return msg;
    return t("registerGeneric");
  }

  function redirectWithAuthCode(code) {
    var lang = detectLang();
    var url = APP_BASE + "/?authCode=" + encodeURIComponent(code);
    if (lang !== "en") {
      url += "&lang=" + encodeURIComponent(lang);
    }
    window.location.href = url;
  }

  function fetchAuthCodeAfterRegister(form, email, password) {
    return fetch(API_BASE + "/api/users/auth-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (
          res.ok &&
          res.data &&
          res.data.success &&
          res.data.data &&
          res.data.data.authCode
        ) {
          redirectWithAuthCode(res.data.data.authCode);
          return;
        }
        var err =
          (res.data && res.data.error) ||
          localizeRegisterError(res.status, res.data && res.data.error);
        showApiError(form, err || t("registerBadResponse"));
      })
      .catch(function () {
        showApiError(form, t("registerNet"));
      });
  }

  window.hlSubmitRegisterAfterValidate = function (form, payload) {
    hideApiError(form);
    var btn = form.querySelector('.btn-auth[type="submit"]');
    var prev = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "…";
    }

    var body = {
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      phoneNumber: payload.phoneNumber,
    };
    if (payload.lastName) body.lastName = payload.lastName;

    fetch(API_BASE + "/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = prev;
        }

        if (!res.ok || !res.data) {
          showApiError(
            form,
            localizeRegisterError(res.status, res.data && res.data.error)
          );
          return;
        }
        if (!res.data.success) {
          showApiError(
            form,
            localizeRegisterError(res.status, res.data.error)
          );
          return;
        }

        fetchAuthCodeAfterRegister(form, payload.email, payload.password);
      })
      .catch(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = prev;
        }
        showApiError(form, t("registerNet"));
      });
  };
})();
