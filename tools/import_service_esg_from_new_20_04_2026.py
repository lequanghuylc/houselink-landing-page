#!/usr/bin/env python3
"""
Import ESG service detail pages from:
  Houselink/New_20_04_2026/Service ESG/service-esg-*.html
into:
  app/landing-page/services/esg/index.html (en)
  app/landing-page/{ja,ko,zh}/services/esg/index.html

Rewrites prototype topbar/footer, fonts (Inter), image paths, locale-prefixed
links, and injects landing-chrome header/footer.

Does not modify files under Houselink/.
"""
from __future__ import annotations

import html as html_lib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT.parent.parent / "Houselink" / "New_20_04_2026" / "Service ESG"

INTER_HEAD = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">"""

FONT_ROOT_LINE = (
    "--font-main: \"Inter\", system-ui, -apple-system, BlinkMacSystemFont, "
    '"Segoe UI", sans-serif; --font-serif: var(--font-main);'
)

OLD_FONT_LINK = re.compile(
    r"<link href=\"https://fonts\.googleapis\.com/css2\?family=Be\+Vietnam\+Pro[^>]+>",
    re.MULTILINE,
)

OLD_FONT_VARS = re.compile(
    r"--font-main:'Be Vietnam Pro',sans-serif;--font-serif:'DM Serif Display',serif;",
)

TOPBAR_BLOCK = re.compile(
    r"<body>\s*<!-- TOPBAR -->.*?<!-- HERO -->",
    re.DOTALL,
)

FOOTER_TAIL = re.compile(
    r"<div class=\"footer-mini.*?</body>\s*</html>\s*",
    re.DOTALL,
)

UNSPLASH_IMG = re.compile(
    r"https://images\.unsplash\.com/photo-1466611653911-95081537e5b7[^\"]*"
)


def abs_href(prefix: str, tail: str) -> str:
    tail = tail.lstrip("/")
    if not prefix:
        return "/" + tail
    return prefix.rstrip("/") + "/" + tail


def home_href(prefix: str) -> str:
    if not prefix:
        return "/"
    return prefix.rstrip("/") + "/"


def transform(src_html: str, url_prefix: str, asset_rel: str) -> str:
    contact = abs_href(url_prefix, "contact/")
    home = home_href(url_prefix)

    m = re.search(r"<title>(.*?)</title>", src_html, re.DOTALL)
    if m:
        inner = m.group(1)
        if "&" in inner and "&amp;" not in inner:
            inner = html_lib.escape(inner, quote=False)
        src_html = src_html[: m.start(1)] + inner + src_html[m.end(1) :]

    out = OLD_FONT_LINK.sub(INTER_HEAD, src_html, count=1)
    out = OLD_FONT_VARS.sub(FONT_ROOT_LINE, out, count=1)

    out = out.replace(".cta-btns{", ".cta-bar-btns{")
    out = out.replace('class="cta-btns"', 'class="cta-bar-btns"')

    out = out.replace(
        ".hero-ctas{display:flex;gap:12px;flex-wrap:wrap;}",
        ".hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px;}",
    )

    if ".cta-bar-btns{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}" not in out:
        out = out.replace(
            "@media(max-width:960px){.svc-grid3{grid-template-columns:1fr;}.two-col{grid-template-columns:1fr;}}",
            "@media(max-width:960px){.svc-grid3{grid-template-columns:1fr;}.two-col{grid-template-columns:1fr;}}\n"
            ".cta-bar-btns{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}",
        )

    out = out.replace(
        "</style>\n</head>",
        f'</style>\n  <link rel="stylesheet" href="{asset_rel}landing-chrome.css">\n</head>',
        1,
    )

    out = TOPBAR_BLOCK.sub(
        f'<body class="hl-with-fixed-header" data-hl-page="services-esg">\n\n'
        f'<div id="hl-chrome-header"></div>\n\n<!-- HERO -->',
        out,
        count=1,
    )

    out = out.replace('href="#contact" class="btn-g"', f'href="{contact}" class="btn-g"')

    img_local = f"{asset_rel}images/unsplash-1466611653911-95081537e5b7.jpg"
    out = UNSPLASH_IMG.sub(img_local, out)

    out = out.replace('href="page-contact.html"', f'href="{contact}"')
    out = out.replace('href="houselink-landing-v6-2.html"', f'href="{home}"')

    out = FOOTER_TAIL.sub(
        f'<div id="hl-chrome-footer"></div>\n'
        f'  <script src="{asset_rel}landing-chrome.js" defer></script>\n'
        f"</body>\n</html>\n",
        out,
        count=1,
    )

    return out


def main() -> None:
    jobs: list[tuple[str, Path, str, str]] = [
        ("service-esg-en.html", ROOT / "services" / "esg" / "index.html", "", "../../"),
        ("service-esg-vi3.html", ROOT / "vi" / "services" / "esg" / "index.html", "/vi", "../../../"),
        ("service-esg-ja.html", ROOT / "ja" / "services" / "esg" / "index.html", "/ja", "../../../"),
        ("service-esg-ko.html", ROOT / "ko" / "services" / "esg" / "index.html", "/ko", "../../../"),
        ("service-esg-zh.html", ROOT / "zh" / "services" / "esg" / "index.html", "/zh", "../../../"),
    ]
    for src_name, dest, prefix, asset_rel in jobs:
        src = SRC_DIR / src_name
        if not src.is_file():
            raise SystemExit(f"Missing source: {src}")
        raw = src.read_text(encoding="utf-8")
        out = transform(raw, prefix, asset_rel)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out, encoding="utf-8")
        print(f"Wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
