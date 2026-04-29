#!/usr/bin/env python3
"""
Build company hub pages from Houselink/Company/*/page-*.html into landing-page.

Maps each locale to the correct path prefix (EN at site root, vi/ja/ko/zh under locale).
Rewrites prototype links (page-*.html, services, login) per locale.

Does not modify files under Houselink/.
"""
from __future__ import annotations

import html
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPANY = ROOT.parent.parent / "Houselink" / "Company"

# (subfolder under Company/, filename stem without locale, URL slug, data-hl-page)
PAGES: list[tuple[str, str, str, str]] = [
    ("Page about", "page-about", "about", "about"),
    ("Page careers", "page-careers", "careers", "careers"),
    ("Page case", "page-cases", "cases", "cases"),
    ("Page clients", "page-clients", "clients", "clients"),
    ("Page contact", "page-contact", "contact", "contact"),
    ("Page esg", "page-esg", "esg", "esg"),
    ("Page insights", "page-insights", "insights", "insights"),
    ("Page news", "page-news", "news", "news"),
    ("Page team", "page-team", "team", "team"),
]

LOCALES = ("vi", "en", "ja", "ko", "zh")


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


def resolve_source(folder: str, stem: str, locale: str) -> Path | None:
    fdir = COMPANY / folder
    if locale == "vi":
        p0 = fdir / f"{stem}.html"
        if p0.is_file():
            return p0
        # Vietnamese often ships as EN body in Company; fall back to EN export
        fe = fdir / f"{stem}-en.html"
        return fe if fe.is_file() else None
    p = fdir / f"{stem}-{locale}.html"
    if p.is_file():
        return p
    fe = fdir / f"{stem}-en.html"
    return fe if fe.is_file() else None


def loc_path(locale: str, slug: str) -> str:
    if locale == "en":
        return f"/{slug}/"
    if locale == "vi":
        return f"/vi/{slug}/"
    return f"/{locale}/{slug}/"


def register_path(locale: str) -> str:
    if locale == "en":
        return "/register/"
    if locale == "vi":
        return "/vi/register/"
    return f"/{locale}/register/"


def service_path(_locale: str, segment: str) -> str:
    """Service detail pages are canonical under /vi/services/ (matches header partials)."""
    return f"/vi/services/{segment}/"


def fix_company_links(s: str, *, home: str, login: str, locale: str) -> str:
    """Locale-aware rewrites (not the all-/vi/ map in build_home_from_houselink)."""
    home = home.rstrip("/") or "/"
    if home != "/":
        home_slash = home + "/"
    else:
        home_slash = "/"

    def h(u: str) -> str:
        if u == "/":
            return "/"
        return u.rstrip("/") + "/"

    s = s.replace("houselink-landing-v6-2.html#database", h(home_slash) + "#database")
    s = s.replace("houselink-landing-v6-2.html#for-contractors", h(home_slash) + "#for-contractors")
    s = s.replace("houselink-landing-v6-2.html", home_slash if home_slash != "//" else "/")

    def lp(slug: str) -> str:
        return loc_path(locale, slug)

    svc_hub = "/services/" if locale == "en" else ("/vi/services/" if locale == "vi" else f"/{locale}/services/")
    repl = [
        ("page-cases.html", lp("cases")),
        ("page-clients.html", lp("clients")),
        ("page-news.html", lp("news")),
        ("page-insights.html", lp("insights")),
        ("page-contact.html", lp("contact")),
        ("page-about.html", lp("about")),
        ("page-team.html", lp("team")),
        ("page-careers.html", lp("careers")),
        ("page-esg.html", lp("esg")),
        ("page-privacy.html", "/vi/privacy/"),
        ("page-terms.html", "/vi/terms/"),
        ("page-faq.html", "/vi/faq/"),
        ("service-market.html", service_path(locale, "market")),
        ("service-land.html", service_path(locale, "land")),
        ("service-legal.html", service_path(locale, "legal")),
        ("service-project.html", service_path(locale, "project")),
        ("service-esg.html", service_path(locale, "esg")),
        ("service-esg-7.html", service_path(locale, "esg")),
        ("service-findproject.html", service_path(locale, "find-project")),
        ("auth-login-vi.html", login),
        ("auth-login-en.html", login),
        ("auth-register-vi.html", register_path(locale)),
        ("auth-register-en.html", register_path(locale)),
        ("case-detail-exxon.html", "/vi/cases/exxon/"),
        ("job-detail-analyst.html", "/vi/jobs/analyst/"),
        ("job-detail-esg.html", "/vi/jobs/esg/"),
        ("lien-he.html", lp("contact")),
    ]
    for a, b in repl:
        s = s.replace(a, b)

    if locale == "en":
        s = s.replace('href="/en/', 'href="/')

    s = s.replace("page-services.html", svc_hub)
    s = s.replace('href="#services"', f'href="{svc_hub}"')
    return s


