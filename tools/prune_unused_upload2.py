#!/usr/bin/env python3
"""
Xóa ảnh trong images/upload2 không còn được tham chiếu từ phần còn lại của repo.

- Quét .json/.html/.htm/.js/.css/.svg/.md/.ts/.tsx/.jsx/.vue (bỏ qua cây images/upload2)
  tìm URL /images/upload2/... hoặc /images/upload%202/...
- Chỉ xóa file có đuôi ảnh (.jpg, .jpeg, .png, .webp, .gif, .bmp, .ico, .avif).
  HTML/JS/CSS khác trong upload2 được giữ (microsite, asset tay).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
UP2 = ROOT / "images" / "upload2"

REF_RE = re.compile(
    r"/images/(?:upload2|upload%202)/([^\"'\s>)#?]+)",
    re.I,
)

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".ico", ".avif"}

SCAN_SUFFIXES = {
    ".json",
    ".html",
    ".htm",
    ".js",
    ".css",
    ".svg",
    ".md",
    ".tsx",
    ".ts",
    ".jsx",
    ".vue",
}


def under_upload2(p: Path) -> bool:
    try:
        p.resolve().relative_to(UP2.resolve())
        return True
    except ValueError:
        return False


def refs_upload2_from_text(text: str) -> list[Path]:
    found: list[Path] = []
    for m in REF_RE.finditer(text):
        tail = unquote(m.group(1).split("?")[0].split("#")[0]).replace("\\", "/")
        if ".." in tail.split("/"):
            continue
        cand = (UP2 / tail).resolve()
        if cand.is_file() and under_upload2(cand):
            found.append(cand)
    return found


def iter_scan_files() -> list[Path]:
    out: list[Path] = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if under_upload2(p):
            continue
        parts = set(p.parts)
        if ".git" in parts or "node_modules" in parts:
            continue
        if p.suffix.lower() in SCAN_SUFFIXES:
            out.append(p)
    return out


def collect_used_images() -> set[Path]:
    used: set[Path] = set()
    for p in iter_scan_files():
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for fp in refs_upload2_from_text(text):
            if fp.suffix.lower() in IMAGE_EXT:
                used.add(fp)
    return used


def main() -> None:
    if not UP2.is_dir():
        print("Không có thư mục:", UP2, file=sys.stderr)
        sys.exit(1)
    used = collect_used_images()
    all_images = [
        p
        for p in UP2.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXT
    ]
    unused = [p for p in all_images if p.resolve() not in used]
    print(
        f"upload2 ảnh: {len(all_images)}, được tham chiếu từ ngoài upload2: {len(used)}, "
        f"sẽ xóa ảnh thừa: {len(unused)}"
    )
    for p in sorted(unused, key=lambda x: str(x)):
        print("  xóa:", p.relative_to(ROOT))
        p.unlink()
    dirs = sorted(
        {d for d in UP2.rglob("*") if d.is_dir()},
        key=lambda x: len(x.parts),
        reverse=True,
    )
    for d in dirs:
        try:
            d.rmdir()
        except OSError:
            pass
    print("Xong.")


if __name__ == "__main__":
    main()
