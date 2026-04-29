#!/usr/bin/env python3
"""
Build FAQ page from Houselink/legal/page-faq.html into landing-page.

Source: single Vietnamese prototype (Houselink/legal/page-faq.html). Output:
  vi/faq/index.html

Injects chrome header/footer, Inter + sansified CSS, rewrites prototype links.
Appends FAQ accordion/search script after chrome (it lived after </footer> in source).

Does not modify files under Houselink/.
"""
from __future__ import annotations

import html
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAQ_SRC = ROOT.parent.parent / "Houselink" / "legal" / "page-faq.html"


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


def extract_faq_main(doc: str) -> str:
    for needle in ('<section class="faq-hero">', "<section class='faq-hero'>"):
        i = doc.find(needle)
        if i != -1:
            j = doc.find("<footer", i)
            if j == -1:
                raise ValueError("footer not found after faq-hero")
            return doc[i:j].strip()
    raise ValueError("faq-hero not found")


def extract_faq_script(doc: str) -> str:
    pos = doc.find("function toggle(btn)")
    if pos == -1:
        raise ValueError("FAQ inline script not found")
    i = doc.rfind("<script>", 0, pos)
    j = doc.find("</script>", pos)
    if i == -1 or j == -1:
        raise ValueError("FAQ script boundaries not found")
    return doc[i : j + len("</script>")]


def fix_faq_links(s: str, home: str, login: str) -> str:
    s = bh().fix_houselink_links(s, home=home, login=login)
    svc = "/services/" if home == "/" else home.rstrip("/") + "/services/"
    s = s.replace('href="#services"', f'href="{svc}"')
    s = s.replace("case-detail-exxon.html", "/vi/cases/exxon/")
    reg = "/register/" if home == "/" else home.rstrip("/") + "/register/"
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
    main = extract_faq_main(source_html)
    main = bh().fix_unsplash_to_local(main, img_prefix)
    main = fix_faq_links(main, home=home, login=login)
    inline_script = extract_faq_script(source_html)

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
<body class="hl-with-fixed-header" data-hl-page="faq">

<div id="hl-chrome-header"></div>

{main}

<div id="hl-chrome-footer"></div>
  <script src="{chrome_js}" defer></script>
{inline_script}
</body>
</html>
"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")


def main() -> None:
    raw = FAQ_SRC.read_text(encoding="utf-8")
    title = bh().extract_title(raw)
    out = ROOT / "vi" / "faq" / "index.html"
    write_page(
        out,
        raw,
        title=title,
        img_prefix="../../images/",
        home="/vi/",
        login="/vi/login/",
        chrome_css="../../landing-chrome.css",
        chrome_js="../../landing-chrome.js",
    )
    print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
