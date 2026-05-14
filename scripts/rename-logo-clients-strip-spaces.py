#!/usr/bin/env python3
"""
Rename files in images/logo-clients/ whose names contain whitespace:
each run of whitespace becomes a single hyphen, then update all repo refs.

Run from repo root:

  python3 scripts/rename-logo-clients-strip-spaces.py
"""
from __future__ import annotations

import re
import urllib.parse
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
LOGO_DIR = ROOT / "images" / "logo-clients"

EXTS = {".html", ".md", ".css", ".js", ".json", ".svg"}


def strip_spaces_basename(name: str) -> str:
    return re.sub(r"\s+", "-", name.strip())


def collect_renames() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for f in sorted(LOGO_DIR.iterdir()):
        if not f.is_file():
            continue
        if not any(c.isspace() for c in f.name):
            continue
        new_name = strip_spaces_basename(f.name)
        if new_name == f.name:
            continue
        pairs.append((f.name, new_name))
    return pairs


def apply_text_replacements(text: str, pairs: list[tuple[str, str]]) -> str:
    for old, new in pairs:
        old_enc = quote(old, safe=".-_")
        new_enc = quote(new, safe=".-_")
        text = text.replace(
            f"/images/logo-clients/{old_enc}", f"/images/logo-clients/{new_enc}"
        )
        text = text.replace(
            f"/images/logo-clients/{old}", f"/images/logo-clients/{new_enc}"
        )
    return text


def iter_text_files() -> list[Path]:
    out: list[Path] = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT)
        if rel.parts and rel.parts[0] in (".git", "node_modules", ".venv"):
            continue
        if p.suffix.lower() in EXTS:
            out.append(p)
    return out


def main() -> None:
    pairs = collect_renames()
    if not pairs:
        print("No logo-clients filenames with whitespace; nothing to do.")
        return

    targets = {new for _, new in pairs}
    for old, new in pairs:
        if (LOGO_DIR / new).exists() and (LOGO_DIR / old).name != new:
            raise SystemExit(f"Collision: {new!r} already exists (renaming from {old!r})")

    tmp_tag = ".__wsstrip_tmp__"
    for old, new in pairs:
        (LOGO_DIR / old).rename(LOGO_DIR / (old + tmp_tag))
    for old, new in pairs:
        (LOGO_DIR / (old + tmp_tag)).rename(LOGO_DIR / new)
    print(f"Renamed {len(pairs)} file(s) under {LOGO_DIR.relative_to(ROOT)}")
    for _, new in pairs:
        if not (LOGO_DIR / new).is_file():
            raise SystemExit(f"Rename incomplete: missing {new!r}")

    changed = 0
    for path in iter_text_files():
        raw = path.read_text(encoding="utf-8")
        updated = apply_text_replacements(raw, pairs)
        if updated != raw:
            path.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"  updated {path.relative_to(ROOT)}")
    print(f"Updated {changed} text file(s).")


if __name__ == "__main__":
    main()
