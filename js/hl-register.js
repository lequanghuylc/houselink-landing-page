/**
 * Register page: POST /api/users/register then auth-code handoff (same as sign-in).
 */
(function () {
  "use strict";

  var API_BASE = "http://localhost:3001";
  var APP_BASE = "http://localhost:3333";

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
      registerGeneric: "Could not create account. Please try again.",
      registerEmailExists: "This email is already registered.",
      registerPhoneExists: "This phone number is already registered.",
      registerBadResponse: "Invalid response from server.",
      networkError: "Network error. Please try again."
    },
    vi: {
      registerGeneric: "Không thể tạo tài khoản. Vui lòng thử lại.",
      registerEmailExists: "Email này đã được đăng ký.",
      registerPhoneExists: "Số điện thoại này đã được sử dụng.",
      registerBadResponse: "Phản hồi từ máy chủ không hợp lệ.",
      networkError: "Lỗi mạng. Vui lòng thử lại."
    },
    zh: {
      registerGeneric: "无法创建账户，请重试。",
      registerEmailExists: "该邮箱已注册。",
      registerPhoneExists: "该手机号已被使用。",
      registerBadResponse: "服务器响应无效。",
      networkError: "网络错误，请重试。"
    },
    ko: {
      registerGeneric: "계정을 만들 수 없습니다. 다시 시도하세요.",
      registerEmailExists: "이미 등록된 이메일입니다.",
      registerPhoneExists: "이미 사용 중인 전화번호입니다.",
      registerBadResponse: "서버 응답이 올바르지 않습니다.",
      networkError: "네트워크 오류. 다시 시도하세요."
    },
    ja: {
      registerGeneric: "アカウントを作成できませんでした。もう一度お試しください。",
      registerEmailExists: "このメールアドレスは既に登録されています。",
      registerPhoneExists: "この電話番号は既に使用されています。",
      registerBadResponse: "サーバーの応答が無効です。",
      networkError: "ネットワークエラー。再試行してください。"
    }
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

  function splitFullName(full) {
    var s = String(full || "").trim();
    if (!s) return { firstName: "", lastName: "" };
    var i = s.indexOf(" ");
    if (i < 0) return { firstName: s, lastName: "" };
    return { firstName: s.slice(0, i), lastName: s.slice(i + 1).trim() };
  }

  function localizeRegisterError(apiError) {
    var msg = typeof apiError === "string" ? apiError.trim() : String(apiError || "");
    if (/email/i.test(msg)) return t("registerEmailExists");
    if (/phone/i.test(msg)) return t("registerPhoneExists");
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

  function authCodeHandoff(form, email, password) {
    return fetch(API_BASE + "/api/users/auth-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (r) {
      return r.json().then(function (data) {
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  function applyAuthCodeResponse(form, res) {
    if (!res.ok || !res.data || !res.data.success || !res.data.data) {
      var err =
        res.data && res.data.error
          ? String(res.data.error)
          : t("registerBadResponse");
      showApiError(form, err);
      return;
    }
    var d = res.data.data;
    if (d.requiresTotp === true) {
      var loginPath =
        detectLang() === "vi"
          ? "/vi/login/"
          : detectLang() === "zh"
            ? "/zh/login/"
            : detectLang() === "ko"
              ? "/ko/login/"
              : detectLang() === "ja"
                ? "/ja/login/"
                : "/login/";
      window.location.href = loginPath;
      return;
    }
    if (!d.authCode) {
      showApiError(form, t("registerBadResponse"));
      return;
    }
    redirectWithAuthCode(d.authCode);
  }

  window.hlSubmitRegisterAfterValidate = function (form, payload) {
    var btn = form.querySelector('.btn-auth[type="submit"]');
    var prev = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "…";
    }

    var names = splitFullName(payload.fullName);
    var body = {
      email: payload.email,
      password: payload.password,
      firstName: names.firstName,
      lastName: names.lastName,
      phoneNumber: payload.phoneNumber
    };

    fetch(API_BASE + "/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        if (!res.data || res.data.success !== true) {
          if (btn) {
            btn.disabled = false;
            btn.textContent = prev;
          }
          showApiError(
            form,
            localizeRegisterError(res.data && res.data.error)
          );
          return;
        }

        return authCodeHandoff(form, payload.email, payload.password).then(function (handoff) {
          if (btn) {
            btn.disabled = false;
            btn.textContent = prev;
          }
          applyAuthCodeResponse(form, handoff);
        });
      })
      .catch(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = prev;
        }
        showApiError(form, t("networkError"));
      });
  };
})();
