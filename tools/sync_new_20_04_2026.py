#!/usr/bin/env python3
"""
Sync static exports from Houselink/New_20_04_2026 into app/landing-page.

- Auth (login / forgot / register): all locales EN, VI, JA, KO, ZH — new markup
  + Inter/sansify via build_home_from_houselink — preserves hl-auth-form,
    auth-locale-validation.js paths, and locale-correct internal links.
- VI service detail pages: ESG, Legal, Market, Project, Land, Find-project —
  main HTML from new exports, wrapped with hl-chrome header/footer like existing.
- Prototype ``service-esg-7.html`` rewrites to locale ``services/esg/`` (single ESG service URL).
- ESG hub pages (en, ja, ko, zh): rebuilt from new service-esg-*.html with chrome;
  VI detail stays under vi/services/esg/.
- Project implementation detail: service-project-*.html → ``services/project/``,
  ``ja|ko|zh/services/project/`` (``data-hl-page="services-project"``).
- Market, Legal, Land, Find-project: same pattern from ``Service market``,
  ``Service legal``, ``service-land``, ``service findproject`` exports for en/ja/ko/zh.

Does not modify files under Houselink/.
"""
from __future__ import annotations

import html as html_mod
import importlib.util
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW = ROOT.parent.parent / "Houselink" / "New_20_04_2026"


def _load_bh():
    p = ROOT / "tools" / "build_home_from_houselink.py"
    spec = importlib.util.spec_from_file_location("build_home_from_houselink", p)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


_bh = None


def bh():
    global _bh
    if _bh is None:
        _bh = _load_bh()
    return _bh


def _prefix(home: str) -> str:
    h = (home or "").strip()
    if h in ("/", ""):
        return ""
    return h.rstrip("/")


def fix_proto_links(s: str, *, home: str, login: str) -> str:
    """Locale-aware rewrites (prototype filenames → site paths)."""
    pre = _prefix(home)
    base = "/" if not pre else pre + "/"

    def U(seg: str) -> str:
        if not pre:
            return f"/{seg}/"
        return f"{pre}/{seg}/"

    s = s.replace("houselink-landing-v6-2.html#database", base + "#database")
    s = s.replace("houselink-landing-v6-2.html#for-contractors", base + "#for-contractors")
    s = s.replace("houselink-landing-v6-2.html", base)

    pairs = [
        ("page-cases.html", U("cases")),
        ("page-services.html", U("services")),
        ("page-clients.html", U("clients")),
        ("page-news.html", U("news")),
        ("page-insights.html", U("insights")),
        ("page-contact.html", U("contact")),
        ("page-about.html", U("about")),
        ("page-team.html", U("team")),
        ("page-careers.html", U("careers")),
        ("page-esg.html", U("esg")),
        ("page-privacy.html", U("privacy")),
        ("page-terms.html", U("terms")),
        ("page-faq.html", U("faq")),
        ("service-market.html", U("services") + "market/"),
        ("service-land.html", U("services") + "land/"),
        ("service-legal.html", U("services") + "legal/"),
        ("service-project.html", U("services") + "project/"),
        ("service-esg.html", (U("services") + "esg/") if pre == "/vi" else U("esg")),
        ("service-esg-7.html", U("services") + "esg/"),
        ("service-findproject.html", U("services") + "find-project/"),
    ]
    for a, b in pairs:
        s = s.replace(a, b)
    return s


def _auth_url(kind: str, loc: str) -> str:
    if loc == "en":
        base = f"/{kind}/" if kind != "login" else "/login/"
        if kind == "login":
            return "/login/"
        return f"/{kind}/"
    return f"/{loc}/{kind}/"


def fix_auth_cross_locale_links(s: str) -> str:
    """Map auth-*.html and location.href prototypes to real paths for every locale."""
    for loc in ("vi", "en", "ja", "ko", "zh"):
        s = s.replace(f"auth-login-{loc}.html", _auth_url("login", loc))
        s = s.replace(f"auth-forgot-{loc}.html", _auth_url("forgot", loc))
        s = s.replace(f"auth-register-{loc}.html", _auth_url("register", loc))
    return s


def js_href(out: Path) -> str:
    depth = len(out.relative_to(ROOT).parts) - 1
    return ("../" * depth) + "js/auth-locale-validation.js"


