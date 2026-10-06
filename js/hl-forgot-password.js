/**
 * Landing forgot-password flow (/forgot/ and /{lang}/forgot/).
 * Step 1: email → POST /api/users/forgot-password/request (emails a 6-digit code + reset link).
 * Step 2: code + new password → POST /api/users/forgot-password/reset.
 * Opening the emailed link (?email=…&code=…) jumps straight to step 2.
 * Step 1 validation lives in auth-locale-validation.js, which calls window.hlSubmitForgotAfterValidate.
 */
(function () {
  "use strict";

  var T = {
    en: {
      sending: "Sending…",
      sent: "Reset code sent to your email. Enter the 6-digit code below and choose a new password.",
      notFound: "No HOUSELINK account uses this email address.",
      network: "Could not reach the server. Please check your connection and try again.",
      failed: "Could not send the reset email. Please try again.",
      stepSub: "Enter the 6-digit code we emailed to {email} and choose a new password.",
      codeLabel: "Reset code",
      newPwLabel: "New password",
      confirmPwLabel: "Confirm new password",
      submit: "Reset password",
      saving: "Saving…",
      resend: "Resend code",
      codeInvalid: "Please enter the 6-digit code from the email.",
      passwordShort: "Password must be at least 8 characters.",
      passwordMismatch: "Passwords do not match.",
      wrongCode: "The reset code is incorrect.",
      expiredCode: "The reset code has expired. Please request a new one.",
      resetFailed: "Could not reset the password. Please try again.",
      done: "Your password has been reset. You can now sign in with the new password.",
      signIn: "Sign in",
    },
    vi: {
      sending: "Đang gửi…",
      sent: "Đã gửi mã đặt lại mật khẩu đến email của bạn. Nhập mã 6 số bên dưới và chọn mật khẩu mới.",
      notFound: "Không có tài khoản HOUSELINK nào dùng email này.",
      network: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      failed: "Không gửi được email đặt lại mật khẩu. Vui lòng thử lại.",
      stepSub: "Nhập mã 6 số đã gửi đến {email} và chọn mật khẩu mới.",
      codeLabel: "Mã đặt lại",
      newPwLabel: "Mật khẩu mới",
      confirmPwLabel: "Xác nhận mật khẩu mới",
      submit: "Đặt lại mật khẩu",
      saving: "Đang lưu…",
      resend: "Gửi lại mã",
      codeInvalid: "Vui lòng nhập mã 6 số trong email.",
      passwordShort: "Mật khẩu cần tối thiểu 8 ký tự.",
      passwordMismatch: "Mật khẩu xác nhận không khớp.",
      wrongCode: "Mã đặt lại không đúng.",
      expiredCode: "Mã đặt lại đã hết hạn. Vui lòng yêu cầu mã mới.",
      resetFailed: "Không đặt lại được mật khẩu. Vui lòng thử lại.",
      done: "Mật khẩu đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới.",
      signIn: "Đăng nhập",
    },
    ja: {
      sending: "送信中…",
      sent: "リセットコードをメールで送信しました。下に6桁のコードを入力し、新しいパスワードを設定してください。",
      notFound: "このメールアドレスのHOUSELINKアカウントは見つかりません。",
      network: "サーバーに接続できません。接続を確認して再度お試しください。",
      failed: "リセットメールを送信できませんでした。再度お試しください。",
      stepSub: "{email} に送信した6桁のコードを入力し、新しいパスワードを設定してください。",
      codeLabel: "リセットコード",
      newPwLabel: "新しいパスワード",
      confirmPwLabel: "新しいパスワード（確認）",
      submit: "パスワードを再設定",
      saving: "保存中…",
      resend: "コードを再送信",
      codeInvalid: "メールに記載された6桁のコードを入力してください。",
      passwordShort: "パスワードは8文字以上にしてください。",
      passwordMismatch: "パスワードが一致しません。",
      wrongCode: "リセットコードが正しくありません。",
      expiredCode: "リセットコードの有効期限が切れました。新しいコードをリクエストしてください。",
      resetFailed: "パスワードを再設定できませんでした。再度お試しください。",
      done: "パスワードを再設定しました。新しいパスワードでサインインできます。",
      signIn: "サインイン",
    },
    ko: {
      sending: "전송 중…",
      sent: "재설정 코드를 이메일로 보냈습니다. 아래에 6자리 코드를 입력하고 새 비밀번호를 설정하세요.",
      notFound: "이 이메일을 사용하는 HOUSELINK 계정이 없습니다.",
      network: "서버에 연결할 수 없습니다. 연결을 확인한 후 다시 시도하세요.",
      failed: "재설정 이메일을 보내지 못했습니다. 다시 시도하세요.",
      stepSub: "{email}(으)로 보낸 6자리 코드를 입력하고 새 비밀번호를 설정하세요.",
      codeLabel: "재설정 코드",
      newPwLabel: "새 비밀번호",
      confirmPwLabel: "새 비밀번호 확인",
      submit: "비밀번호 재설정",
      saving: "저장 중…",
      resend: "코드 다시 보내기",
      codeInvalid: "이메일의 6자리 코드를 입력하세요.",
      passwordShort: "비밀번호는 8자 이상이어야 합니다.",
      passwordMismatch: "비밀번호가 일치하지 않습니다.",
      wrongCode: "재설정 코드가 올바르지 않습니다.",
      expiredCode: "재설정 코드가 만료되었습니다. 새 코드를 요청하세요.",
      resetFailed: "비밀번호를 재설정하지 못했습니다. 다시 시도하세요.",
      done: "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인할 수 있습니다.",
      signIn: "로그인",
    },
    zh: {
      sending: "发送中…",
      sent: "重置验证码已发送到您的邮箱。请在下方输入 6 位验证码并设置新密码。",
      notFound: "没有使用此邮箱的 HOUSELINK 账户。",
      network: "无法连接服务器，请检查网络后重试。",
      failed: "无法发送重置邮件，请重试。",
      stepSub: "请输入发送至 {email} 的 6 位验证码并设置新密码。",
      codeLabel: "重置验证码",
      newPwLabel: "新密码",
      confirmPwLabel: "确认新密码",
      submit: "重置密码",
      saving: "保存中…",
      resend: "重新发送验证码",
      codeInvalid: "请输入邮件中的 6 位验证码。",
      passwordShort: "密码至少需要 8 个字符。",
      passwordMismatch: "两次输入的密码不一致。",
      wrongCode: "重置验证码不正确。",
      expiredCode: "重置验证码已过期，请重新获取。",
      resetFailed: "无法重置密码，请重试。",
      done: "密码已重置，您现在可以使用新密码登录。",
      signIn: "登录",
    },
  };

  function langKey() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("zh") === 0) return "zh";
    var two = raw.slice(0, 2);
    return T[two] ? two : "en";
  }

  function msg(k) {
    var L = T[langKey()] || T.en;
    return L[k] || T.en[k];
  }

  function apiBase() {
    if (typeof window.HL_resolveAuthEnv === "function") {
      return String(window.HL_resolveAuthEnv().apiBase || "").replace(/\/+$/, "");
    }
    if (window.HL_AUTH_ENV && window.HL_AUTH_ENV.apiBase) {
      return String(window.HL_AUTH_ENV.apiBase).replace(/\/+$/, "");
    }
    return "http://localhost:3001";
  }

  function loginUrl() {
    var lang = langKey();
    return lang === "en" ? "/login/" : "/" + lang + "/login/";
  }

  function injectStyles() {
    if (document.getElementById("hl-forgot-styles")) return;
    var style = document.createElement("style");
    style.id = "hl-forgot-styles";
    style.textContent =
      ".hl-auth-form .hl-auth-client-msg.hl-msg-ok{color:#166534;background:#EBF7EF;" +
      "border:1px solid rgba(45,139,72,.3);border-left:4px solid #2D8B48;box-shadow:none;}" +
      ".hl-auth-form .hl-auth-client-msg.hl-msg-ok::before{content:'\\2713';background:#2D8B48;box-shadow:none;}" +
      ".hl-forgot-resend{display:block;width:100%;margin-top:10px;background:none;border:none;color:var(--green,#2D8B48);" +
      "font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}" +
      ".hl-forgot-resend:hover{color:var(--navy,#00466E);}" +
      ".btn-auth[disabled]{opacity:.65;cursor:wait;}";
    document.head.appendChild(style);
  }

  function msgBox(form) {
    return form.querySelector(".hl-auth-client-msg");
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".hl-field-error").forEach(function (n) {
      n.classList.remove("hl-field-error");
    });
  }

  function show(form, text, kind, fieldEl) {
    var box = msgBox(form);
    if (!box) return;
    box.textContent = text;
    box.classList.toggle("hl-msg-ok", kind === "ok");
    box.classList.add("is-visible");
    if (fieldEl) {
      var g = fieldEl.closest && fieldEl.closest(".form-group");
      (g || fieldEl).classList.add("hl-field-error");
      fieldEl.focus();
    }
  }

  function clear(form) {
    var box = msgBox(form);
    if (box) {
      box.classList.remove("is-visible", "hl-msg-ok");
      box.textContent = "";
    }
    clearFieldErrors(form);
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = busyLabel;
      button.disabled = true;
    } else {
      if (button.dataset.label) button.textContent = button.dataset.label;
      button.disabled = false;
    }
  }

  function postJson(path, body) {
    return fetch(apiBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (json) {
          return { status: res.status, json: json || {} };
        });
    });
  }

  function requestCode(email) {
    return postJson("/api/users/forgot-password/request", { email: email });
  }

  function field(id, label, type, attrs) {
    var group = document.createElement("div");
    group.className = "form-group";
    var lab = document.createElement("label");
    lab.className = "form-label";
    lab.setAttribute("for", id);
    lab.textContent = label;
    var input = document.createElement("input");
    input.className = "form-input";
    input.id = id;
    input.type = type;
    Object.keys(attrs || {}).forEach(function (k) {
      input.setAttribute(k, attrs[k]);
    });
    group.appendChild(lab);
    group.appendChild(input);
    return { group: group, input: input };
  }

  /** Replaces the email form with the code + new password form. */
  function showResetStep(emailForm, email, prefillCode, notice) {
    var existing = document.querySelector("form.hl-forgot-reset-form");
    if (existing) existing.remove();

    var sub = document.querySelector(".auth-sub");
    if (sub) sub.textContent = msg("stepSub").replace("{email}", email);
    var info = document.querySelector(".info-box");
    if (info) info.style.display = "none";

    var form = document.createElement("form");
    form.className = "hl-auth-form hl-forgot-reset-form";
    form.noValidate = true;

    var box = document.createElement("div");
    box.className = "hl-auth-client-msg";
    box.setAttribute("role", "alert");
    box.setAttribute("aria-live", "polite");
    form.appendChild(box);

    var code = field("hl-forgot-code", msg("codeLabel"), "text", {
      inputmode: "numeric",
      autocomplete: "one-time-code",
      maxlength: "6",
      placeholder: "123456",
    });
    var pw = field("hl-forgot-pw", msg("newPwLabel"), "password", { autocomplete: "new-password" });
    var pw2 = field("hl-forgot-pw2", msg("confirmPwLabel"), "password", { autocomplete: "new-password" });
    if (prefillCode) code.input.value = prefillCode;
    form.appendChild(code.group);
    form.appendChild(pw.group);
    form.appendChild(pw2.group);

    var submit = document.createElement("button");
    submit.className = "btn-auth";
    submit.type = "submit";
    submit.textContent = msg("submit");
    form.appendChild(submit);

    var resend = document.createElement("button");
    resend.type = "button";
    resend.className = "hl-forgot-resend";
    resend.textContent = msg("resend");
    form.appendChild(resend);

    emailForm.style.display = "none";
    emailForm.parentNode.insertBefore(form, emailForm.nextSibling);

    if (notice) show(form, notice, "ok");
    (prefillCode ? pw.input : code.input).focus();

    form.querySelectorAll("input").forEach(function (el) {
      el.addEventListener("input", function () {
        clearFieldErrors(form);
      });
    });

    resend.addEventListener("click", function () {
      clear(form);
      resend.disabled = true;
      requestCode(email)
        .then(function (r) {
          if (r.status === 200 && r.json.success) show(form, msg("sent"), "ok");
          else if (r.status === 404) show(form, msg("notFound"));
          else show(form, msg("failed"));
        })
        .catch(function () {
          show(form, msg("network"));
        })
        .then(function () {
          resend.disabled = false;
        });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clear(form);
      var codeVal = String(code.input.value || "").replace(/\s+/g, "");
      if (!/^\d{6}$/.test(codeVal)) return show(form, msg("codeInvalid"), null, code.input);
      if (!pw.input.value || pw.input.value.length < 8) return show(form, msg("passwordShort"), null, pw.input);
      if (pw.input.value !== pw2.input.value) return show(form, msg("passwordMismatch"), null, pw2.input);

      setBusy(submit, true, msg("saving"));
      postJson("/api/users/forgot-password/reset", {
        email: email,
        code: codeVal,
        newPassword: pw.input.value,
      })
        .then(function (r) {
          if (r.status === 200 && r.json.success) {
            [code.group, pw.group, pw2.group, submit, resend].forEach(function (n) {
              n.remove();
            });
            show(form, msg("done"), "ok");
            var link = document.createElement("a");
            link.className = "btn-auth";
            link.href = loginUrl();
            link.style.display = "block";
            link.style.textAlign = "center";
            link.textContent = msg("signIn");
            form.appendChild(link);
            return;
          }
          setBusy(submit, false);
          var err = String(r.json.error || "");
          if (r.status === 404) show(form, msg("notFound"));
          else if (/expired/i.test(err)) show(form, msg("expiredCode"), null, code.input);
          else if (/invalid reset code/i.test(err)) show(form, msg("wrongCode"), null, code.input);
          else show(form, msg("resetFailed"));
        })
        .catch(function () {
          setBusy(submit, false);
          show(form, msg("network"));
        });
    });
  }

  window.hlSubmitForgotAfterValidate = function (form, email) {
    var button = form.querySelector('button[type="submit"]');
    setBusy(button, true, msg("sending"));
    requestCode(email)
      .then(function (r) {
        setBusy(button, false);
        if (r.status === 200 && r.json.success) {
          showResetStep(form, email, "", msg("sent"));
          return;
        }
        var emailIn = form.querySelector('input[type="email"]');
        if (r.status === 404) show(form, msg("notFound"), null, emailIn);
        else show(form, msg("failed"));
      })
      .catch(function () {
        setBusy(button, false);
        show(form, msg("network"));
      });
  };

  function boot() {
    injectStyles();
    var params = new URLSearchParams(window.location.search);
    var email = String(params.get("email") || "").trim().toLowerCase();
    var code = String(params.get("code") || "").trim();
    var emailForm = document.querySelector("form.hl-auth-form");
    if (!emailForm || !email) return;
    var emailIn = emailForm.querySelector('input[type="email"]');
    if (emailIn) emailIn.value = email;
    if (/^\d{6}$/.test(code)) showResetStep(emailForm, email, code, "");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
