#!/usr/bin/env python3
"""
Tuỳ chọn: đổi tên file trong images/uploads/ sang Unicode NFC.

Mặc định CHỈ báo cáo cặp trùng NFD/NFC (cùng tên hiển thị), không xóa file.
Dùng --rename-only để đổi tên các file chỉ có dạng NFD (không có bản NFC cùng tên).

Trước đó hãy chạy: python3 tools/merge_json_from_uploads_dir.py
(merge đã chuẩn hóa URL trong JSON sang NFC; tên file trên đĩa nên là NFC để khớp Linux.)
"""
from __future__ import annotations

import argparse
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPLOADS = ROOT / "images" / "uploads"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--rename-only",
        action="store_true",
        help="Chỉ đổi tên file NFD đơn (không có file NFC cùng tên đích); không xóa.",
    )
    args = ap.parse_args()

    if not UPLOADS.is_dir():
        raise SystemExit("Thiếu thư mục: " + str(UPLOADS))

    paths = sorted(
        (p for p in UPLOADS.rglob("*") if p.is_file()),
        key=lambda p: len(p.parts),
        reverse=True,
    )

    dup_pairs: list[tuple[Path, Path]] = []
    planned: list[tuple[Path, Path]] = []

    for p in paths:
        name = p.name
        nname = unicodedata.normalize("NFC", name)
        if nname == name:
            continue
        dest = p.with_name(nname)
        if dest.exists() and dest.resolve() != p.resolve():
            dup_pairs.append((p, dest))
            continue
        planned.append((p, dest))

    print(f"Cặp trùng (NFD + NFC cùng thư mục, cần xử lý tay nếu muốn gọn repo): {len(dup_pairs)}")
    for a, b in dup_pairs[:15]:
        print("  ", a.name[:80], "… | …", b.name[:80])
    if len(dup_pairs) > 15:
        print(f"  … (+{len(dup_pairs) - 15} cặp)")

    if not args.rename_only:
        print(f"\nKhông đổi tên (chỉ báo cáo). Có {len(planned)} file chỉ-NFD có thể đổi bằng --rename-only.")
        return

    for old, new in planned:
        old.rename(new)

    print(f"\nĐã đổi tên NFC: {len(planned)} file.")


if __name__ == "__main__":
    main()
