/**
 * Localized form validation (replaces browser HTML5 bubbles that follow UI locale / English).
 * Auth: <form class="hl-auth-form" novalidate> with optional .hl-auth-client-msg inside.
 * Contact: <form class="hl-contact-form" novalidate> with the same message div class.
 * Newsletter: <form class="hl-newsletter-form" novalidate> - single email field.
 * Event registration: <form class="hl-event-reg-form" novalidate> - reg-name, reg-title, reg-company, reg-sector, reg-email, reg-consent; optional window.hlEventRegOnValid(form) after pass.
 */
(function () {
  "use strict";

  function injectValidationStyles() {
    if (document.getElementById("hl-auth-validation-styles")) return;
    var style = document.createElement("style");
    style.id = "hl-auth-validation-styles";
    style.textContent =
      "@keyframes hl-auth-msg-in{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}" +
      ".hl-auth-form .hl-auth-client-msg{display:none;position:relative;margin:0 0 20px;padding:14px 16px 14px 52px;" +
      "border-radius:11px;font-size:13.5px;font-weight:500;line-height:1.55;color:#9A3412;" +
      "background:linear-gradient(165deg,#FFFBF5 0%,#FFF7ED 55%,#FFEDD5 100%);" +
      "border:1px solid #FDBA74;border-left:4px solid #EA580C;" +
      "box-shadow:0 4px 14px rgba(154,52,18,.08),0 1px 0 rgba(255,255,255,.6) inset;}" +
      ".hl-auth-form .hl-auth-client-msg.is-visible{display:block;animation:hl-auth-msg-in .28s ease-out;}" +
      ".hl-auth-form .hl-auth-client-msg::before{content:'!';position:absolute;left:14px;top:50%;margin-top:-14px;" +
      "width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#F97316;" +
      "color:#fff;font-weight:800;font-size:15px;font-family:system-ui,-apple-system,sans-serif;" +
      "box-shadow:0 2px 6px rgba(234,88,12,.35);}" +
      ".hl-auth-form .form-group.hl-field-error .form-input," +
      ".hl-auth-form .form-group.hl-field-error select.form-input{border-color:#F97316!important;" +
      "box-shadow:0 0 0 3px rgba(249,115,22,.14)!important;}" +
      ".hl-auth-form .form-group.hl-field-error .form-label{color:#C2410C;}" +
      ".hl-auth-form label.check-label.hl-field-error{color:#C2410C;}" +
      ".hl-contact-form .hl-auth-client-msg{display:none;position:relative;margin:0 0 20px;padding:14px 16px 14px 52px;" +
      "border-radius:11px;font-size:13.5px;font-weight:500;line-height:1.55;color:#9A3412;" +
      "background:linear-gradient(165deg,#FFFBF5 0%,#FFF7ED 55%,#FFEDD5 100%);" +
      "border:1px solid #FDBA74;border-left:4px solid #EA580C;" +
      "box-shadow:0 4px 14px rgba(154,52,18,.08),0 1px 0 rgba(255,255,255,.6) inset;}" +
      ".hl-contact-form .hl-auth-client-msg.is-visible{display:block;animation:hl-auth-msg-in .28s ease-out;}" +
      ".hl-contact-form .hl-auth-client-msg::before{content:'!';position:absolute;left:14px;top:50%;margin-top:-14px;" +
      "width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#F97316;" +
      "color:#fff;font-weight:800;font-size:15px;font-family:system-ui,-apple-system,sans-serif;" +
      "box-shadow:0 2px 6px rgba(234,88,12,.35);}" +
      ".hl-contact-form .form-group.hl-field-error input," +
      ".hl-contact-form .form-group.hl-field-error select," +
      ".hl-contact-form .form-group.hl-field-error textarea{border-color:#F97316!important;" +
      "box-shadow:0 0 0 3px rgba(249,115,22,.14)!important;}" +
      ".hl-contact-form .form-group.hl-field-error label{color:#C2410C;}" +
      ".hl-newsletter-form .hl-auth-client-msg{display:none;position:relative;margin:0 auto 16px;padding:14px 16px 14px 52px;" +
      "border-radius:11px;font-size:13.5px;font-weight:500;line-height:1.55;color:#9A3412;max-width:520px;" +
      "background:linear-gradient(165deg,#FFFBF5 0%,#FFF7ED 55%,#FFEDD5 100%);" +
      "border:1px solid #FDBA74;border-left:4px solid #EA580C;" +
      "box-shadow:0 4px 14px rgba(154,52,18,.08),0 1px 0 rgba(255,255,255,.6) inset;}" +
      ".hl-newsletter-form .hl-auth-client-msg.is-visible{display:block;animation:hl-auth-msg-in .28s ease-out;}" +
      ".hl-newsletter-form .hl-auth-client-msg::before{content:'!';position:absolute;left:14px;top:50%;margin-top:-14px;" +
      "width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#F97316;" +
      "color:#fff;font-weight:800;font-size:15px;font-family:system-ui,-apple-system,sans-serif;" +
      "box-shadow:0 2px 6px rgba(234,88,12,.35);}" +
      ".hl-newsletter-form .hl-auth-client-msg.hl-msg-ok::before{content:'';display:none;}" +
      ".hl-newsletter-form input.hl-field-error{outline:none!important;border:2px solid #F97316!important;" +
      "box-shadow:0 0 0 3px rgba(249,115,22,.14)!important;}" +
      ".hl-event-reg-form .hl-auth-client-msg{display:none;position:relative;margin:0 0 20px;padding:14px 16px 14px 52px;" +
      "border-radius:11px;font-size:13.5px;font-weight:500;line-height:1.55;color:#9A3412;" +
      "background:linear-gradient(165deg,#FFFBF5 0%,#FFF7ED 55%,#FFEDD5 100%);" +
      "border:1px solid #FDBA74;border-left:4px solid #EA580C;" +
      "box-shadow:0 4px 14px rgba(154,52,18,.08),0 1px 0 rgba(255,255,255,.6) inset;}" +
      ".hl-event-reg-form .hl-auth-client-msg.is-visible{display:block;animation:hl-auth-msg-in .28s ease-out;}" +
      ".hl-event-reg-form .hl-auth-client-msg::before{content:'!';position:absolute;left:14px;top:50%;margin-top:-14px;" +
      "width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#F97316;" +
      "color:#fff;font-weight:800;font-size:15px;font-family:system-ui,-apple-system,sans-serif;" +
      "box-shadow:0 2px 6px rgba(234,88,12,.35);}" +
      ".hl-event-reg-form input.hl-field-error,.hl-event-reg-form select.hl-field-error,.hl-event-reg-form textarea.hl-field-error{" +
      "border-color:#F97316!important;box-shadow:0 0 0 3px rgba(249,115,22,.14)!important;}" +
      ".hl-event-reg-form input[type=\"checkbox\"].hl-field-error{outline:2px solid #F97316;outline-offset:3px;border-radius:4px;}";
    document.head.appendChild(style);
  }

  var T = {
    en: {
      emailEmpty: "Please enter your email address.",
      emailInvalid: "Please enter a valid email address.",
      passwordEmpty: "Please enter your password.",
      passwordShort: "Password must be at least 8 characters.",
      passwordMismatch: "Passwords do not match.",
      termsRequired: "Please agree to the Terms of Service and Privacy Policy.",
      nameEmpty: "Please enter your full name.",
      companyEmpty: "Please enter your company name.",
      roleEmpty: "Please select your role.",
      contactMessageEmpty: "Please describe your request or question.",
      eventRegNameEmpty: "Please enter your full name.",
      eventRegTitleEmpty: "Please enter your job title.",
      eventRegCompanyEmpty: "Please enter your company or organisation name.",
      eventRegSectorEmpty: "Please select a sector.",
      eventRegConsentRequired: "Please agree to receive confirmation emails and the privacy terms.",
      phoneEmpty: "Please enter your phone number.",
      registerNotReady:
        "Registration is not available on this page. Please refresh and try again.",
      loginNotReady:
        "Sign-in is not ready on this page. Please refresh and try again.",
    },
    vi: {
      emailEmpty: "Vui lòng nhập địa chỉ email.",
      emailInvalid: "Vui lòng nhập địa chỉ email hợp lệ.",
      passwordEmpty: "Vui lòng nhập mật khẩu.",
      passwordShort: "Mật khẩu cần tối thiểu 8 ký tự.",
      passwordMismatch: "Mật khẩu xác nhận không khớp.",
      termsRequired: "Vui lòng đồng ý với điều khoản sử dụng và chính sách bảo mật.",
      nameEmpty: "Vui lòng nhập họ và tên.",
      companyEmpty: "Vui lòng nhập tên công ty.",
      roleEmpty: "Vui lòng chọn vai trò.",
      contactMessageEmpty: "Vui lòng mô tả yêu cầu hoặc câu hỏi của bạn.",
      eventRegNameEmpty: "Vui lòng nhập họ và tên.",
      eventRegTitleEmpty: "Vui lòng nhập chức vụ.",
      eventRegCompanyEmpty: "Vui lòng nhập tên công ty / tổ chức.",
      eventRegSectorEmpty: "Vui lòng chọn lĩnh vực.",
      eventRegConsentRequired: "Vui lòng đồng ý nhận email xác nhận và điều khoản bảo mật.",
      phoneEmpty: "Vui lòng nhập số điện thoại.",
      registerNotReady:
        "Đăng ký chưa sẵn sàng trên trang này. Vui lòng tải lại trang và thử lại.",
      loginNotReady:
        "Đăng nhập chưa sẵn sàng trên trang này. Vui lòng tải lại trang và thử lại.",
    },
    ja: {
      emailEmpty: "メールアドレスを入力してください。",
      emailInvalid: "有効なメールアドレスを入力してください。",
      passwordEmpty: "パスワードを入力してください。",
      passwordShort: "パスワードは8文字以上にしてください。",
      passwordMismatch: "パスワードが一致しません。",
      termsRequired: "利用規約とプライバシーポリシーに同意してください。",
      nameEmpty: "氏名を入力してください。",
      companyEmpty: "会社名を入力してください。",
      roleEmpty: "役割を選択してください。",
      contactMessageEmpty: "ご相談内容やご質問をご記入ください。",
      eventRegNameEmpty: "氏名を入力してください。",
      eventRegTitleEmpty: "役職を入力してください。",
      eventRegCompanyEmpty: "会社名・団体名を入力してください。",
      eventRegSectorEmpty: "業種・セクターを選択してください。",
      eventRegConsentRequired: "確認メールの受信とプライバシー条項に同意してください。",
      phoneEmpty: "電話番号を入力してください。",
      registerNotReady:
        "このページでは登録を利用できません。再読み込みしてからお試しください。",
      loginNotReady:
        "このページではサインインを利用できません。再読み込みしてからお試しください。",
    },
    ko: {
      emailEmpty: "이메일을 입력해 주세요.",
      emailInvalid: "유효한 이메일 주소를 입력해 주세요.",
      passwordEmpty: "비밀번호를 입력해 주세요.",
      passwordShort: "비밀번호는 8자 이상이어야 합니다.",
      passwordMismatch: "비밀번호가 일치하지 않습니다.",
      termsRequired: "이용약관 및 개인정보처리방침에 동의해 주세요.",
      nameEmpty: "이름을 입력해 주세요.",
      companyEmpty: "회사명을 입력해 주세요.",
      roleEmpty: "역할을 선택해 주세요.",
      contactMessageEmpty: "문의 내용이나 질문을 입력해 주세요.",
      eventRegNameEmpty: "이름을 입력해 주세요.",
      eventRegTitleEmpty: "직함을 입력해 주세요.",
      eventRegCompanyEmpty: "회사 또는 기관명을 입력해 주세요.",
      eventRegSectorEmpty: "분야를 선택해 주세요.",
      eventRegConsentRequired: "확인 이메일 수신 및 개인정보 관련 동의에 체크해 주세요.",
      phoneEmpty: "전화번호를 입력하세요.",
      registerNotReady:
        "이 페이지에서 등록을 사용할 수 없습니다. 새로고침 후 다시 시도하세요.",
      loginNotReady:
        "이 페이지에서 로그인을 사용할 수 없습니다. 새로고침 후 다시 시도하세요.",
    },
    zh: {
      emailEmpty: "请输入电子邮箱地址。",
      emailInvalid: "请输入有效的电子邮箱地址。",
      passwordEmpty: "请输入密码。",
      passwordShort: "密码至少需要 8 个字符。",
      passwordMismatch: "两次输入的密码不一致。",
      termsRequired: "请同意服务条款与隐私政策。",
      nameEmpty: "请输入姓名。",
      companyEmpty: "请输入公司名称。",
      roleEmpty: "请选择角色。",
      contactMessageEmpty: "请简要描述您的需求或问题。",
      eventRegNameEmpty: "请输入姓名。",
      eventRegTitleEmpty: "请输入职务。",
      eventRegCompanyEmpty: "请输入公司或机构名称。",
      eventRegSectorEmpty: "请选择所属领域。",
      eventRegConsentRequired: "请同意接收确认邮件及隐私相关条款。",
      phoneEmpty: "请输入电话号码。",
      registerNotReady: "此页面暂无法注册，请刷新页面后重试。",
      loginNotReady: "此页面暂无法登录，请刷新页面后重试。",
    },
  };

  function langKey() {
    var raw = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (raw.indexOf("zh") === 0) return "zh";
    var two = raw.slice(0, 2);
    if (T[two]) return two;
    return "en";
  }

  function msg(k) {
    var L = T[langKey()] || T.en;
    return L[k] || T.en[k];
  }

  function validEmail(s) {
    if (!s || !String(s).trim()) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
  }

  function showMsg(form, text, fieldEl) {
    var box = form.querySelector(".hl-auth-client-msg");
    if (!box) return;
    box.textContent = text;
    box.classList.add("is-visible");
    if (fieldEl) {
      var g = fieldEl.closest && fieldEl.closest(".form-group");
      if (g) g.classList.add("hl-field-error");
      else fieldEl.classList.add("hl-field-error");
      var lab = fieldEl.closest && fieldEl.closest("label.check-label");
      if (lab) lab.classList.add("hl-field-error");
    }
  }

  function clearMsg(form) {
    var box = form.querySelector(".hl-auth-client-msg");
    if (box) {
      box.classList.remove("is-visible");
      box.textContent = "";
    }
    form.querySelectorAll(".hl-field-error").forEach(function (n) {
      n.classList.remove("hl-field-error");
    });
  }

  function wireForm(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearMsg(form);

      var pwLogin = form.querySelector("#pw-login");
      var pwReg = form.querySelector("#pw-reg");
      var emailIn = form.querySelector('input[type="email"]');

      if (pwLogin) {
        if (!emailIn || !emailIn.value.trim()) {
          showMsg(form, msg("emailEmpty"), emailIn);
          emailIn && emailIn.focus();
          return;
        }
        if (!validEmail(emailIn.value)) {
          showMsg(form, msg("emailInvalid"), emailIn);
          emailIn.focus();
          return;
        }
        if (!pwLogin.value) {
          showMsg(form, msg("passwordEmpty"), pwLogin);
          pwLogin.focus();
          return;
        }
        if (typeof window.hlSubmitLoginAfterValidate === "function") {
          window.hlSubmitLoginAfterValidate(form, emailIn.value.trim(), pwLogin.value);
          return;
        }
        showMsg(form, msg("loginNotReady"));
        return;
      }

      if (pwReg) {
        var nameIn = form.querySelector('input[type="text"][autocomplete="name"]');
        var phoneIn = form.querySelector('input[type="tel"]');
        var orgIn = form.querySelector('input[type="text"][autocomplete="organization"]');
        var roleSel = form.querySelector("select.form-select, select.form-input");
        var pwConf = form.querySelector("#pw-confirm, #pw-conf");
        var chk = form.querySelector("label.check-label input[type=\"checkbox\"]");

        if (nameIn && !nameIn.value.trim()) {
          showMsg(form, msg("nameEmpty"), nameIn);
          nameIn.focus();
          return;
        }
        if (phoneIn && !phoneIn.value.trim()) {
          showMsg(form, msg("phoneEmpty"), phoneIn);
          phoneIn.focus();
          return;
        }
        if (orgIn && !orgIn.value.trim()) {
          showMsg(form, msg("companyEmpty"), orgIn);
          orgIn.focus();
          return;
        }
        if (roleSel && !roleSel.value) {
          showMsg(form, msg("roleEmpty"), roleSel);
          roleSel.focus();
          return;
        }
        if (!emailIn || !emailIn.value.trim()) {
          showMsg(form, msg("emailEmpty"), emailIn);
          emailIn && emailIn.focus();
          return;
        }
        if (!validEmail(emailIn.value)) {
          showMsg(form, msg("emailInvalid"), emailIn);
          emailIn.focus();
          return;
        }
        if (!pwReg.value || pwReg.value.length < 8) {
          showMsg(form, msg("passwordShort"), pwReg);
          pwReg.focus();
          return;
        }
        if (pwConf && pwReg.value !== pwConf.value) {
          showMsg(form, msg("passwordMismatch"), pwConf);
          pwConf.focus();
          return;
        }
        if (chk && !chk.checked) {
          showMsg(form, msg("termsRequired"), chk);
          chk.focus();
          return;
        }
        if (typeof window.hlSubmitRegisterAfterValidate === "function") {
          var names = (function (raw) {
            var s = String(raw || "").trim();
            if (!s) return { firstName: "", lastName: "" };
            var parts = s.split(/\s+/).filter(Boolean);
            if (parts.length === 1) return { firstName: parts[0], lastName: "" };
            return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
          })(nameIn ? nameIn.value : "");
          window.hlSubmitRegisterAfterValidate(form, {
            email: emailIn.value.trim().toLowerCase(),
            password: pwReg.value,
            firstName: names.firstName,
            lastName: names.lastName,
            phoneNumber: phoneIn ? String(phoneIn.value).trim() : "",
          });
          return;
        }
        showMsg(form, msg("registerNotReady"));
        return;
      }

      /* Forgot password: single email field */
      if (emailIn && !form.querySelector('input[type="password"]')) {
        if (!emailIn.value.trim()) {
          showMsg(form, msg("emailEmpty"), emailIn);
          emailIn.focus();
          return;
        }
        if (!validEmail(emailIn.value)) {
          showMsg(form, msg("emailInvalid"), emailIn);
          emailIn.focus();
          return;
        }
        if (typeof window.showSent === "function") {
          window.showSent();
        }
        return;
      }
    });

    form.querySelectorAll("input,select").forEach(function (el) {
      el.addEventListener("input", function () {
        clearMsg(form);
      });
      el.addEventListener("change", function () {
        clearMsg(form);
      });
    });
  }

  function wireContactForm(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearMsg(form);

      var nameIn = form.querySelector('[name="contact-name"]');
      var companyIn = form.querySelector('[name="contact-company"]');
      var emailIn = form.querySelector('[name="contact-email"]');
      var msgTa = form.querySelector('[name="contact-message"]');

      if (nameIn && !nameIn.value.trim()) {
        showMsg(form, msg("nameEmpty"), nameIn);
        nameIn.focus();
        return;
      }
      if (companyIn && !companyIn.value.trim()) {
        showMsg(form, msg("companyEmpty"), companyIn);
        companyIn.focus();
        return;
      }
      if (!emailIn || !emailIn.value.trim()) {
        showMsg(form, msg("emailEmpty"), emailIn);
        emailIn && emailIn.focus();
        return;
      }
      if (!validEmail(emailIn.value)) {
        showMsg(form, msg("emailInvalid"), emailIn);
        emailIn.focus();
        return;
      }
      if (msgTa && !msgTa.value.trim()) {
        showMsg(form, msg("contactMessageEmpty"), msgTa);
        msgTa.focus();
        return;
      }
    });

    form.querySelectorAll("input,select,textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        clearMsg(form);
      });
      el.addEventListener("change", function () {
        clearMsg(form);
      });
    });
  }

  function wireNewsletterForm(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearMsg(form);
      var emailIn = form.querySelector('input[type="email"]');
      if (!emailIn || !emailIn.value.trim()) {
        showMsg(form, msg("emailEmpty"), emailIn);
        emailIn && emailIn.focus();
        return;
      }
      if (!validEmail(emailIn.value)) {
        showMsg(form, msg("emailInvalid"), emailIn);
        emailIn.focus();
        return;
      }
      if (typeof window.hlNewsletterOnValid === "function") {
        window.hlNewsletterOnValid(form);
      }
    });
    form.querySelectorAll("input").forEach(function (el) {
      el.addEventListener("input", function () {
        clearMsg(form);
      });
    });
  }

  /** Event detail pages: full registration (Industrial Parks etc.) */
  function wireEventRegistrationForm(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearMsg(form);
      var nameIn = form.querySelector('[name="reg-name"]');
      var titleIn = form.querySelector('[name="reg-title"]');
      var companyIn = form.querySelector('[name="reg-company"]');
      var sectorSel = form.querySelector('[name="reg-sector"]');
      var emailIn = form.querySelector('[name="reg-email"]');
      var consent = form.querySelector('[name="reg-consent"]');

      if (!nameIn || !nameIn.value.trim()) {
        showMsg(form, msg("eventRegNameEmpty"), nameIn);
        nameIn && nameIn.focus();
        return;
      }
      if (!titleIn || !titleIn.value.trim()) {
        showMsg(form, msg("eventRegTitleEmpty"), titleIn);
        titleIn && titleIn.focus();
        return;
      }
      if (!companyIn || !companyIn.value.trim()) {
        showMsg(form, msg("eventRegCompanyEmpty"), companyIn);
        companyIn && companyIn.focus();
        return;
      }
      if (!sectorSel || !String(sectorSel.value || "").trim()) {
        showMsg(form, msg("eventRegSectorEmpty"), sectorSel);
        sectorSel && sectorSel.focus();
        return;
      }
      if (!emailIn || !emailIn.value.trim()) {
        showMsg(form, msg("emailEmpty"), emailIn);
        emailIn && emailIn.focus();
        return;
      }
      if (!validEmail(emailIn.value)) {
        showMsg(form, msg("emailInvalid"), emailIn);
        emailIn.focus();
        return;
      }
      if (!consent || !consent.checked) {
        showMsg(form, msg("eventRegConsentRequired"), consent);
        consent && consent.focus();
        return;
      }
      if (typeof window.hlEventRegOnValid === "function") {
        window.hlEventRegOnValid(form);
      }
    });
    form.querySelectorAll("input,select,textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        clearMsg(form);
      });
      el.addEventListener("change", function () {
        clearMsg(form);
      });
    });
  }

  function boot() {
    injectValidationStyles();
    document.querySelectorAll("form.hl-auth-form").forEach(wireForm);
    document.querySelectorAll("form.hl-contact-form").forEach(wireContactForm);
    document.querySelectorAll("form.hl-newsletter-form").forEach(wireNewsletterForm);
    document.querySelectorAll("form.hl-event-reg-form").forEach(wireEventRegistrationForm);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
