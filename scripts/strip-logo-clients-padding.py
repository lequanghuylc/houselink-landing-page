#!/usr/bin/env python3
"""
Crop each PNG/JPEG to tight content bbox (transparent / near-white padding removed).

  .venv/bin/python scripts/strip-logo-clients-padding.py
  .venv/bin/python scripts/strip-logo-clients-padding.py --file images/logo-clients/Wtw-Photoroom.png
  .venv/bin/python scripts/strip-logo-clients-padding.py --dry-run
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageOps

ROOT = Path(__file__).resolve().parents[1]
LOGO_DIR = ROOT / "images" / "logo-clients"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def _alpha_bbox(im: Image.Image, alpha_threshold: int = 14) -> tuple[int, int, int, int] | None:
    rgba = im.convert("RGBA")
    a = rgba.split()[3]
    mask = a.point(lambda x: 255 if x > alpha_threshold else 0)
    return mask.getbbox()


def _nonwhite_bbox(im: Image.Image, tol: int = 26) -> tuple[int, int, int, int] | None:
    rgb = im.convert("RGB")
    bg = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, bg).convert("L")
    mask = diff.point(lambda x: 255 if x > tol else 0)
    return mask.getbbox()


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    rgba = im.convert("RGBA")
    ab = _alpha_bbox(rgba)
    wb = _nonwhite_bbox(rgba)
    w, h = rgba.size
    full = max(1, w * h)

    def area_ratio(b: tuple[int, int, int, int] | None) -> float:
        if b is None:
            return 1.0
        x0, y0, x1, y1 = b
        return (x1 - x0) * (y1 - y0) / full

    if ab is not None and area_ratio(ab) <= 0.90:
        return ab
    if wb is not None:
        return wb
    return ab


def strip_one(path: Path) -> tuple[bool, tuple[int, int]]:
    suf = path.suffix.lower()
    if suf == ".png":
        im = Image.open(path)
    elif suf in (".jpg", ".jpeg"):
        im = Image.open(path).convert("RGBA")
    else:
        return False, (0, 0)
    im = ImageOps.exif_transpose(im)
    im = im.convert("RGBA")
    bbox = content_bbox(im)
    if bbox is None:
        return False, im.size
    x0, y0, x1, y1 = bbox
    if (x0, y0) == (0, 0) and (x1, y1) == im.size:
        return False, im.size
    m = max(0, int(0.01 * max(x1 - x0, y1 - y0)))
    x0 = max(0, x0 - m)
    y0 = max(0, y0 - m)
    x1 = min(im.width, x1 + m)
    y1 = min(im.height, y1 + m)
    cropped = im.crop((x0, y0, x1, y1))
    if suf == ".png":
        cropped.save(path, format="PNG", optimize=True, compress_level=9)
    else:
        rgb = cropped.convert("RGB")
        rgb.save(path, format="JPEG", quality=92, optimize=True)
    return True, cropped.size


def main() -> None:
    ap = argparse.ArgumentParser(description="Strip padding around logo-clients raster images.")
    ap.add_argument("--file", type=Path, default=None, help="Process only this image")
    ap.add_argument("--dir", type=Path, default=None, help="Directory of rasters (default: images/logo-clients)")
    ap.add_argument("--backup", type=Path, default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.file:
        paths = [args.file]
        if not args.file.is_file():
            print("Not a file:", args.file, file=sys.stderr)
            sys.exit(1)
    else:
        d = args.dir or LOGO_DIR
        if not d.is_dir():
            print("Not a directory:", d, file=sys.stderr)
            sys.exit(1)
        paths = sorted(
            p
            for p in d.iterdir()
            if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith(".")
        )

    if args.backup and not args.dry_run:
        args.backup.mkdir(parents=True, exist_ok=True)

    changed = 0
    for p in paths:
        if args.backup and not args.dry_run:
            shutil.copy2(p, args.backup / p.name)
        if args.dry_run:
            im = Image.open(p)
            im = ImageOps.exif_transpose(im)
            bbox = content_bbox(im.convert("RGBA"))
            if bbox and bbox != (0, 0, im.width, im.height):
                print(f"would crop {p.name} {im.size}")
            continue
        did, _ = strip_one(p)
        if did:
            changed += 1
            print(p.name)
    if args.dry_run:
        print(f"Dry-run: {len(paths)} raster(s)")
        return
    print(f"Done: {changed} cropped, {len(paths) - changed} unchanged")


if __name__ == "__main__":
    main()
