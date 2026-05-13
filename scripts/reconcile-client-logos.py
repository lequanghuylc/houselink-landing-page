#!/usr/bin/env python3
"""
Fix logo-clients HTML vs disk: rename broken refs, drop obsolete Ton Dong A row,
remove duplicate HSBC pill after WTW, drop logo rows whose file is missing on disk,
append any new-on-disk logos after brunau.

Run after updating files in images/logo-clients/:

  .venv/bin/python scripts/reconcile-client-logos.py

Strip transparent padding from raster logos first (optional):

  .venv/bin/python scripts/strip-logo-clients-padding.py
"""
from __future__ import annotations

import html
import re
import urllib.parse
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
LOGO_DIR = ROOT / "images" / "logo-clients"

# Old basename in HTML -> exact filename on disk (must exist).
SRC_RENAME: dict[str, str] = {
    "Blue scope-Photoroom.png": "Bluescope-Photoroom.png",
    "HD Hyundai electric.png": "HD-Hyundai-electric.png",
    "HSBC.png": "hsbc-Photoroom.png",
    "Buhler-Photoroom.png": "Buhler_logo_RGB-Photoroom.png",
    "Nakano.png": "nakano-Photoroom.png",
    "Newstecons-Photoroom.png": "newtecons-removebg-preview.png",
    "Thanhnam-Photoroom.png": "thanhnam-Photoroom.png",
    "Tradeco-Photoroom.png": "tradeco-Photoroom.png",
}

ALT_OVERRIDES: dict[str, str] = {
    "Legiaphuc-removebg-preview.png": "Le Gia Phuc",
    "105construction-Photoroom.png": "105 Construction",
    "Deltae&c-Photoroom.png": "Delta E&C",
    "Fecac-Photoroom.png": "Fuji CAC",
    "newtecons-removebg-preview.png": "Newtecons",
    "Tondonga-Photoroom.png": "Ton Dong A",
    "Tonmat-Photoroom.png": "Vietrust",
    "Wtw-Photoroom.png": "WTW",
    "hsbc-Photoroom.png": "HSBC",
    "Hyundaielectric-Photoroom.png": "Hyundai Electric",
    "HD-Hyundai-electric.png": "HD Hyundai Electric",
    "Bluescope-Photoroom.png": "Bluescope",
    "Becmex-Photoroom.png": "Becamex",
    "Phuocthanh-Photoroom.png": "Phuoc Thanh",
    "thanhnam-Photoroom.png": "Thanh Nam",
    "tradeco-Photoroom.png": "Tradeco",
    "Tuanle-Photoroom.png": "Tuan Le",
    "VTgroup-Photoroom.png": "VT Cons",
    "Vietnhat-Photoroom.png": "Viet Nhat",
    "Greenland-Photoroom.png": "Greenland",
    "IBS-Photoroom.png": "IBS",
    "NSN-Photoroom.png": "NSN",
    "Syre.png": "Syre",
    "Kajima.png": "Kajima",
    "Taisei-Photoroom.png": "Taisei",
    "BMB-Photoroom.png": "BMB Steel",
    "Arico-Photoroom.png": "Arico",
    "Buhler_logo_RGB-Photoroom.png": "Bühler",
    "nakano-Photoroom.png": "Nakano",
    "Greenviet-Photoroom-(1).png": "Greenviet",
}

TARGETS = [
    ROOT / "index.html",
    ROOT / "vi" / "index.html",
    ROOT / "ko" / "index.html",
    ROOT / "zh" / "index.html",
    ROOT / "ja" / "index.html",
    ROOT / "clients" / "index.html",
    ROOT / "vi" / "clients" / "index.html",
    ROOT / "ko" / "clients" / "index.html",
    ROOT / "zh" / "clients" / "index.html",
    ROOT / "ja" / "clients" / "index.html",
]


def encoded_src(fn: str) -> str:
    return quote(fn, safe=".-_")


def alt_text(fn: str) -> str:
    if fn in ALT_OVERRIDES:
        return ALT_OVERRIDES[fn]
    base = fn.replace("-Photoroom.png", "").replace(".png", "").replace(".svg", "")
    base = base.replace("-", " ").replace("_", " ")
    if not base:
        return fn
    return base[:1].upper() + base[1:]


def new_block(indent: str, pill_class: str, img_class: str, filenames: list[str]) -> str:
    lines: list[str] = []
    for fn in filenames:
        esc = encoded_src(fn)
        alt = html.escape(alt_text(fn), quote=True)
        lines.append(
            f'{indent}<div class="{pill_class}">'
            f'<img class="{img_class}" src="/images/logo-clients/{esc}" alt="{alt}" loading="lazy" decoding="async">'
            f"</div>"
        )
    return "\n".join(lines)


