#!/usr/bin/env python3
"""
Rebuild landing home pages from Houselink/home sources.

- Body markup: from houselink-landing-en.html for en, vi, ja, ko (JA/KO design
  files in home/ are placeholders until real exports exist).
- Body markup: from houselink-landing-zh.html for zh.
- Inline <style>: same file as the body source above.
- Injects landing-chrome header/footer; rewrites prototype links + Unsplash → /images.

Does not modify files under Houselink/.

If ``ja/index.html`` / ``ko/index.html`` are locale-root 404 stubs (``hl:locale-root-404`` from ``sync_root_404.py``), those paths are not overwritten; run ``python3 tools/sync_root_404.py`` after a full home rebuild if you still want stubs.

If they contain ``hl:handrolled-locale-home`` (curated JA/KO home from ``app/landing-page/index.html``), they are not overwritten by this batch rebuild.
"""
from __future__ import annotations

import html
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOME1 = ROOT.parent.parent / "Houselink" / "home"


def _is_locale_root_404_stub(path: Path) -> bool:
    try:
        return path.is_file() and "hl:locale-root-404" in path.read_text(encoding="utf-8")[:8000]
    except OSError:
        return False


def _is_handrolled_locale_home(path: Path) -> bool:
    try:
        return path.is_file() and "hl:handrolled-locale-home" in path.read_text(encoding="utf-8")[:8000]
    except OSError:
        return False

UNSPLASH_LOCAL = [
    ("photo-1473341304170-971dccb5ac1e", "unsplash-1473341304170-971dccb5ac1e.jpg"),
    ("photo-1504328345606-18bbc8c9d7d1", "unsplash-1504328345606-18bbc8c9d7d1.jpg"),
    ("photo-1581091226825-a6a2a5aee158", "unsplash-1581091226825-a6a2a5aee158.jpg"),
    ("photo-1558618666-fcd25c85cd64", "unsplash-1558618666-fcd25c85cd64.jpg"),
    ("photo-1565514158740-064f34bd6cfd", "unsplash-1565514158740-064f34bd6cfd.jpg"),
    ("photo-1560439514-4e9645039924", "unsplash-1560439514-4e9645039924.jpg"),
    ("photo-1519750783826-e2420f4d687f", "unsplash-1519750783826-e2420f4d687f.jpg"),
    ("photo-1576267423445-b2e0074d68a4", "unsplash-1576267423445-b2e0074d68a4.jpg"),
    ("photo-1466611653911-95081537e5b7", "unsplash-1466611653911-95081537e5b7.jpg"),
    ("photo-1614213951248-de8a72f1a5c4", "unsplash-1565514158740-064f34bd6cfd.jpg"),
]


def extract_style(html: str) -> str:
    m = re.search(r"<style>(.*?)</style>", html, re.S)
    if not m:
        raise ValueError("no <style> block")
    return sansify_css(m.group(1).strip())


INTER_STACK = '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'


def sansify_css(css: str) -> str:
    """Match site-wide sans policy: Inter + system stack; no serif display font."""
    t = css
    t = t.replace("--font-main: 'Be Vietnam Pro', sans-serif;", f"--font-main: {INTER_STACK};")
    t = t.replace("--font-serif: 'DM Serif Display', serif;", "--font-serif: var(--font-main);")
    t = t.replace(
        '--font-serif: "DM Serif Display", Georgia, "Times New Roman", serif;',
        "--font-serif: var(--font-main);",
    )
    return t


def extract_title(html: str) -> str:
    m = re.search(r"<title>(.*?)</title>", html, re.S | re.I)
    return (m.group(1).strip() if m else "HOUSELINK")


def extract_lang(html: str) -> str:
    m = re.search(r'<html\s+lang="([^"]+)"', html, re.I)
    return (m.group(1).strip() if m else "en")


def extract_main_before_footer(html: str) -> str:
    i = html.find('<section id="hero">')
    j = html.find("<footer")
    if i == -1 or j == -1:
        raise ValueError("hero or footer not found")
    return html[i:j].strip()


def fix_unsplash_to_local(s: str, img_prefix: str) -> str:
    for needle, fname in UNSPLASH_LOCAL:
        s = re.sub(
            rf'https://images\.unsplash\.com/{re.escape(needle)}\?[^"\s]+',
            f"{img_prefix}{fname}",
            s,
        )
    return s