def extract_body_inner(doc: str) -> str:
    m = re.search(r"<body[^>]*>(.*)</body>", doc, re.S | re.I)
    if not m:
        raise ValueError("no body")
    return m.group(1).strip()


def extract_tail_scripts(doc: str) -> str:
    """Inline <script> blocks before </body> (togglePw, pwStrength, …)."""
    m = re.search(r"<body[^>]*>(.*)</body>", doc, re.S | re.I)
    if not m:
        return ""
    inner = m.group(1)
    parts = re.findall(r"<script[^>]*>.*?</script>", inner, re.S | re.I)
    return "\n".join(p for p in parts if "auth-locale-validation" not in p.lower())


def inject_auth_lang_block(inner: str, *, locale: str, urls: dict[str, str]) -> str:
    order = [("vi", "🇻🇳 VI"), ("en", "🇬🇧 EN"), ("zh", "🇨🇳 ZH"), ("ko", "🇰🇷 KO"), ("ja", "🇯🇵 JA")]
    bits = []
    for code, label in order:
        active = " active" if code == locale else ""
        u = urls[code].replace("'", "\\'")
        bits.append(f'<button type="button" class="lbtn{active}" onclick="window.location.href=\'{u}\'">{label}</button>')
    block = '<div class="auth-lang">\n' + "\n".join(bits) + "\n</div>"
    inner = re.sub(r"<div class=\"auth-lang\">.*?</div>", block, inner, count=1, flags=re.S)
    return inner


def ensure_hl_auth_form(inner: str) -> str:
    inner = re.sub(
        r"<form\s+onsubmit=\"return false;\"",
        '<form class="hl-auth-form" novalidate',
        inner,
        flags=re.I,
    )
    if "hl-auth-form" not in inner:
        inner = re.sub(
            r"<form(\s[^>]*)>",
            r'<form class="hl-auth-form" novalidate\1>',
            inner,
            count=1,
            flags=re.I,
        )
    if "hl-auth-client-msg" not in inner and "hl-auth-form" in inner:
        inner = inner.replace(
            '<form class="hl-auth-form" novalidate>',
            '<form class="hl-auth-form" novalidate>\n        <div class="hl-auth-client-msg" role="alert" aria-live="polite"></div>',
            1,
        )
    return inner


def strip_inline_scripts(inner: str) -> str:
    return re.sub(r"<script[^>]*>.*?</script>", "", inner, flags=re.S | re.I).strip()


def build_auth_page(*, src: Path, out: Path, locale: str, hl_page: str) -> None:
    raw = src.read_text(encoding="utf-8")
    style = bh().extract_style(raw)
    title = bh().extract_title(raw)
    lang = bh().extract_lang(raw)
    inner_full = extract_body_inner(raw)
    tail_scripts = extract_tail_scripts(raw)
    inner = strip_inline_scripts(inner_full)

    homes = {
        "en": "/",
        "vi": "/vi/",
        "ja": "/ja/",
        "ko": "/ko/",
        "zh": "/zh/",
    }
    home = homes[locale]
    login = "/login/" if locale == "en" else f"/{locale}/login/"
    inner = fix_proto_links(inner, home=home, login=login)
    inner = fix_auth_cross_locale_links(inner)

    urls = {c: _auth_url(hl_page, c) for c in homes}
    inner = inject_auth_lang_block(inner, locale=locale, urls=urls)
    inner = ensure_hl_auth_form(inner)

    inter = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
    jref = js_href(out)
    doc = f"""<!DOCTYPE html>
<html lang="{html_mod.escape(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html_mod.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{inter}" rel="stylesheet">
<style>
{style}
</style>
</head>
<body data-hl-page="{html_mod.escape(hl_page)}">

{inner}

  <script src="{jref}" defer></script>
{tail_scripts}

</body>
</html>
"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")


def extract_service_main(doc: str) -> str:
    """From first <section to before footer-mini or </body> (source exports may have broken footer-mini)."""
    m = re.search(r"(<section\b[^>]*>.*)", doc, re.S | re.I)
    if not m:
        raise ValueError("no section in service export")
    chunk = m.group(1)
    fm = re.search(r"<div\s+class=\"footer-mini\"[^>]*>.*?</div>", chunk, re.S | re.I)
    if fm:
        chunk = chunk[: fm.start()]
    else:
        broken = re.search(r"<div\s+class=\"footer-mini\b", chunk, re.I)
        if broken:
            chunk = chunk[: broken.start()]
    chunk = re.sub(r"</body>[\s\S]*", "", chunk, flags=re.I)
    chunk = re.sub(r"</html>[\s\S]*", "", chunk, flags=re.I)
    return chunk.strip()


def chrome_paths(out: Path) -> tuple[str, str]:
    """Relative hrefs to landing-chrome.css / .js from output file."""
    depth = len(out.relative_to(ROOT).parts) - 1
    p = "../" * depth
    return p + "landing-chrome.css", p + "landing-chrome.js"


def img_prefix(out: Path) -> str:
    depth = len(out.relative_to(ROOT).parts) - 1
    return "../" * depth + "images/"


def build_service_wrapped(
    *,
    src: Path,
    out: Path,
    home: str,
    login: str,
    data_hl: str,
) -> None:
    raw = src.read_text(encoding="utf-8")
    style = bh().extract_style(raw)
    style = re.sub(
        r"--font-main:\s*'Be Vietnam Pro',?\s*sans-serif;",
        '--font-main: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
        style,
    )
    style = re.sub(
        r"--font-serif:\s*'DM Serif Display',?\s*serif;",
        "--font-serif: var(--font-main);",
        style,
    )
    title = bh().extract_title(raw)
    lang = bh().extract_lang(raw)
    main = extract_service_main(raw)
    ip = img_prefix(out)
    main = bh().fix_unsplash_to_local(main, ip)
    main = fix_proto_links(main, home=home, login=login)
    main = re.sub(
        r"<div class=\"cta-btns\"",
        '<div class="cta-bar-btns"',
        main,
    )
    style += "\n.cta-bar-btns{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}\n"
    style += ".hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px;}\n"
    ccss, cjs = chrome_paths(out)
    inter = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
    doc = f"""<!DOCTYPE html>