def extract_main(doc: str) -> str:
    hi = doc.lower().find("</header>")
    if hi == -1:
        raise ValueError("no </header>")
    i = doc.find("<section", hi)
    j = doc.find("<footer", i)
    if i == -1 or j == -1:
        raise ValueError("no main section/footer")
    return doc[i:j].strip()


def extract_trailing_scripts(doc: str) -> str:
    """Optional scripts after </footer> (e.g. careers setLang)."""
    fb = doc.lower().rfind("</footer>")
    if fb == -1:
        return ""
    rest = doc[fb + len("</footer>") :].strip()
    if not rest.lower().startswith("<script"):
        return ""
    # up to last </script> before </body>
    bi = rest.lower().find("</body>")
    chunk = rest if bi == -1 else rest[:bi]
    out = []
    pos = 0
    low = chunk.lower()
    while True:
        si = low.find("<script", pos)
        if si == -1:
            break
        ei = low.find("</script>", si)
        if ei == -1:
            break
        out.append(chunk[si : ei + len("</script>")])
        pos = ei + 9
    return "\n".join(out).strip()


def job_out(locale: str, slug: str) -> tuple[Path, str, str, str, str, str]:
    if locale == "en":
        return (
            ROOT / slug / "index.html",
            "/",
            "/login/",
            "../landing-chrome.css",
            "../landing-chrome.js",
            "../images/",
        )
    if locale == "vi":
        return (
            ROOT / "vi" / slug / "index.html",
            "/vi/",
            "/vi/login/",
            "../../landing-chrome.css",
            "../../landing-chrome.js",
            "../../images/",
        )
    return (
        ROOT / locale / slug / "index.html",
        f"/{locale}/",
        f"/{locale}/login/",
        "../../landing-chrome.css",
        "../../landing-chrome.js",
        "../../images/",
    )


def write_page(
    out: Path,
    source_html: str,
    *,
    hl_page: str,
    title: str,
    img_prefix: str,
    home: str,
    login: str,
    chrome_css: str,
    chrome_js: str,
    locale: str,
) -> None:
    style = bh().extract_style(source_html)
    main = extract_main(source_html)
    main = bh().fix_unsplash_to_local(main, img_prefix)
    main = fix_company_links(main, home=home, login=login, locale=locale)
    extra_scripts = extract_trailing_scripts(source_html)

    inter = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
    tail = f"\n{extra_scripts}\n" if extra_scripts else "\n"
    doc = f"""<!DOCTYPE html>
<html lang="{html.escape(bh().extract_lang(source_html))}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{inter}" rel="stylesheet">
<style>
{style}
</style>
  <link rel="stylesheet" href="{chrome_css}">
</head>
<body class="hl-with-fixed-header" data-hl-page="{hl_page}">

<div id="hl-chrome-header"></div>

{main}

<div id="hl-chrome-footer"></div>
  <script src="{chrome_js}" defer></script>{tail}
</body>
</html>
"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")


def main() -> None:
    for folder, stem, slug, hl_key in PAGES:
        for loc in LOCALES:
            src = resolve_source(folder, stem, loc)
            if src is None:
                print(f"SKIP {folder} {stem} {loc}: no source")
                continue
            raw = src.read_text(encoding="utf-8")
            title = bh().extract_title(raw)
            out, home, login, ccss, cjs, img = job_out(loc, slug)
            write_page(
                out,
                raw,
                hl_page=hl_key,
                title=title,
                img_prefix=img,
                home=home,
                login=login,
                chrome_css=ccss,
                chrome_js=cjs,
                locale=loc,
            )
            print(f"Wrote {out.relative_to(ROOT)} ({loc})")


if __name__ == "__main__":
    main()
