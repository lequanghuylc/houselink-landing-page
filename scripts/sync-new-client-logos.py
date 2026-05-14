#!/usr/bin/env python3
"""Append newly added logo-clients files after each brunau row (marquee, cust grid, clients strip)."""
from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
LOGO_DIR = ROOT / "images" / "logo-clients"

# Files already listed in HTML before brunau (basename set built at runtime).
ALT_OVERRIDES: dict[str, str] = {
    "Legiaphuc-removebg-preview.png": "Le Gia Phuc",
    "105construction-Photoroom.png": "105 Construction",
    "Deltae&c-Photoroom.png": "Delta E&C",
    "Fecac-Photoroom.png": "Fuji CAC",
    "Newstecons-Photoroom.png": "Newtecons",
    "Tondonga-Photoroom.png": "Ton Dong A",
    "Tonmat-Photoroom.png": "Vietrust",
    "Wtw-Photoroom.png": "WTW",
    "hsbc-Photoroom.png": "HSBC",
    "Hyundaielectric-Photoroom.png": "Hyundai Electric",
    "Becmex-Photoroom.png": "Becamex",
    "Phuocthanh-Photoroom.png": "Phuoc Thanh",
    "Thanhnam-Photoroom.png": "Thanh Nam",
    "Tradeco-Photoroom.png": "Tradeco",
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
        from urllib.parse import unquote

        out.add(unquote(m.group(1)))
    return out


def main() -> None:
    on_disk = sorted(
        p.name
        for p in LOGO_DIR.iterdir()
        if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".svg", ".webp")
    )

    ref_sample = (ROOT / "index.html").read_text(encoding="utf-8")
    known = existing_refs(ref_sample)
    new_only = [f for f in on_disk if f not in known]
    if not new_only:
        print("No new logo files to add (all on disk already referenced in index.html).")
        return

    print("Adding", len(new_only), "logos:", ", ".join(new_only))

    brunau_re = re.compile(
        r'^(\s*)(<div class="(logo-pill logo-pill--img|cust-logo)">'
        r'<img class="(logo-pill__img|cust-logo__img)" src="/images/logo-clients/brunau\.png" alt="brunau"[^>]*></div>\s*)$',
        re.MULTILINE,
    )

    for path in TARGETS:
        text = path.read_text(encoding="utf-8")
        if "logo-clients/brunau.png" not in text:
            print("skip (no brunau):", path.relative_to(ROOT))
            continue

        def repl(m: re.Match[str]) -> str:
            indent = m.group(1)
            wrapper = m.group(3)
            img_cls = m.group(4)
            return m.group(0) + "\n" + new_block(indent, wrapper, img_cls, new_only)

        new_text, n = brunau_re.subn(repl, text)
        if n == 0:
            print("WARN no brunau match:", path.relative_to(ROOT))
            continue
        path.write_text(new_text, encoding="utf-8")
        print("patched", n, "x", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