def fix_houselink_links(s: str, home: str, login: str) -> str:
    """Rewrite prototype links using the same locale prefix as ``home`` (``/`` = English at site root, ``/vi/``, …)."""
    raw_home = (home or "").strip()
    if raw_home in ("/", ""):
        home_slash = "/"
        prefix = ""
    else:
        home_slash = raw_home if raw_home.endswith("/") else raw_home + "/"
        prefix = home_slash.rstrip("/")

    def H(u: str) -> str:
        if not u or u == "/":
            return "/"
        return u.rstrip("/") + "/"

    base = "/" if not prefix else H(prefix)
    s = s.replace("houselink-landing-v6-2.html#database", base + "#database")
    s = s.replace("houselink-landing-v6-2.html#for-contractors", base + "#for-contractors")
    s = s.replace("houselink-landing-v6-2.html", base)

    def U(seg: str) -> str:
        if not prefix:
            return f"/{seg}/"
        return f"{prefix}/{seg}/"

    repl = [
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
        ("page-privacy.html", "/vi/privacy/"),
        ("page-terms.html", "/vi/terms/"),
        ("page-faq.html", "/vi/faq/"),
        ("service-market.html", "/vi/services/market/"),
        ("service-land.html", "/vi/services/land/"),
        ("service-legal.html", "/vi/services/legal/"),
        ("service-project.html", "/vi/services/project/"),
        ("service-esg.html", "/vi/services/esg/"),
        ("service-esg-7.html", "/vi/services/esg/"),
        ("service-findproject.html", "/vi/services/find-project/"),
        ("auth-login-vi.html", login),
        ("auth-login-en.html", login),
        ("auth-login-ja.html", login),
        ("auth-login-ko.html", login),
        ("auth-login-zh.html", login),
    ]
    for a, b in repl:
        s = s.replace(a, b)
    return s


def build_page_v2(
    out_path: Path,
    style_source: str,
    title: str,
    lang: str,
    main_html: str,
    img_prefix: str,
    home: str,
    login: str,
    chrome_css_href: str,
    chrome_js_src: str,
) -> None:
    style = extract_style(style_source)
    main_html = fix_unsplash_to_local(main_html, img_prefix)
    main_html = fix_houselink_links(main_html, home=home, login=login)

    inter_font = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"

    doc = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{inter_font}" rel="stylesheet">
<style>
{style}
</style>
  <link rel="stylesheet" href="{chrome_css_href}">
</head>
<body class="hl-with-fixed-header" data-hl-page="home">

<div id="hl-chrome-header"></div>

{main_html}

<div id="hl-chrome-footer"></div>
  <script src="{chrome_js_src}" defer></script>
</body>
</html>
"""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(doc, encoding="utf-8")


def sync_root_404_from_en_copy() -> None:
    """If ``en/404/index.html`` exists, mirror it to ``404/index.html`` for English (no ``/en/`` prefix)."""
    src = ROOT / "en" / "404" / "index.html"
    if not src.is_file():
        return
    t = src.read_text(encoding="utf-8")
    t = t.replace("../../landing-chrome.css", "../landing-chrome.css")
    t = t.replace("../../css/hl-404.css", "../css/hl-404.css")
    t = t.replace("../../landing-chrome.js", "../landing-chrome.js")
    t = t.replace("../../js/hl-404.js", "../js/hl-404.js")
    t = t.replace("/en/services/", "/vi/services/")
    t = t.replace("/en/", "/")
    dest = ROOT / "404" / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(t, encoding="utf-8")


def prune_stale_en_prefixed_dirs() -> None:
    """Remove old ``en/<section>/`` copies; English hubs live at site root (keep ``en/index.html`` redirect)."""
    en_dir = ROOT / "en"
    if not en_dir.is_dir():
        return
    for child in list(en_dir.iterdir()):
        if child.name == "index.html":
            continue
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            try:
                child.unlink()
            except OSError:
                pass


def main() -> None:
    en_src = (HOME1 / "houselink-landing-en.html").read_text(encoding="utf-8")
    zh_src = (HOME1 / "houselink-landing-zh.html").read_text(encoding="utf-8")

    main_en = extract_main_before_footer(en_src)
    main_zh = extract_main_before_footer(zh_src)

    # Keep localized <title> only (on-page copy is Home_1 EN for vi/ja/ko).
    cur_vi = (ROOT / "vi" / "index.html").read_text(encoding="utf-8")
    ja_path = ROOT / "ja" / "index.html"
    ko_path = ROOT / "ko" / "index.html"

    build_page_v2(
        ROOT / "index.html",
        en_src,
        extract_title(en_src),
        "en",
        main_en,
        img_prefix="images/",
        home="/",
        login="/login/",
        chrome_css_href="landing-chrome.css",
        chrome_js_src="landing-chrome.js",
    )

    # Legacy ``/en/`` bookmarks → English home at site root
    (ROOT / "en").mkdir(parents=True, exist_ok=True)
    sync_root_404_from_en_copy()
    prune_stale_en_prefixed_dirs()
    (ROOT / "en" / "index.html").write_text(
        """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="0; url=/">
