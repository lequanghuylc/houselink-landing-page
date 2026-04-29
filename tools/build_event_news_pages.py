#!/usr/bin/env python3
"""
Import event detail + calendar HTML from Houselink/Detail events 28_04 into app/landing-page news.

Outputs (per locale vi, en, ja, ko, zh):
  - {prefix}events-calendar/kcn-mien-bac-2026/index.html  from event-kcn-mien-bac-2026-{lang}.html
  - {prefix}events-calendar/index.html                    from event-calendar-{lang}.html

EN: /events-calendar/... (no /en/). Others: /{locale}/events-calendar/...
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT.parent.parent / "Houselink" / "Detail events 28_04"

LOCALES = ("vi", "en", "ja", "ko", "zh")

CHROME_OFFSET_CSS = """
/* Offset for fixed landing header (replaces prototype topbar) */
body.hl-with-fixed-header.hl-event-news-page .ev-hero {
  padding-top: calc(var(--header-h, 72px) + 20px) !important;
}
body.hl-with-fixed-header.hl-event-news-page .cal-hero {
  padding-top: calc(var(--header-h, 72px) + 20px) !important;
}
body.hl-with-fixed-header.hl-event-news-page .filter-bar {
  top: var(--header-h, 72px) !important;
}
body.hl-with-fixed-header.hl-event-news-page .reg-card {
  top: calc(var(--header-h, 72px) + 12px) !important;
}
"""

TOPBAR_RE = re.compile(
    r"<!-- TOPBAR -->.*?(?=<!-- HERO -->|<section class=\"cal-hero\">|<section class=\"ev-hero\">)",
    re.DOTALL,
)

FOOTER_MINI_RE = re.compile(
    r'<div class="footer-mini">\s*.*?</div>\s*',
    re.DOTALL,
)


def path_prefix_depth(out_path: Path) -> int:
    rel = out_path.relative_to(ROOT)
    return len(rel.parts) - 1


def pp(depth: int) -> str:
    return ("../" * depth) if depth else "./"


def site_prefix(locale: str) -> str:
    if locale == "en":
        return "/"
    return f"/{locale}/"


def news_index(locale: str) -> str:
    return f"{site_prefix(locale)}news/"


def contact_url(locale: str) -> str:
    return f"{site_prefix(locale)}contact/"


def privacy_url(locale: str) -> str:
    return f"{site_prefix(locale)}privacy/"


def kcn_url(locale: str) -> str:
    return f"{site_prefix(locale)}events-calendar/kcn-mien-bac-2026/"


def calendar_url(locale: str) -> str:
    return f"{site_prefix(locale)}events-calendar/"


def rewrite_links(html: str, locale: str) -> str:
    home = site_prefix(locale)
    nidx = news_index(locale)
    contact = contact_url(locale)
    privacy = privacy_url(locale)
    kcn = kcn_url(locale)
    cal = calendar_url(locale)
    esg = f"{news_index(locale)}esg-forum/"

    pairs = [
        ("houselink-landing-v6-2.html", home),
        ("page-news.html", nidx),
        ("page-contact.html", contact),
        ("page-privacy.html", privacy),
        ("event-kcn-mien-bac-2026-vi.html", kcn),
        ("event-kcn-mien-bac-2026-en.html", kcn),
        ("event-kcn-mien-bac-2026-ja.html", kcn),
        ("event-kcn-mien-bac-2026-ko.html", kcn),
        ("event-kcn-mien-bac-2026-zh.html", kcn),
        ("event-kcn-mien-bac-2026.html", kcn),
        ("event-calendar-vi.html", cal),
        ("event-calendar-en.html", cal),
        ("event-calendar-ja.html", cal),
        ("event-calendar-ko.html", cal),
        ("event-calendar-zh.html", cal),
        ("event-calendar.html", cal),
        ("event-esg-forum-hcm-2026.html", esg),
        ("service-findproject-pricing.html", "/vi/services/find-project/"),
    ]
    for a, b in pairs:
        html = html.replace(f'href="{a}"', f'href="{b}"')
        html = html.replace(f"href='{a}'", f"href='{b}'")
    return html


def inject_head(html: str, depth: int) -> str:
    pre = pp(depth)
    link = f'  <link rel="stylesheet" href="{pre}landing-chrome.css">\n'
    if "landing-chrome.css" not in html:
        html = html.replace("</head>", link + "</head>", 1)
    if "hl-event-news-page" not in html:
        html = html.replace("</style>", CHROME_OFFSET_CSS.rstrip() + "\n</style>", 1)
    return html


def inject_body(html: str, hl_page: str) -> str:
    def repl_body(m: re.Match[str]) -> str:
        inner = m.group(1).strip()
        if inner:
            return f'<body class="hl-with-fixed-header hl-event-news-page {inner}" data-hl-page="{hl_page}">'
        return f'<body class="hl-with-fixed-header hl-event-news-page" data-hl-page="{hl_page}">'

    html = re.sub(r"<body\s*([^>]*)>", repl_body, html, count=1)
    html = re.sub(r"(<body[^>]*>)", r'\1\n<div id="hl-chrome-header"></div>', html, count=1)
    return html


def strip_topbar(html: str) -> str:
    return TOPBAR_RE.sub("", html, count=1)


def strip_footer_mini(html: str) -> str:
    return FOOTER_MINI_RE.sub("", html, count=1)


def inject_footer(html: str, depth: int) -> str:
    pre = pp(depth)
    block = (
        f'\n<div id="hl-chrome-footer"></div>\n'
        f'  <script src="{pre}landing-chrome.js" defer></script>\n'
        f'  <script src="{pre}js/auth-locale-validation.js" defer></script>\n'
    )
    if "hl-chrome-footer" in html:
        return html
    html = html.replace("</body>", block + "</body>", 1)
    return html


def build_one(src_name: str, out_rel: Path, hl_page: str, locale: str) -> None:
    src = SRC_DIR / src_name
    if not src.is_file():
        raise FileNotFoundError(src)
    text = src.read_text(encoding="utf-8")
    text = strip_topbar(text)
    text = strip_footer_mini(text)
    text = rewrite_links(text, locale)

    out_path = ROOT / out_rel
    out_path.mkdir(parents=True, exist_ok=True)
    depth = path_prefix_depth((out_path / "index.html").resolve())

    text = inject_head(text, depth)
    text = inject_body(text, hl_page)
    text = inject_footer(text, depth)

    (out_path / "index.html").write_text(text, encoding="utf-8")
    print("Wrote", out_rel.as_posix())


def main() -> None:
    if not SRC_DIR.is_dir():
        raise SystemExit(f"Missing source dir: {SRC_DIR}")

    for loc in LOCALES:
        suffix = "en" if loc == "en" else loc
        if loc == "en":
            cal_base = Path("events-calendar")
        else:
            cal_base = Path(loc) / "events-calendar"

        build_one(
            f"event-kcn-mien-bac-2026-{suffix}.html",
            cal_base / "kcn-mien-bac-2026",
            "events-kcn-mien-bac",
            loc,
        )
        build_one(
            f"event-calendar-{suffix}.html",
            cal_base,
            "events-calendar",
            loc,
        )


if __name__ == "__main__":
    main()
