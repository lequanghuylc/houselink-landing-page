#!/usr/bin/env python3
"""
KCN / Industrial Park wording pass:
- VI: KCN → Khu công nghiệp; normalize khu công nghiệp → Khu công nghiệp (longer phrases first).
- EN (default): KCN → Industrial Parks; Industrial Park → Industrial Parks (not Eco-/Green- compounds).
- JA / KO / ZH: replace KCN tokens and common English snippets per locale.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_PARTS = {".git", "node_modules"}

EXTS = {".html", ".js", ".md", ".css"}


def iter_files() -> list[Path]:
    out: list[Path] = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in EXTS:
            continue
        if any(x in p.parts for x in SKIP_PARTS):
            continue
        out.append(p)
    return sorted(out)


def is_under(p: Path, seg: str) -> bool:
    return seg in p.parts


def is_vi_file(p: Path) -> bool:
    if is_under(p, "vi"):
        return True
    n = p.name.lower()
    if "-vi.html" in n or n.endswith("_vi.html"):
        return True
    if p.name == "header-vi.html":
        return True
    return False


def protect_compounds(s: str) -> str:
    s = s.replace("Eco-Industrial Park", "\x00ECOIP\x00")
    s = s.replace("Eco-industrial park", "\x00ECOIPL\x00")
    s = s.replace("Green Industrial Park", "\x00GRIP\x00")
    return s


def unprotect_compounds(s: str) -> str:
    s = s.replace("\x00ECOIP\x00", "Eco-Industrial Park")
    s = s.replace("\x00ECOIPL\x00", "Eco-industrial park")
    s = s.replace("\x00GRIP\x00", "Green Industrial Park")
    return s


def en_industrial_park_to_parks(s: str) -> str:
    s = protect_compounds(s)
    s = re.sub(r"\bIndustrial Park(?!s)\b", "Industrial Parks", s)
    s = re.sub(r"\bindustrial park(?!s)\b", "industrial parks", s)
    s = unprotect_compounds(s)
    if "Industrial Parkss" in s or "Eco-Industrial Parks" in s or "Green Industrial Parks" in s:
        raise ValueError("bad replace: " + repr(s[:200]))
    return s


def apply_vi(s: str) -> str:
    s = s.replace("KCN Xanh", "Khu công nghiệp xanh")
    s = s.replace("KCN sinh thái", "Khu công nghiệp sinh thái")
    s = re.sub(r"\bKCN\b", "Khu công nghiệp", s)
    s = re.sub(r"\bkhu công nghiệp\b", "Khu công nghiệp", s, flags=re.IGNORECASE)
    return s


def apply_ja(s: str) -> str:
    s = s.replace("工業団地（KCN）", "工業団地")
    s = s.replace("（KCN）", "")
    s = s.replace("(KCN)", "")
    s = re.sub(r"\bKCN Network\b", "工業団地ネットワーク", s)
    s = re.sub(r"\bKCN\b", "工業団地", s)
    s = en_industrial_park_to_parks(s)
    return s


def apply_ko(s: str) -> str:
    s = s.replace("산업단지(KCN)", "산업단지")
    s = s.replace("(KCN)", "")
    s = s.replace("（KCN）", "")
    s = re.sub(r"\bKCN Development\b", "산업단지 개발", s)
    s = re.sub(r"\bKCN\b", "산업단지", s)
    s = en_industrial_park_to_parks(s)
    return s


def apply_zh(s: str) -> str:
    s = s.replace("工业园区（KCN）", "工业园区")
    s = s.replace("（KCN）", "")
    s = s.replace("(KCN)", "")
    s = re.sub(r"\bKCN Development\b", "工业园区开发", s)
    s = re.sub(r"\bKCN Authority\b", "园区管理机构", s)
    s = re.sub(r"\bKCN Network\b", "工业园区网络", s)
    s = re.sub(r"\bKCN\b", "工业园区", s)
    s = en_industrial_park_to_parks(s)
    return s


def apply_en_default(s: str) -> str:
    s = re.sub(r"\bKCN\b", "Industrial Parks", s)
    s = en_industrial_park_to_parks(s)
    return s


def transform(path: Path, raw: str) -> str | None:
    if path.suffix.lower() not in EXTS:
        return None
    s = raw
    if is_vi_file(path):
        s = apply_vi(s)
        s = en_industrial_park_to_parks(s)
        return s if s != raw else None
    if is_under(path, "ja"):
        s = apply_ja(s)
        return s if s != raw else None
    if is_under(path, "ko"):
        s = apply_ko(s)
        return s if s != raw else None
    if is_under(path, "zh"):
        s = apply_zh(s)
        return s if s != raw else None
    s = apply_en_default(s)
    return s if s != raw else None


def main() -> int:
    changed = 0
    for path in iter_files():
        try:
            raw = path.read_text(encoding="utf-8")
        except OSError:
            continue
        try:
            new = transform(path, raw)
        except ValueError as e:
            print("ERROR", path, e, file=sys.stderr)
            return 1
        if new is None:
            continue
        path.write_text(new, encoding="utf-8")
        changed += 1
        print(path.relative_to(ROOT))
    print("Updated", changed, "files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
