#!/usr/bin/env python3
"""
One-off style helper: copy ``vi/<path>`` to ``zh|ja|ko/<path>`` for paths that
only existed under ``vi/`` (parity with other locales).

- Replaces ``/vi/`` URL prefix with the target locale.
- Sets ``<html lang>`` (zh-Hans / ja / ko).
- Replaces ``<title>`` for selected legal/content pages (see TITLES); redirect
  stubs keep ``Redirecting…``.

Body copy stays Vietnamese until a proper translation export exists.

Re-run after editing REL / TITLES if new vi-only pages appear:

  python3 tools/mirror_vi_gaps_to_zh_ja_ko.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VI = ROOT / "vi"

REL = [
    "case/ban-do-chuoi-cung-ung-ban-dan/index.html",
    "case/chuoi-cung-ung-det-may-may-mac/index.html",
    "case/chuoi-cung-ung-san-pham-kim-loai/index.html",
    "cases/exxon/index.html",
    "faq/index.html",
    "insights/fdi-recap/index.html",
    "news/esg-forum/index.html",
    "news/fdi/index.html",
    "privacy/index.html",
    "services/project-implementation/index.html",
    "team/ceo/index.html",
    "terms/index.html",
]

LANG = {"zh": "zh-Hans", "ja": "ja", "ko": "ko"}

TITLES: dict[str, dict[str, str]] = {
    "privacy/index.html": {
        "zh": "隐私政策 – HOUSELINK",
        "ja": "プライバシーポリシー – HOUSELINK",
        "ko": "개인정보 처리방침 – HOUSELINK",
    },
    "terms/index.html": {
        "zh": "使用条款 – HOUSELINK",
        "ja": "利用規約 – HOUSELINK",
        "ko": "이용약관 – HOUSELINK",
    },
    "faq/index.html": {
        "zh": "常见问题（FAQ）– HOUSELINK",
        "ja": "よくある質問（FAQ）– HOUSELINK",
        "ko": "자주 묻는 질문(FAQ) – HOUSELINK",
    },
    "cases/exxon/index.html": {
        "zh": "案例研究：埃克森美孚在越南的润滑油业务扩张 – HOUSELINK",
        "ja": "ケーススタディ：エクソンモービル ベトナムにおける潤滑油事業の拡大 – HOUSELINK",
        "ko": "사례 연구: 엑손모빌 베트남 윤활유 사업 확장 – HOUSELINK",
    },
    "insights/fdi-recap/index.html": {
        "zh": "2025年越南制造业FDI回顾 – HOUSELINK",
        "ja": "ベトナム製造業FDIリキャップ2025 – HOUSELINK",
        "ko": "2025 베트남 제조업 FDI 리캡 – HOUSELINK",
    },
    "news/esg-forum/index.html": {
        "zh": "平阳ESG研讨会 2026年3月31日 – HOUSELINK",
        "ja": "ビンズョン ESGフォーラム 2026年3月31日 – HOUSELINK",
        "ko": "빈증 ESG 포럼 2026년 3월 31일 – HOUSELINK",
    },
    "news/fdi/index.html": {
        "zh": "2026年第一季度越南FDI达67.4亿美元 – HOUSELINK",
        "ja": "2026年Q1 ベトナムFDI 67.4億米ドル – HOUSELINK",
        "ko": "2026년 1분기 베트남 FDI 67.4억 USD – HOUSELINK",
    },
    "team/ceo/index.html": {
        "zh": "阮成长 – HOUSELINK CEO – HOUSELINK",
        "ja": "グエン・タイン・ロン – HOUSELINK CEO – HOUSELINK",
        "ko": "응우옌 탄 롱 – HOUSELINK CEO – HOUSELINK",
    },
}


def is_redirect(html: str) -> bool:
    return "location.replace('/vi/" in html or 'content="0;url=/vi/' in html


def transform(html: str, loc: str, rel: str) -> str:
    lang = LANG[loc]
    h = html.replace("/vi/", f"/{loc}/")
    h = re.sub(r'<html\s+lang="vi"', f'<html lang="{lang}"', h, count=1, flags=re.I)
    if is_redirect(html):
        return h
    title = TITLES.get(rel)
    if title:
        h = re.sub(
            r"<title>[^<]*</title>",
            f"<title>{title[loc]}</title>",
            h,
            count=1,
            flags=re.I,
        )
    return h


def main() -> None:
    for rel in REL:
        src = VI / rel
        if not src.is_file():
            raise SystemExit(f"missing source {src}")
        raw = src.read_text(encoding="utf-8")
        for loc in ("zh", "ja", "ko"):
            dest = ROOT / loc / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(transform(raw, loc, rel), encoding="utf-8")
            print("wrote", dest)


if __name__ == "__main__":
    main()