<html lang="{html_mod.escape(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html_mod.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{inter}" rel="stylesheet">
<style>
{style}
</style>
  <link rel="stylesheet" href="{ccss}">
</head>
<body class="hl-with-fixed-header" data-hl-page="{html_mod.escape(data_hl)}">

<div id="hl-chrome-header"></div>

{main}

<div id="hl-chrome-footer"></div>
  <script src="{cjs}" defer></script>
</body>
</html>
"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")


def main() -> None:
    if not NEW.is_dir():
        raise SystemExit(f"Missing source folder: {NEW}")

    # --- Auth ---
    auth_dir = NEW / "Login Reg pages"
    auth_jobs: list[tuple[str, str, Path, str, str]] = [
        ("auth-login-en.html", "login", ROOT / "login" / "index.html", "en", "login"),
        ("auth-login-vi.html", "login", ROOT / "vi" / "login" / "index.html", "vi", "login"),
        ("auth-login-ja.html", "login", ROOT / "ja" / "login" / "index.html", "ja", "login"),
        ("auth-login-ko.html", "login", ROOT / "ko" / "login" / "index.html", "ko", "login"),
        ("auth-login-zh.html", "login", ROOT / "zh" / "login" / "index.html", "zh", "login"),
        ("auth-forgot-en.html", "forgot", ROOT / "forgot" / "index.html", "en", "forgot"),
        ("auth-forgot-vi.html", "forgot", ROOT / "vi" / "forgot" / "index.html", "vi", "forgot"),
        ("auth-forgot-ja.html", "forgot", ROOT / "ja" / "forgot" / "index.html", "ja", "forgot"),
        ("auth-forgot-ko.html", "forgot", ROOT / "ko" / "forgot" / "index.html", "ko", "forgot"),
        ("auth-forgot-zh.html", "forgot", ROOT / "zh" / "forgot" / "index.html", "zh", "forgot"),
        ("auth-register-en.html", "register", ROOT / "register" / "index.html", "en", "register"),
        ("auth-register-vi.html", "register", ROOT / "vi" / "register" / "index.html", "vi", "register"),
        ("auth-register-ja.html", "register", ROOT / "ja" / "register" / "index.html", "ja", "register"),
        ("auth-register-ko.html", "register", ROOT / "ko" / "register" / "index.html", "ko", "register"),
        ("auth-register-zh.html", "register", ROOT / "zh" / "register" / "index.html", "zh", "register"),
    ]
    for fname, _kind, out, loc, hl in auth_jobs:
        build_auth_page(src=auth_dir / fname, out=out, locale=loc, hl_page=hl)
        print("Auth", out.relative_to(ROOT))

    # --- VI service detail (chrome-wrapped) ---
    vi_home, vi_login = "/vi/", "/vi/login/"
    vi_svc = [
        ("Service ESG/service-esg-vi3.html", ROOT / "vi" / "services" / "esg" / "index.html", "services-esg"),
        ("Service legal/service-legal- vi 3.html", ROOT / "vi" / "services" / "legal" / "index.html", "services-legal"),
        ("Service market/service-market-vi 2.html", ROOT / "vi" / "services" / "market" / "index.html", "services-market"),
        ("service project implement/service-project-vi 2.html", ROOT / "vi" / "services" / "project" / "index.html", "services-project"),
        ("service-land/service-land-vi 2.html", ROOT / "vi" / "services" / "land" / "index.html", "services-land"),
        ("service findproject/service-findproject- vi3.html", ROOT / "vi" / "services" / "find-project" / "index.html", "services-find-project"),
    ]
    for rel, out, dhl in vi_svc:
        build_service_wrapped(src=NEW / rel, out=out, home=vi_home, login=vi_login, data_hl=dhl)
        print("Service VI", out.relative_to(ROOT))

    # --- ESG marketing hubs (en + ja + ko + zh) ---
    esg_hub = [
        ("Service ESG/service-esg-en.html", ROOT / "esg" / "index.html", "/", "/login/", "esg"),
        ("Service ESG/service-esg-ja.html", ROOT / "ja" / "esg" / "index.html", "/ja/", "/ja/login/", "esg"),
        ("Service ESG/service-esg-ko.html", ROOT / "ko" / "esg" / "index.html", "/ko/", "/ko/login/", "esg"),
        ("Service ESG/service-esg-zh.html", ROOT / "zh" / "esg" / "index.html", "/zh/", "/zh/login/", "esg"),
    ]
    for rel, out, home, login, dhl in esg_hub:
        build_service_wrapped(src=NEW / rel, out=out, home=home, login=login, data_hl=dhl)
        print("ESG hub", out.relative_to(ROOT))

    # --- Project implementation (detail) EN / JA / KO / ZH ---
    proj_impl = NEW / "service project implement"
    proj_locales = [
        ("service-project-en.html", ROOT / "services" / "project" / "index.html", "/", "/login/"),
        ("service-project-ja.html", ROOT / "ja" / "services" / "project" / "index.html", "/ja/", "/ja/login/"),
        ("service-project-ko.html", ROOT / "ko" / "services" / "project" / "index.html", "/ko/", "/ko/login/"),
        ("service-project-zh.html", ROOT / "zh" / "services" / "project" / "index.html", "/zh/", "/zh/login/"),
    ]
    for fname, out, home, login in proj_locales:
        build_service_wrapped(
            src=proj_impl / fname,
            out=out,
            home=home,
            login=login,
            data_hl="services-project",
        )
        print("Service project", out.relative_to(ROOT))

    # --- Market, Legal, Land, Find-project (detail) EN / JA / KO / ZH ---
    svc_i18n = [
        ("Service market", "service-market-{lang}.html", "market", "services-market"),
        ("Service legal", "service-legal-{lang}.html", "legal", "services-legal"),
        ("service-land", "service-land-{lang}.html", "land", "services-land"),
        ("service findproject", "service-findproject-{lang}.html", "find-project", "services-find-project"),
    ]
    locale_rows = [
        ("en", "/", "/login/"),
        ("ja", "/ja/", "/ja/login/"),
        ("ko", "/ko/", "/ko/login/"),
        ("zh", "/zh/", "/zh/login/"),
    ]
    for folder, fname_tmpl, slug, dhl in svc_i18n:
        for lang, home, login in locale_rows:
            fname = fname_tmpl.format(lang=lang)
            out = (ROOT / "services" / slug / "index.html") if lang == "en" else (ROOT / lang / "services" / slug / "index.html")
            build_service_wrapped(
                src=NEW / folder / fname,
                out=out,
                home=home,
                login=login,
                data_hl=dhl,
            )
            print("Service i18n", dhl, out.relative_to(ROOT))


if __name__ == "__main__":
    main()
