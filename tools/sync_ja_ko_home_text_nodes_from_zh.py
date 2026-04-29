#!/usr/bin/env python3
"""
Fill JA/KO home page main body text from ZH, translating only text nodes (keeps id/class intact).

Requires: .venv-land-trans with `pip install beautifulsoup4 lxml deep-translator`

Note: `ja/index.html` / `ko/index.html` may be **locale-root 404 stubs** (`<!-- hl:locale-root-404 -->` from `sync_root_404.py`). Those are skipped. Files marked `hl:handrolled-locale-home` are also skipped. If both targets are missing, the script no-ops.
"""
from __future__ import annotations

import time
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString
from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]

START = "<section id=\"hero\">"
END = "<!-- ══ FOOTER ══ -->"

STUB_MARK = "hl:locale-root-404"
HANDROLLED_MARK = "hl:handrolled-locale-home"


def is_locale_root_404_stub(path: Path) -> bool:
    try:
        return STUB_MARK in path.read_text(encoding="utf-8")[:8000]
    except OSError:
        return False


def is_handrolled_locale_home(path: Path) -> bool:
    try:
        return HANDROLLED_MARK in path.read_text(encoding="utf-8")[:8000]
    except OSError:
        return False


def has_cjk(s: str) -> bool:
    for ch in s:
        if "\u4e00" <= ch <= "\u9fff":
            return True
    return False


def translate_text_nodes(fragment_html: str, target: str) -> str:
    soup = BeautifulSoup(fragment_html, "lxml")
    tr = GoogleTranslator(source="zh-CN", target=target)
    for el in list(soup.descendants):
        if not isinstance(el, NavigableString) or isinstance(el, Comment):
            continue
        parent = el.parent
        if not parent or parent.name in ("script", "style"):
            continue
        t = str(el)
        if not has_cjk(t):
            continue
        for attempt in range(4):
            try:
                el.replace_with(tr.translate(t))
                time.sleep(0.22)
                break
            except Exception:
                time.sleep(1.2 * (attempt + 1))
        else:
            raise RuntimeError(f"translate failed after retries: {t[:80]!r}")
    # lxml wraps fragment in html/body
    if soup.body:
        return soup.body.decode_contents()
    return str(soup)


def splice(full: str, body: str) -> str:
    i, j = full.find(START), full.find(END)
    if i < 0 or j < 0:
        raise SystemExit("markers missing in target")
    return full[:i] + body + full[j:]


def main() -> None:
    ja_ix = ROOT / "ja" / "index.html"
    ko_ix = ROOT / "ko" / "index.html"
    if not ja_ix.exists() and not ko_ix.exists():
        print("Skip: ja/index.html and ko/index.html are absent.")
        return

    zh_full = (ROOT / "zh" / "index.html").read_text(encoding="utf-8")
    zi, zj = zh_full.find(START), zh_full.find(END)
    zh_body = zh_full[zi:zj]

    for target, path, prefix in (
        ("ja", ja_ix, "/ja/"),
        ("ko", ko_ix, "/ko/"),
    ):
        if not path.exists():
            print("Skip missing", path)
            continue
        if is_locale_root_404_stub(path):
            print("Skip locale-root 404 stub:", path)
            continue
        if is_handrolled_locale_home(path):
            print("Skip handrolled locale home:", path)
            continue
        print("Building", path.name, target)
        body = translate_text_nodes(zh_body, target)
        body = body.replace('href="/zh/', f'href="{prefix}')
        full = path.read_text(encoding="utf-8")
        path.write_text(splice(full, body), encoding="utf-8")
        print("Wrote", path)


if __name__ == "__main__":
    main()
