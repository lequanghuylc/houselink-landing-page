#!/usr/bin/env python3
"""Import Find Project contract + pricing pages from Houselink prototype into landing-page.

Output: ``services/find-project/pricing/`` and ``services/find-project/contract/`` (per locale).
Re-run after editing files in ``Houselink/New_20_04_2026/service findproject 2``.
"""

from __future__ import annotations

import re
from pathlib import Path

SCRIPT = Path(__file__).resolve()
LANDING = SCRIPT.parent.parent
REPO = LANDING.parent.parent
INPUT_DIR = REPO / "Houselink" / "New_20_04_2026" / "service findproject 2"

SOURCES: dict[tuple[str, str], str] = {
    ("en", "contract"): "service-findproject-contract-en.html",
    ("vi", "contract"): "service-findproject-contract-vi.html",
    ("ja", "contract"): "service-findproject-contract-ja.html",
    ("ko", "contract"): "service-findproject-contract-ko.html",
    ("zh", "contract"): "service-findproject-contract-zh.html",
    ("en", "pricing"): "service-findproject-pricing-en.html",
    ("vi", "pricing"): "service-findproject-pricing-vi2.html",
    ("ja", "pricing"): "service-findproject-pricing-ja.html",
    ("ko", "pricing"): "service-findproject-pricing-ko.html",
    ("zh", "pricing"): "service-findproject-pricing-zh.html",
}

HL_PAGE = {"contract": "services-find-project-contract", "pricing": "services-find-project-pricing"}


def fp_find_project(locale: str) -> str:
    if locale == "en":
        return "/services/find-project"
    return f"/{locale}/services/find-project"


def pricing_url(locale: str) -> str:
    return f"{fp_find_project(locale)}/pricing"


def contract_url(locale: str) -> str:
    return f"{fp_find_project(locale)}/contract"


def privacy_path(locale: str) -> str:
    return "/privacy/" if locale == "en" else f"/{locale}/privacy/"


def contact_path(locale: str) -> str:
    return "/contact/" if locale == "en" else f"/{locale}/contact/"


def chrome_rel(out_relpath: str) -> str:
    depth = len(Path(out_relpath).parent.parts)
    return ("../" * depth) + "landing-chrome"


def link_replacements(locale: str, kind: str) -> list[tuple[str, str]]:
    fp = fp_find_project(locale)
    pr = pricing_url(locale)
    ct = contract_url(locale)
    out: list[tuple[str, str]] = []

    def add(old: str, new: str) -> None:
        out.append((old, new))

    add("page-privacy.html", privacy_path(locale))
    add("page-contact.html", contact_path(locale))

    if locale == "en":
        add("service-findproject-pricing-en.html", f"{pr}/")
        add("service-findproject-contract-en.html", f"{ct}/")
        add("service-findproject-en.html", f"{fp}/")
        add("service-findproject.html", f"{fp}/")
    elif locale == "vi":
        add("service-findproject-pricing.html", f"{pr}/")
        add("service-findproject-contract.html", f"{ct}/")
        add("service-findproject.html", f"{fp}/")
    else:
        add(f"service-findproject-pricing-{locale}.html", f"{pr}/")
        add(f"service-findproject-contract-{locale}.html", f"{ct}/")
        add(f"service-findproject-{locale}.html", f"{fp}/")
        add("service-findproject.html", f"{fp}/")

    out.sort(key=lambda x: len(x[0]), reverse=True)
    return out


def transform(html: str, locale: str, kind: str, out_relpath: str) -> str:
    for old, new in link_replacements(locale, kind):
        html = html.replace(old, new)

    html = html.replace(
        "border-bottom:1px solid rgba(255,255,255,0.08);position:sticky;top:0;z-index:100;",
        "border-bottom:1px solid rgba(255,255,255,0.08);position:relative;",
    )

    lang = "zh-Hans" if locale == "zh" else locale
    html = re.sub(r"<html\s+lang=\"[^\"]*\"", f'<html lang="{lang}"', html, count=1)

    body_tag = f'<body class="hl-with-fixed-header" data-hl-page="{HL_PAGE[kind]}">'
    html = re.sub(r"<body\s*>", body_tag, html, count=1)

    if '<div id="hl-chrome-header"></div>' not in html:
        html = html.replace(body_tag, body_tag + '\n\n<div id="hl-chrome-header"></div>\n', 1)

    # Remove local duplicate top bar (HOUSELINK strip); shared #hl-chrome-header is the only site header.
    if kind == "contract":
        html = re.sub(
            r"<!-- TOPBAR -->[\s\S]*?<!-- STEPS -->",
            "<!-- STEPS -->",
            html,
            count=1,
        )
    else:
        html = re.sub(
            r"<!-- TOPBAR -->[\s\S]*?<!-- HERO -->",
            "<!-- HERO -->",
            html,
            count=1,
        )

    cr = chrome_rel(out_relpath)
    css_prefix = cr.replace("landing-chrome", "")
    inject = (
        f'  <link rel="stylesheet" href="{cr}.css">\n'
        f'  <link rel="stylesheet" href="{css_prefix}css/hl-find-project-flow.css">\n'
    )
    if "landing-chrome.css" not in html:
        html = html.replace("</head>", inject + "</head>", 1)

    html = re.sub(
        r'<div class="footer-mini"[^>]*>[\s\S]*?</div>\s*(?=<script>)',
        "",
        html,
        count=1,
    )

    footer_block = f'\n<div id="hl-chrome-footer"></div>\n<script src="{cr}.js" defer></script>\n'

    if "landing-chrome.js" not in html:
        html = html.replace("</body>", footer_block + "</body>", 1)

    return html


def out_relpath(locale: str, kind: str) -> str:
    sub = "contract" if kind == "contract" else "pricing"
    if locale == "en":
        return f"services/find-project/{sub}/index.html"
    return f"{locale}/services/find-project/{sub}/index.html"


def main() -> None:
    if not INPUT_DIR.is_dir():
        raise SystemExit(f"Missing input dir: {INPUT_DIR}")

    for (loc, kind), fname in SOURCES.items():
        src = INPUT_DIR / fname
        if not src.is_file():
            raise SystemExit(f"Missing source: {src}")
        rel = out_relpath(loc, kind)
        out = LANDING / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        raw = src.read_text(encoding="utf-8")
        out.write_text(transform(raw, loc, kind, rel), encoding="utf-8")
        print("Wrote", out.relative_to(LANDING))


if __name__ == "__main__":
    main()