<link rel="canonical" href="/">
<title>HOUSELINK</title>
<script>location.replace("/");</script>
</head>
<body>
<p><a href="/">English (home)</a> · <a href="/vi/">Tiếng Việt</a></p>
</body>
</html>
""",
        encoding="utf-8",
    )

    build_page_v2(
        ROOT / "vi" / "index.html",
        en_src,
        extract_title(cur_vi),
        "vi",
        main_en,
        img_prefix="../images/",
        home="/vi/",
        login="/vi/login/",
        chrome_css_href="../landing-chrome.css",
        chrome_js_src="../landing-chrome.js",
    )

    if _is_locale_root_404_stub(ja_path):
        print("Skip", ja_path, "(locale-root 404 stub; regenerate with: python3 tools/sync_root_404.py)")
    elif _is_handrolled_locale_home(ja_path):
        print("Skip", ja_path, "(handrolled locale home; not overwritten from Houselink)")
    elif ja_path.exists():
        cur_ja = ja_path.read_text(encoding="utf-8")
        build_page_v2(
            ja_path,
            en_src,
            extract_title(cur_ja),
            "ja",
            main_en,
            img_prefix="../images/",
            home="/ja/",
            login="/ja/login/",
            chrome_css_href="../landing-chrome.css",
            chrome_js_src="../landing-chrome.js",
        )
    else:
        print("Warning: missing", ja_path)

    if _is_locale_root_404_stub(ko_path):
        print("Skip", ko_path, "(locale-root 404 stub; regenerate with: python3 tools/sync_root_404.py)")
    elif _is_handrolled_locale_home(ko_path):
        print("Skip", ko_path, "(handrolled locale home; not overwritten from Houselink)")
    elif ko_path.exists():
        cur_ko = ko_path.read_text(encoding="utf-8")
        build_page_v2(
            ko_path,
            en_src,
            extract_title(cur_ko),
            "ko",
            main_en,
            img_prefix="../images/",
            home="/ko/",
            login="/ko/login/",
            chrome_css_href="../landing-chrome.css",
            chrome_js_src="../landing-chrome.js",
        )
    else:
        print("Warning: missing", ko_path)

    build_page_v2(
        ROOT / "zh" / "index.html",
        zh_src,
        extract_title(zh_src),
        extract_lang(zh_src),
        main_zh,
        img_prefix="../images/",
        home="/zh/",
        login="/zh/login/",
        chrome_css_href="../landing-chrome.css",
        chrome_js_src="../landing-chrome.js",
    )

    print("Wrote:", ROOT / "index.html", "(English home at /)")
    print("Wrote:", ROOT / "en" / "index.html", "(redirect → /)")
    print("Wrote:", ROOT / "vi" / "index.html")
    if ja_path.exists() and not _is_locale_root_404_stub(ja_path) and not _is_handrolled_locale_home(ja_path):
        print("Wrote:", ja_path)
    if ko_path.exists() and not _is_locale_root_404_stub(ko_path) and not _is_handrolled_locale_home(ko_path):
        print("Wrote:", ko_path)
    print("Wrote:", ROOT / "zh" / "index.html")


if __name__ == "__main__":
    main()
