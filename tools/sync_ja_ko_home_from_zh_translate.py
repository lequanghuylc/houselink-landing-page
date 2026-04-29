#!/usr/bin/env python3
"""
Replace JA/KO home main markup (hero → CTA) by translating ZH home body.

Source: app/landing-page/zh/index.html (Chinese is complete).
Houselink/home/houselink-landing-ja.html and -ko.html are corrupted (all NULs).

Uses deep-translator (Google) in chunks by section marker to preserve HTML.
"""
from __future__ import annotations

import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

try:
    from deep_translator import GoogleTranslator
except ImportError as e:
    raise SystemExit(
        "Install: python3 -m venv .venv-land-trans && . .venv-land-trans/bin/activate && pip install deep-translator\n"
        + str(e)
    ) from e


def split_by_section_comments(html: str) -> list[str]:
    """Split before each `<!-- ══ ... ══ -->` marker; first chunk is hero opening."""
    parts = re.split(r"(?=<!-- ══)", html)
    return [p for p in parts if p]


def translate_chunks(chunks: list[str], target: str) -> str:
    tr = GoogleTranslator(source="zh-CN", target=target)
    out: list[str] = []
    for i, ch in enumerate(chunks):
        if len(ch) > 4500:
            # rare: split long chunk on closing section boundary
            sub = re.split(r"(?=</section>)", ch)
            acc = ""
            for s in sub:
                if len(acc) + len(s) > 4000 and acc.strip():
                    out.append(tr.translate(acc))
                    time.sleep(0.35)
                    acc = s
                else:
                    acc += s
            if acc.strip():
                out.append(tr.translate(acc))
                time.sleep(0.35)
            continue
        if not ch.strip():
            out.append(ch)
            continue
        print(f"  [{target}] chunk {i + 1}/{len(chunks)} ({len(ch)} chars)")
        out.append(tr.translate(ch))
        time.sleep(0.45)
    return "".join(out)


def main() -> None:
    zh_path = ROOT / "zh" / "index.html"
    ja_path = ROOT / "ja" / "index.html"
    ko_path = ROOT / "ko" / "index.html"

    zh = zh_path.read_text(encoding="utf-8")
    ja_full = ja_path.read_text(encoding="utf-8")
    ko_full = ko_path.read_text(encoding="utf-8")

    start = "<section id=\"hero\">"
    end = "<!-- ══ FOOTER ══ -->"
    zi, zj = zh.find(start), zh.find(end)
    if zi < 0 or zj < 0 or zj <= zi:
        raise SystemExit("markers not found in zh/index.html")

    zh_body = zh[zi:zj]
    chunks = split_by_section_comments(zh_body)
    print("ZH body chunks:", len(chunks))

    print("Translating → Japanese…")
    ja_body = translate_chunks(chunks, "ja")
    ja_body = ja_body.replace('href="/zh/', 'href="/ja/')

    print("Translating → Korean…")
    ko_body = translate_chunks(chunks, "ko")
    ko_body = ko_body.replace('href="/zh/', 'href="/ko/')

    def splice(full: str, body: str) -> str:
        i, j = full.find(start), full.find(end)
        if i < 0 or j < 0:
            raise SystemExit("markers not found in target index.html")
        return full[:i] + body + full[j:]

    ja_path.write_text(splice(ja_full, ja_body), encoding="utf-8")
    ko_path.write_text(splice(ko_full, ko_body), encoding="utf-8")
    print("Wrote:", ja_path)
    print("Wrote:", ko_path)


if __name__ == "__main__":
    main()
