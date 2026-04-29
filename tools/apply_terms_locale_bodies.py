#!/usr/bin/env python3
"""Splice localized hero+legal body into terms pages from vi/terms template."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VI = ROOT / "vi" / "terms" / "index.html"
FRAG = ROOT / "tools" / "terms_locale_fragments"

START = '<section class="page-hero" style="padding-top:96px;">'
END = '<div id="hl-chrome-footer">'


def splice(base: str, fragment: str) -> str:
    i = base.index(START)
    j = base.index(END)
    return base[:i] + fragment.rstrip() + "\n\n" + base[j:]


def main() -> None:
    vi_txt = VI.read_text(encoding="utf-8")
    if START not in vi_txt or END not in vi_txt:
        raise SystemExit("Unexpected vi/terms structure")

    jobs = [
        (
            "en",
            ROOT / "terms" / "index.html",
            (FRAG / "en.html").read_text(encoding="utf-8"),
            "en",
            "Terms of Use – HOUSELINK",
            "../landing-chrome.css",
            "../landing-chrome.js",
        ),
        (
            "ja",
            ROOT / "ja" / "terms" / "index.html",
            (FRAG / "ja.html").read_text(encoding="utf-8"),
            "ja",
            "利用規約 – HOUSELINK",
            "../../landing-chrome.css",
            "../../landing-chrome.js",
        ),
        (
            "ko",
            ROOT / "ko" / "terms" / "index.html",
            (FRAG / "ko.html").read_text(encoding="utf-8"),
            "ko",
            "이용약관 – HOUSELINK",
            "../../landing-chrome.css",
            "../../landing-chrome.js",
        ),
        (
            "zh",
            ROOT / "zh" / "terms" / "index.html",
            (FRAG / "zh.html").read_text(encoding="utf-8"),
            "zh",
            "使用条款 – HOUSELINK",
            "../../landing-chrome.css",
            "../../landing-chrome.js",
        ),
    ]

    for _loc, out_path, frag, lang, title, css_href, js_src in jobs:
        t = vi_txt
        t = t.replace('<html lang="vi">', f'<html lang="{lang}">', 1)
        t = t.replace("<title>Điều khoản Sử dụng – HOUSELINK</title>", f"<title>{title}</title>", 1)
        t = t.replace(
            '<link rel="stylesheet" href="../../landing-chrome.css">',
            f'<link rel="stylesheet" href="{css_href}">',
            1,
        )
        t = t.replace(
            '<script src="../../landing-chrome.js" defer></script>',
            f'<script src="{js_src}" defer></script>',
            1,
        )
        t = splice(t, frag)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(t, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
