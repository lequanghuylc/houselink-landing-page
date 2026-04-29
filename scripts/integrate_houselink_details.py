#!/usr/bin/env python3
"""One-off: port Houselink/Company/Page */detail*.html into app/landing-page/vi/* with chrome.

Detail prototypes sit next to hub exports (e.g. ``Page case/case-detail-exxon.html``), not under a shared ``details/`` folder.

Auth mockups (login / register / forgot) use locale paths: /login/ (EN at site root), /vi/login/, /ja/login/, …
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
HOUSELINK = REPO / "Houselink"
HOUSELINK_COMPANY = HOUSELINK / "Company"
APP_LP = REPO / "app" / "landing-page"

# (source_rel under Company/, e.g. "Page case/…", dest_rel_to_app_lp, data_hl_page)
JOBS: list[tuple[str, str, str]] = [
    ("Page case/case-detail-exxon.html", "vi/cases/exxon/index.html", "case-exxon"),
    ("Page insights/insight-detail-fdi-recap.html", "vi/insights/fdi-recap/index.html", "insight-fdi-recap"),
    ("Page news/news-detail-esg-forum.html", "vi/news/esg-forum/index.html", "news-esg-forum"),
    ("Page news/news-detail-fdi.html", "vi/news/fdi/index.html", "news-fdi-q1"),
    ("Page careers/job-detail-analyst.html", "vi/jobs/analyst/index.html", "job-analyst"),
    ("Page careers/job-detail-esg.html", "vi/jobs/esg/index.html", "job-esg"),
    ("Page team/team-detail-ceo.html", "vi/team/ceo/index.html", "team-ceo"),
]

LINK_REPLACEMENTS: list[tuple[str, str]] = [
    ("houselink-landing-v6-2.html#database", "/vi/#database"),
    ("houselink-landing-v6-2.html#for-contractors", "/vi/#for-contractors"),
    ("houselink-landing-v6-2.html", "/vi/"),
    ("page-cases.html", "/vi/cases/"),
    ("page-insights.html", "/vi/insights/"),
    ("page-news.html", "/vi/news/"),
    ("page-contact.html", "/vi/contact/"),
    ("page-careers.html", "/vi/careers/"),
    ("page-team.html", "/vi/team/"),
    ("page-clients.html", "/vi/clients/"),
    ("page-about.html", "/vi/about/"),
    ("page-esg.html", "/vi/esg/"),
    ("page-privacy.html", "/vi/privacy/"),
    ("page-terms.html", "/vi/terms/"),
    ("service-market.html", "/vi/services/market/"),
    ("service-land.html", "/vi/services/land/"),
    ("service-legal.html", "/vi/services/legal/"),
    ("service-project.html", "/vi/services/project/"),
    ("service-esg-7.html", "/vi/services/esg/"),
    ("service-esg.html", "/vi/services/esg/"),
    ("service-findproject.html", "/vi/services/find-project/"),
    ("lien-he.html", "/vi/contact/"),
    ("case-detail-hitachi.html", "/vi/cases/"),
    ("case-detail-ev.html", "/vi/cases/"),
    ("case-detail-kcn.html", "/vi/cases/"),
]

def _auth_html_to_public_path() -> list[tuple[str, str]]:
    """Legacy Houselink filenames → canonical landing URLs."""
    out: list[tuple[str, str]] = []
    for loc in ("vi", "en", "ja", "ko", "zh"):
        for kind in ("login", "register", "forgot"):
            name = f"auth-{kind}-{loc}.html"
            if loc == "en":
                url = f"/{kind}/"
            else:
                url = f"/{loc}/{kind}/"
            out.append((name, url))
    return out


LINK_REPLACEMENTS.extend(_auth_html_to_public_path())


def chrome_prefix(depth: int) -> str:
    return ("../" * depth) if depth else ""


def extract_parts(raw: str) -> tuple[str, str, str]:
    m_title = re.search(r"<title>([^<]*)</title>", raw, re.I)
    title = m_title.group(1).strip() if m_title else "HOUSELINK"
    m_style = re.search(r"(?s)<style>(.*?)</style>", raw)
    if not m_style:
        raise ValueError("no <style> block")
    style = m_style.group(1)
    m_body = re.search(r"(?s)</header>\s*(.*?)\s*<footer", raw)
    if not m_body:
        raise ValueError("no </header>…<footer> slice")
    inner = m_body.group(1).strip()
    return title, style, inner


def normalize_style(style: str) -> str:
    s = style
    s = s.replace("'Be Vietnam Pro', sans-serif", "'Inter', sans-serif")
    s = s.replace('"Be Vietnam Pro", sans-serif', "'Inter', sans-serif")
    s = s.replace("'DM Serif Display', serif", "var(--font-main)")
    s = s.replace('"DM Serif Display", serif', "var(--font-main)")
    return s


def fix_links(html: str) -> str:
    out = html
    for a, b in LINK_REPLACEMENTS:
        out = out.replace(a, b)
    return out


def build_page(title: str, style: str, inner: str, page_key: str, depth: int) -> str:
    cp = chrome_prefix(depth)
    inner = fix_links(inner)
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{style}
</style>
  <link rel="stylesheet" href="{cp}landing-chrome.css">
</head>
<body class="hl-with-fixed-header" data-hl-page="{page_key}">
<div id="hl-chrome-header"></div>

{inner}

<div id="hl-chrome-footer"></div>
  <script src="{cp}landing-chrome.js" defer></script>
</body>
</html>
"""


def main() -> int:
    if not HOUSELINK.is_dir():
        print("Missing Houselink folder:", HOUSELINK, file=sys.stderr)
        return 1
    for src_rel, dest_rel, page_key in JOBS:
        src = HOUSELINK_COMPANY / src_rel
        if not src.is_file():
            print("Skip (missing):", src)
            continue
        raw = src.read_text(encoding="utf-8", errors="replace")
        title, style, inner = extract_parts(raw)
        style = normalize_style(style)
        depth = dest_rel.count("/")
        out_path = APP_LP / dest_rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(build_page(title, style, inner, page_key, depth), encoding="utf-8")
        print("Wrote", out_path.relative_to(REPO))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
