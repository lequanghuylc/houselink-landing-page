#!/usr/bin/env python3
"""Build localized /cases/exxon/ pages from vi/cases/exxon template + HTML fragments."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VI = ROOT / "vi" / "cases" / "exxon" / "index.html"
FRAG = ROOT / "tools" / "case_exxon_fragments"

START = '<section class="pg-hero"'
END = '<div id="hl-chrome-footer">'


def splice(base: str, fragment: str) -> str:
    i = base.index(START)
    j = base.index(END)
    return base[:i] + fragment.rstrip() + "\n\n" + base[j:]


def main() -> None:
    vi_txt = VI.read_text(encoding="utf-8")
    if START not in vi_txt or END not in vi_txt:
        raise SystemExit("Unexpected vi/cases/exxon structure")

    jobs = [
        (
            ROOT / "cases" / "exxon" / "index.html",
            (FRAG / "en.html").read_text(encoding="utf-8"),
            "en",
            "Case Study: Exxon Mobil expands construction lubricants in Vietnam – HOUSELINK",
            2,
        ),
        (
            ROOT / "ja" / "cases" / "exxon" / "index.html",
            (FRAG / "ja.html").read_text(encoding="utf-8"),
            "ja",
            "ケーススタディ：エクソンモービル、ベトナムにおける建設機械用潤滑油チャネル拡大 – HOUSELINK",
            3,
        ),
        (
            ROOT / "ko" / "cases" / "exxon" / "index.html",
            (FRAG / "ko.html").read_text(encoding="utf-8"),
            "ko",
            "케이스 스터디: Exxon Mobil, 베트남 건설용 윤활유 유통 확대 – HOUSELINK",
            3,
        ),
        (
            ROOT / "zh" / "cases" / "exxon" / "index.html",
            (FRAG / "zh.html").read_text(encoding="utf-8"),
            "zh",
            "案例研究：Exxon Mobil 在越南拓展建筑机械润滑油渠道 – HOUSELINK",
            3,
        ),
    ]

    vi_title_real = vi_txt.split("<title>", 1)[1].split("</title>", 1)[0]

    for out_path, frag, lang, title, depth in jobs:
        t = vi_txt
        t = t.replace("<html lang=\"vi\">", f'<html lang="{lang}">', 1)
        t = t.replace(f"<title>{vi_title_real}</title>", f"<title>{title}</title>", 1)
        if depth == 2:
            t = t.replace("../../../landing-chrome.css", "../../landing-chrome.css")
            t = t.replace("../../../landing-chrome.js", "../../landing-chrome.js")
        t = splice(t, frag)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(t, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
