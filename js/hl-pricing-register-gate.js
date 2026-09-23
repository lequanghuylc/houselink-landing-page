/**
 * FindProject pricing: gate plan "Register" CTAs behind an account-required modal.
 * Package signup on the landing contract pages is retired; purchase happens in-app
 * after register → claim company.
 */
(function () {
  'use strict';

  var REGISTER_PATHS = {
    vi: '/vi/register/',
    en: '/register/',
    ja: '/ja/register/',
    ko: '/ko/register/',
    zh: '/zh/register/',
  };

  var COPY = {
    vi: {
      title: 'Cần tài khoản HOUSELINK',
      bodyBefore: 'Để mua gói dịch vụ, bạn cần đăng ký tài khoản HOUSELINK ',
      linkText: 'tại đây',
      bodyAfter:
        ', sau đó claim doanh nghiệp và chọn gói trong hệ thống. Nếu có thắc mắc, vui lòng liên hệ theo thông tin ở chân trang.',
      close: 'Đóng',
      cta: 'Đăng ký tài khoản',
    },
    en: {
      title: 'HOUSELINK account required',
      bodyBefore: 'To buy a plan, please create a HOUSELINK account ',
      linkText: 'here',
      bodyAfter:
        ', then claim your company and purchase a package in the app. For questions, use the contact details in the website footer.',
      close: 'Close',
      cta: 'Create account',
    },
    ja: {
      title: 'HOUSELINKアカウントが必要です',
      bodyBefore: 'プランをご購入いただくには、HOUSELINKアカウントを',
      linkText: 'こちら',
      bodyAfter:
        'で登録し、企業をクレームしてからアプリ内でパッケージを購入してください。ご不明点はページ下部のお問い合わせ情報までご連絡ください。',
      close: '閉じる',
      cta: 'アカウント登録',
    },
    ko: {
      title: 'HOUSELINK 계정이 필요합니다',
      bodyBefore: '패키지를 구매하려면 HOUSELINK 계정을 ',
      linkText: '여기',
      bodyAfter:
        '에서 등록한 뒤 기업을 클레임하고 앱에서 패키지를 구매해 주세요. 문의는 페이지 하단 연락처를 이용해 주세요.',
      close: '닫기',
      cta: '계정 등록',
    },
    zh: {
      title: '需要 HOUSELINK 账户',
      bodyBefore: '购买套餐前，请先',
      linkText: '在此',
      bodyAfter:
        '注册 HOUSELINK 账户，然后认领企业并在系统内购买套餐。如有疑问，请通过页脚联系方式联系我们。',
      close: '关闭',
      cta: '注册账户',
    },
  };

  function detectLocale() {
    var path = (location.pathname || '/').toLowerCase();
    if (path.indexOf('/vi/') === 0 || path === '/vi') return 'vi';
    if (path.indexOf('/ja/') === 0 || path === '/ja') return 'ja';
    if (path.indexOf('/ko/') === 0 || path === '/ko') return 'ko';
    if (path.indexOf('/zh/') === 0 || path === '/zh') return 'zh';
    return 'en';
  }

  function ensureStyles() {
    if (document.getElementById('hl-pricing-register-gate-style')) return;
    var style = document.createElement('style');
    style.id = 'hl-pricing-register-gate-style';
    style.textContent =
      '#hl-pricing-register-gate{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;}' +
      '#hl-pricing-register-gate.is-open{display:flex;}' +
      '#hl-pricing-register-gate .hl-prg-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.55);}' +
      '#hl-pricing-register-gate .hl-prg-dialog{position:relative;z-index:1;max-width:440px;width:100%;background:#fff;border-radius:14px;padding:28px 26px 22px;box-shadow:0 24px 60px rgba(15,23,42,.28);font-family:inherit;}' +
      '#hl-pricing-register-gate .hl-prg-title{margin:0 0 12px;font-size:18px;font-weight:700;color:#0f2744;line-height:1.35;}' +
      '#hl-pricing-register-gate .hl-prg-body{margin:0 0 22px;font-size:14.5px;line-height:1.65;color:#475569;}' +
      '#hl-pricing-register-gate .hl-prg-body a{color:#2D8B48;font-weight:700;text-decoration:underline;}' +
      '#hl-pricing-register-gate .hl-prg-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;}' +
      '#hl-pricing-register-gate .hl-prg-btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;border:none;font-family:inherit;}' +
      '#hl-pricing-register-gate .hl-prg-btn-secondary{background:#fff;color:#0f2744;border:1.5px solid #e2e8f0;}' +
      '#hl-pricing-register-gate .hl-prg-btn-primary{background:#2D8B48;color:#fff;}' +
      '#hl-pricing-register-gate .hl-prg-btn-primary:hover{background:#247a3c;}' +
      'button.plan-btn{width:100%;box-sizing:border-box;font-family:inherit;}' +
      'button.btn-white{font-family:inherit;border:none;cursor:pointer;}';
    document.head.appendChild(style);
  }

  function ensureModal(locale) {
    var existing = document.getElementById('hl-pricing-register-gate');
    if (existing) return existing;

    var copy = COPY[locale] || COPY.en;
    var registerHref = REGISTER_PATHS[locale] || REGISTER_PATHS.en;

    var root = document.createElement('div');
    root.id = 'hl-pricing-register-gate';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'hl-prg-title');
    root.innerHTML =
      '<div class="hl-prg-backdrop" data-hl-prg-close></div>' +
      '<div class="hl-prg-dialog">' +
      '<h2 class="hl-prg-title" id="hl-prg-title"></h2>' +
      '<p class="hl-prg-body" id="hl-prg-body"></p>' +
      '<div class="hl-prg-actions">' +
      '<button type="button" class="hl-prg-btn hl-prg-btn-secondary" data-hl-prg-close></button>' +
      '<a class="hl-prg-btn hl-prg-btn-primary" id="hl-prg-cta" href="#"></a>' +
      '</div></div>';

    document.body.appendChild(root);

    root.querySelector('#hl-prg-title').textContent = copy.title;
    var body = root.querySelector('#hl-prg-body');
    body.appendChild(document.createTextNode(copy.bodyBefore));
    var link = document.createElement('a');
    link.href = registerHref;
    link.textContent = copy.linkText;
    body.appendChild(link);
    body.appendChild(document.createTextNode(copy.bodyAfter));

    root.querySelector('[data-hl-prg-close].hl-prg-btn').textContent = copy.close;
    var cta = root.querySelector('#hl-prg-cta');
    cta.href = registerHref;
    cta.textContent = copy.cta;

    root.addEventListener('click', function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-hl-prg-close') !== null) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) closeModal();
    });

    return root;
  }

  function openModal() {
    var locale = detectLocale();
    ensureStyles();
    var root = ensureModal(locale);
    root.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
  }

  function closeModal() {
    var root = document.getElementById('hl-pricing-register-gate');
    if (!root) return;
    root.classList.remove('is-open');
    document.documentElement.style.overflow = '';
  }

  function onGateClick(e) {
    e.preventDefault();
    openModal();
  }

  function bindGates() {
    document.querySelectorAll('[data-hl-register-gate]').forEach(function (el) {
      el.addEventListener('click', onGateClick);
    });
  }

  function maybeAutoOpen() {
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('needAccount') === '1') {
        openModal();
        params.delete('needAccount');
        var next = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
        if (history.replaceState) history.replaceState(null, '', next);
      }
    } catch (err) {}
  }

  function init() {
    bindGates();
    maybeAutoOpen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.hlOpenPricingRegisterGate = openModal;
})();