def existing_refs(text: str) -> set[str]:
    out: set[str] = set()
    for m in re.finditer(r'src="/images/logo-clients/([^"]+)"', text):
        out.add(urllib.parse.unquote(m.group(1)))
    return out


def apply_renames(text: str) -> str:
    for old, new in SRC_RENAME.items():
        old_enc = quote(old, safe=".-_")
        new_enc = quote(new, safe=".-_")
        text = text.replace(f"/images/logo-clients/{old_enc}", f"/images/logo-clients/{new_enc}")
        if old_enc != old:
            text = text.replace(f"/images/logo-clients/{old}", f"/images/logo-clients/{new_enc}")
    return text


def drop_ton_dong_a_line(text: str) -> str:
    lines = text.split("\n")
    return "\n".join(L for L in lines if "logo-clients/Ton%20dong%20a.png" not in L)


def drop_missing_logo_lines(text: str, disk: set[str]) -> str:
    """Remove logo-pill / cust-logo lines whose src file is not on disk (after renames)."""
    lines = text.split("\n")
    out: list[str] = []
    for line in lines:
        if "/images/logo-clients/" not in line:
            out.append(line)
            continue
        if "logo-pill" not in line and "cust-logo" not in line:
            out.append(line)
            continue
        m = re.search(r'src="/images/logo-clients/([^"]+)"', line)
        if not m:
            out.append(line)
            continue
        fn = urllib.parse.unquote(m.group(1))
        if fn not in disk:
            continue
        out.append(line)
    return "\n".join(out)


def drop_hsbc_after_wtw(text: str) -> str:
    # Marquee / logo-pill: WTW pill then duplicate HSBC pill (img src is inside child <img>).
    pill_pair = (
        r'(<div class="logo-pill[^"]*"[^>]*>'
        r'<img class="logo-pill__img" src="/images/logo-clients/Wtw-Photoroom\.png"[^>]*></div>)'
        r'\s*<div class="logo-pill[^"]*"[^>]*>'
        r'<img class="logo-pill__img" src="/images/logo-clients/hsbc-Photoroom\.png"[^>]*></div>'
    )
    text = re.sub(pill_pair, r"\1", text)
    text = re.sub(
        r'(<div class="cust-logo"><img class="cust-logo__img" src="/images/logo-clients/Wtw-Photoroom\.png"[^>]+></div>)\s*<div class="cust-logo"><img class="cust-logo__img" src="/images/logo-clients/hsbc-Photoroom\.png"[^>]+></div>',
        r"\1",
        text,
    )
    return text


def append_after_brunau(text: str, new_files: list[str]) -> tuple[str, int]:
    if not new_files or "logo-clients/brunau.png" not in text:
        return text, 0

    brunau_re = re.compile(
        r"^(\s*)(<div class=\"(logo-pill logo-pill--img|cust-logo)\">"
        r"<img class=\"(logo-pill__img|cust-logo__img)\" src=\"/images/logo-clients/brunau\.png\" alt=\"brunau\"[^>]*></div>\s*)$",
        re.MULTILINE,
    )

    def repl(m: re.Match[str]) -> str:
        indent = m.group(1)
        wrapper = m.group(3)
        img_cls = m.group(4)
        return m.group(0) + "\n" + new_block(indent, wrapper, img_cls, new_files)

    new_text, n = brunau_re.subn(repl, text)
    return new_text, n


def main() -> None:
    disk = {
        p.name
        for p in LOGO_DIR.iterdir()
        if p.is_file()
        and not p.name.startswith(".")
        and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".svg", ".webp")
    }

    for path in TARGETS:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if "/images/logo-clients/" not in text:
            continue

        text = apply_renames(text)
        text = drop_ton_dong_a_line(text)
        text = drop_hsbc_after_wtw(text)

        text = drop_missing_logo_lines(text, disk)
        refs = existing_refs(text)
        missing_on_disk = sorted(refs - disk)
        new_only = sorted(disk - refs)

        if missing_on_disk:
            print(path.relative_to(ROOT), "WARN still missing on disk:", missing_on_disk[:12])

        text, n = append_after_brunau(text, new_only)
        path.write_text(text, encoding="utf-8")
        print(path.relative_to(ROOT), f"appended {len(new_only)} new logos in {n} slot(s)")


if __name__ == "__main__":
    main()
