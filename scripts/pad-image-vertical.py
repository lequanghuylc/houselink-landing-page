#!/usr/bin/env python3
"""
Add or remove (crop) pixels at the top/bottom of one image or every raster in a directory.

  # Thêm padding trong suốt trên + dưới (đều nhau)
  .venv/bin/python scripts/pad-image-vertical.py images/logo-clients/Wtw-Photoroom.png --vertical 20

  # Giảm: cắt bớt N pixel từ mép trên và N pixel từ mép dưới (sau khi đã pad thừa)
  .venv/bin/python scripts/pad-image-vertical.py images/logo-clients/Wtw-Photoroom.png --shrink-vertical 20

  # Giảm viền trong suốt/nền trắng tự động (một file): dùng strip-logo-clients-padding.py --file ...
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def pad_vertical(im: Image.Image, top: int, bottom: int) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    out = Image.new("RGBA", (w, h + top + bottom), (0, 0, 0, 0))
    out.paste(im, (0, top), im)
    return out


def shrink_vertical(im: Image.Image, top_px: int, bottom_px: int) -> Image.Image:
    """Crop top_px from top edge and bottom_px from bottom edge."""
    im = im.convert("RGBA")
    w, h = im.size
    t = min(max(0, top_px), h - 1)
    b = min(max(0, bottom_px), h - 1 - t)
    return im.crop((0, t, w, h - b))


def process_file(
    path: Path,
    *,
    pad_top: int,
    pad_bottom: int,
    shrink_top: int,
    shrink_bottom: int,
    backup: Path | None,
    dry: bool,
) -> None:
    if path.suffix.lower() not in EXTS:
        print("skip (not raster):", path, file=sys.stderr)
        return
    if backup and not dry:
        backup.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup / path.name)
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    if shrink_top > 0 or shrink_bottom > 0:
        out = shrink_vertical(im, shrink_top, shrink_bottom)
        note = f"(-{shrink_top}px top / -{shrink_bottom}px bottom)"
    else:
        out = pad_vertical(im, pad_top, pad_bottom)
        note = f"(+{pad_top}px / +{pad_bottom}px)"
    if dry:
        print(f"would {path.name}: {im.size} -> {out.size} {note}")
        return
    suf = path.suffix.lower()
    if suf == ".png":
        out.save(path, format="PNG", optimize=True, compress_level=9)
    else:
        out.convert("RGB").save(path, format="JPEG", quality=92, optimize=True)
    print(path, "->", out.size)


def main() -> None:
    ap = argparse.ArgumentParser(description="Add or crop top/bottom on image(s).")
    ap.add_argument("path", nargs="?", type=Path, help="Single image file")
    ap.add_argument("--dir", type=Path, help="Process all rasters in this directory instead of one file")
    ap.add_argument("--vertical", type=int, default=None, help="Same top and bottom padding (px)")
    ap.add_argument("--top", type=int, default=20)
    ap.add_argument("--bottom", type=int, default=20)
    ap.add_argument("--shrink-vertical", type=int, default=None, help="Crop same px from top and bottom edges")
    ap.add_argument("--shrink-top", type=int, default=0)
    ap.add_argument("--shrink-bottom", type=int, default=0)
    ap.add_argument("--backup", type=Path, default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pad_top, pad_bottom = args.top, args.bottom
    if args.vertical is not None:
        pad_top = pad_bottom = max(0, args.vertical)

    shrink_top, shrink_bottom = args.shrink_top, args.shrink_bottom
    if args.shrink_vertical is not None:
        shrink_top = shrink_bottom = max(0, args.shrink_vertical)

    if shrink_top > 0 or shrink_bottom > 0:
        pad_top = pad_bottom = 0

    if args.dir:
        paths = sorted(
            p for p in args.dir.iterdir() if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith(".")
        )
    elif args.path:
        paths = [args.path]
    else:
        ap.error("pass a FILE or use --dir DIR")

    for p in paths:
        if not p.is_file():
            print("not found:", p, file=sys.stderr)
            sys.exit(1)
        process_file(
            p,
            pad_top=pad_top,
            pad_bottom=pad_bottom,
            shrink_top=shrink_top,
            shrink_bottom=shrink_bottom,
            backup=args.backup,
            dry=args.dry_run,
        )


if __name__ == "__main__":
    main()
