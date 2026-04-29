#!/usr/bin/env python3
"""
Build "all services" hub pages from Houselink/services/page-services*.html into landing-page.

Outputs:
  services/index.html          (EN at site root, from page-services-en.html)
  vi/services/index.html       (from page-services.html)
  ja/services/index.html       (from page-services-ja.html)
  ko/services/index.html       (from page-services-ko.html)
  zh/services/index.html       (from page-services-zh.html)

Does not modify files under Houselink/.
"""
from __future__ import annotations

import html
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALL_SVC = ROOT.parent.parent / "Houselink" / "services"


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


def extract_services_main(doc: str) -> str:
    for needle in ('<section class="as-hero">', "<section class='as-hero'>"):
        i = doc.find(needle)
        if i != -1:
            j = doc.find("<footer", i)
            if j == -1:
                raise ValueError("footer not found after as-hero")
            return doc[i:j].strip()
    hi = doc.lower().find("</header>")
    if hi == -1:
        raise ValueError("no as-hero and no </header>")
    i = doc.find("<section", hi)
    j = doc.find("<footer", i)
    if i == -1 or j == -1:
        raise ValueError("could not locate main sections")
    return doc[i:j].strip()


def fix_services_links(s: str, home: str, login: str) -> str:
    s = bh().fix_houselink_links(s, home=home, login=login)
    s = s.replace("case-detail-exxon.html", "/vi/cases/exxon/")
    h = (home or "").strip()
    if h in ("/", ""):
        reg = "/register/"
    else:
        reg = home.rstrip("/") + "/register/"
    s = s.replace("auth-register-vi.html", reg)
    s = s.replace("auth-register-en.html", reg)
    return s


def write_page(
    out: Path,
    source_html: str,
    *,
    title: str,
    img_prefix: str,
    home: str,
    login: str,
    chrome_css: str,
    chrome_js: str,
) -> None:
    style = bh().extract_style(source_html)
    main = extract_services_main(source_html)
    main = bh().fix_unsplash_to_local(main, img_prefix)
    main = fix_services_links(main, home=home, login=login)

    inter = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
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
<body class="hl-with-fixed-header" data-hl-page="services-all">

<div id="hl-chrome-header"></div>

{main}

<div id="hl-chrome-footer"></div>
  <script src="{chrome_js}" defer></script>
</body>
</html>
"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")


def main() -> None:
    jobs = [
        ("page-services-en.html", ROOT / "services" / "index.html", "/", "/login/", "../landing-chrome.css", "../landing-chrome.js", "../images/"),
        ("page-services.html", ROOT / "vi" / "services" / "index.html", "/vi/", "/vi/login/", "../../landing-chrome.css", "../../landing-chrome.js", "../../images/"),
        ("page-services-ja.html", ROOT / "ja" / "services" / "index.html", "/ja/", "/ja/login/", "../../landing-chrome.css", "../../landing-chrome.js", "../../images/"),
        ("page-services-ko.html", ROOT / "ko" / "services" / "index.html", "/ko/", "/ko/login/", "../../landing-chrome.css", "../../landing-chrome.js", "../../images/"),
        ("page-services-zh.html", ROOT / "zh" / "services" / "index.html", "/zh/", "/zh/login/", "../../landing-chrome.css", "../../landing-chrome.js", "../../images/"),
    ]
    for fname, out, home, login, ccss, cjs, img in jobs:
        src = (ALL_SVC / fname).read_text(encoding="utf-8")
        title = bh().extract_title(src)
        write_page(
            out,
            src,
            title=title,
            img_prefix=img,
            home=home,
            login=login,
            chrome_css=ccss,
            chrome_js=cjs,
        )
        print("Wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
