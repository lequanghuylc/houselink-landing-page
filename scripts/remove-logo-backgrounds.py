#!/usr/bin/env python3
"""Make logo PNG backgrounds transparent using edge-connected flood fill."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


def border_seeds(w: int, h: int) -> list[tuple[int, int]]:
    seeds: list[tuple[int, int]] = [
        (0, 0),
        (w - 1, 0),
        (0, h - 1),
        (w - 1, h - 1),
    ]
    step_x = max(1, w // 10)
    step_y = max(1, h // 10)
    for x in range(0, w, step_x):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, step_y):
        seeds.append((0, y))
        seeds.append((w - 1, y))
    out: list[tuple[int, int]] = []
    seen: set[tuple[int, int]] = set()
    for xy in seeds:
        if xy not in seen and 0 <= xy[0] < w and 0 <= xy[1] < h:
            seen.add(xy)
            out.append(xy)
    return out


def remove_background(path: Path, thresh: int = 42) -> None:
    img = Image.open(path)
    img = img.convert("RGBA")
    w, h = img.size
    if w == 0 or h == 0:
        return
    for xy in border_seeds(w, h):
        px = img.getpixel(xy)
        if len(px) == 4 and px[3] == 0:
            continue
        ImageDraw.floodfill(img, xy, (0, 0, 0, 0), thresh=thresh)
    img.save(path, optimize=True)


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "images" / "logo"
    if not root.is_dir():
        print("Missing directory:", root, file=sys.stderr)
        sys.exit(1)
    pngs = sorted(root.glob("*.png"))
    if not pngs:
        print("No PNG files in", root, file=sys.stderr)
        sys.exit(1)
    for p in pngs:
        try:
            remove_background(p)
            print(p.name)
        except OSError as e:
            print("fail:", p.name, e, file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
