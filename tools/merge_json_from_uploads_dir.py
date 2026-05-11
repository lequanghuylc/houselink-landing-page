#!/usr/bin/env python3
"""
Thay URL ảnh trong js/data-*.json bằng đường dẫn local tới file trong images/uploads/
(tên phẳng wp-content_uploads_YYYY_MM_<tên-file>).

- URL https://vietnamconstruction.vn/wp-content/uploads/Y/MM/f → khớp file
  images/uploads/wp-content_uploads_Y_MM_f (chính xác tên), hoặc khớp mờ theo tên WP.
- URL /images/upload2/... hoặc /images/upload%202/... → nếu tìm được file tương ứng trong uploads thì đổi sang /images/uploads/...
- URL /images/uploads/wp-content_... giữ nguyên.

Chạy: python3 tools/merge_json_from_uploads_dir.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
UPLOADS = ROOT / "images" / "uploads"
JS = ROOT / "js"

JSON_FILES = [
    "data-event-en.json",
    "data-event-vi.json",
    "data-market-en.json",
    "data-market-vi.json",
    "data-learn-en.json",
    "data-learn-vi.json",
]

WP_UPLOADS_RE = re.compile(
    r"https?://(?:www\.)?vietnamconstruction\.vn/wp-content/uploads/(\d{4})/(\d{2})/([^\"'>\s#]+)",
    re.I,
)

UP2_URL_RE = re.compile(
    r"/images/(?:upload2|upload%202)/([^\"'>\s#?]+)",
    re.I,
)

SIZE_RE = re.compile(r"-(\d+)x(\d+)(?=\.[^.]+$)", re.I)
SIZE_STEM_SUFFIX_RE = re.compile(r"-(\d+)x(\d+)$", re.I)
DUP_RE = re.compile(r" \(\d+\)(?=\.[^.]+$)")


def normalize_dup_name(name: str) -> str:
    return DUP_RE.sub("", name)


def pixel_area_from_name(name: str) -> int:
    ms = list(SIZE_RE.finditer(name))
    if not ms:
        return 9_999_999
    w, h = ms[-1].groups()
    return int(w) * int(h)


def rank_candidate(fname: str) -> tuple:
    n = normalize_dup_name(fname)
    dup = 1 if DUP_RE.search(fname) else 0
    return (pixel_area_from_name(n), -dup, len(fname))


def ext_compatible(wp_ext: str, cand_ext: str) -> bool:
    a, b = wp_ext.lower(), cand_ext.lower()
    if a == b:
        return True
    if {a, b} <= {".jpg", ".jpeg"}:
        return True
    return False


def strip_size_suffixes(stem: str) -> str:
    s = stem
    while True:
        t = SIZE_STEM_SUFFIX_RE.sub("", s)
        if t == s:
            break
        s = t
    return s


def lang_strip_stem(stem: str) -> str:
    return re.sub(r"-(?:eng|en|vi|vn)$", "", stem, flags=re.I)


def core_stem_from_wp_fname(wp_fname: str) -> str:
    stem = Path(wp_fname).stem
    stem = lang_strip_stem(stem)
    return strip_size_suffixes(stem)


def logical_wp_fname_from_flat_filename(flat_name: str) -> str | None:
    """wp-content_uploads_2019_08_foo-390x205.jpg → foo-390x205.jpg"""
    m = re.match(r"^wp-content_uploads_\d{4}_\d{2}_(.+)$", flat_name, re.I)
    return m.group(1) if m else None


def wp_equivalent_for_uploads_file(p: Path) -> str:
    """Tên file WP tương đương để khớp: flat VC hoặc basename thường trong uploads."""
    log = logical_wp_fname_from_flat_filename(p.name)
    return log if log else p.name


def expected_flat_basename_from_vc_url(url: str) -> str | None:
    m = WP_UPLOADS_RE.search(url)
    if not m:
        return None
    y, mo, tail = m.group(1), m.group(2), unquote(m.group(3))
    tail = tail.split("?")[0].split("#")[0]
    if not tail or "/" in tail:
        return None
    return f"wp-content_uploads_{y}_{mo}_{tail}"


def uploads_public_url_for_basename(basename: str) -> str:
    return "/images/uploads/" + quote(basename, safe="")


def list_uploads_image_files() -> list[Path]:
    exts = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".ico", ".avif"}
    out: list[Path] = []
    if not UPLOADS.is_dir():
        return out
    for p in UPLOADS.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            out.append(p)
    return out


def resolve_flat_file(basename: str, by_lower: dict[str, Path]) -> Path | None:
    p = by_lower.get(basename.lower())
    if p and p.is_file():
        return p
    return None


def find_best_uploads_match(wp_fname: str, files: list[Path]) -> Path | None:
    """Khớp tên file WP với file phẳng trong uploads (so khúc sau wp-content_uploads_Y_MM_)."""
    wext = Path(wp_fname).suffix.lower()
    wp_lower = wp_fname.lower()

    logical_rows: list[tuple[Path, str]] = [
        (p, wp_equivalent_for_uploads_file(p)) for p in files
    ]

    exact = [
        p
        for p, log in logical_rows
        if log.lower() == wp_lower and ext_compatible(wext, Path(log).suffix.lower())
    ]
    if exact:
        return max(exact, key=lambda p: rank_candidate(logical_wp_fname_from_flat_filename(p.name) or ""))

    core = core_stem_from_wp_fname(wp_fname)
    min_prefix = 6
    cands: list[Path] = []
    for p, log in logical_rows:
        if not ext_compatible(wext, Path(log).suffix.lower()):
            continue
        stem_raw = DUP_RE.sub("", Path(log).stem)
        c_core = strip_size_suffixes(stem_raw)
        if c_core.lower() == core.lower():
            cands.append(p)
        elif len(core) >= min_prefix and c_core.lower().startswith(core.lower() + "-"):
            cands.append(p)
    if not cands:
        return None
    return max(cands, key=lambda p: rank_candidate(logical_wp_fname_from_flat_filename(p.name) or ""))


def build_by_lower(files: list[Path]) -> dict[str, Path]:
    d: dict[str, Path] = {}
    for p in files:
        d[p.name.lower()] = p
    return d


def collect_urls_from_json() -> tuple[set[str], set[str]]:
    """(vc_urls, upload2_paths)"""
    vc: set[str] = set()
    u2: set[str] = set()
    for name in JSON_FILES:
        path = JS / name
        if not path.is_file():
            continue
        raw = path.read_text(encoding="utf-8").strip()
        if not raw:
            continue
        data = json.loads(raw)
        if not isinstance(data, list):
            continue
        for post in data:
            if not isinstance(post, dict):
                continue
            emb = post.get("_embedded")
            if isinstance(emb, dict):
                fms = emb.get("wp:featuredmedia")
                if isinstance(fms, list) and fms and isinstance(fms[0], dict):
                    fm = fms[0]

                    def grab_vc(u: object) -> None:
                        if isinstance(u, str) and "vietnamconstruction.vn/wp-content/uploads/" in u:
                            vc.add(u)

                    def grab_u2(u: object) -> None:
                        if isinstance(u, str) and UP2_URL_RE.search(u):
                            u2.add(u.split("?")[0].strip())

                    grab_vc(fm.get("source_url"))
                    grab_u2(fm.get("source_url"))
                    md = fm.get("media_details")
                    if isinstance(md, dict):
                        sizes = md.get("sizes")
                        if isinstance(sizes, dict):
                            for sz in sizes.values():
                                if isinstance(sz, dict):
                                    grab_vc(sz.get("source_url"))
                                    grab_u2(sz.get("source_url"))
            for key in ("content", "excerpt"):
                block = post.get(key)
                if isinstance(block, dict):
                    r = block.get("rendered")
                    if isinstance(r, str):
                        for m in WP_UPLOADS_RE.finditer(r):
                            vc.add(m.group(0))
                        for m in UP2_URL_RE.finditer(r):
                            u2.add(m.group(0))
    return vc, u2


def basename_from_upload2_url(full: str) -> str | None:
    m = UP2_URL_RE.search(full)
    if not m:
        return None
    tail = unquote(m.group(1))
    parts = tail.rstrip("/").split("/")
    return parts[-1] if parts else None


def build_vc_map(vc_urls: set[str], files: list[Path], by_lower: dict[str, Path]) -> dict[str, str]:
    m: dict[str, str] = {}
    for url in vc_urls:
        flat = expected_flat_basename_from_vc_url(url)
        if flat:
            hit = resolve_flat_file(flat, by_lower)
            if hit:
                m[url] = uploads_public_url_for_basename(hit.name)
                continue
        wp_fname = unquote(urlparse(url).path.rstrip("/").split("/")[-1])
        hit = find_best_uploads_match(wp_fname, files)
        if hit:
            m[url] = uploads_public_url_for_basename(hit.name)
    return m


def build_upload2_map(u2_paths: set[str], files: list[Path]) -> dict[str, str]:
    m: dict[str, str] = {}
    for raw in u2_paths:
        base = raw.split("?")[0].strip()
        cand = basename_from_upload2_url(base)
        if not cand:
            continue
        hit = find_best_uploads_match(cand, files)
        if hit:
            newu = uploads_public_url_for_basename(hit.name)
            if newu != base:
                m[base] = newu
    return m


def rewrite_featured_media(fm: dict, url_map: dict[str, str]) -> int:
    n = 0
    if not isinstance(fm, dict):
        return 0
    su = fm.get("source_url")
    if isinstance(su, str) and su in url_map:
        fm["source_url"] = url_map[su]
        n += 1
    md = fm.get("media_details")
    if isinstance(md, dict):
        sizes = md.get("sizes")
        if isinstance(sizes, dict):
            for _k, sz in sizes.items():
                if not isinstance(sz, dict):
                    continue
                u = sz.get("source_url")
                if isinstance(u, str) and u in url_map:
                    sz["source_url"] = url_map[u]
                    n += 1
    return n


def rewrite_html(html: str, url_map: dict[str, str]) -> tuple[str, int]:
    if not isinstance(html, str):
        return html, 0
    out = html
    changed = 0
    for old, new in sorted(url_map.items(), key=lambda kv: -len(kv[0])):
        if old in out:
            c = out.count(old)
            out = out.replace(old, new)
            changed += c
    return out, changed


def process_post(post: dict, url_map: dict[str, str]) -> tuple[int, int]:
    fc = 0
    emb = post.get("_embedded")
    if isinstance(emb, dict):
        fms = emb.get("wp:featuredmedia")
        if isinstance(fms, list) and fms and isinstance(fms[0], dict):
            fc += rewrite_featured_media(fms[0], url_map)
    hc = 0
    for key in ("content", "excerpt"):
        block = post.get(key)
        if isinstance(block, dict):
            r = block.get("rendered")
            if isinstance(r, str):
                new_r, c = rewrite_html(r, url_map)
                if c:
                    block["rendered"] = new_r
                    hc += c
    return fc, hc


def rewrite_all_json(url_map: dict[str, str]) -> None:
    for name in JSON_FILES:
        path = JS / name
        if not path.is_file():
            continue
        raw = path.read_text(encoding="utf-8").strip()
        if not raw:
            print(f"  json {name}: bỏ qua (file rỗng)")
            continue
        data = json.loads(raw)
        if not isinstance(data, list):
            continue
        t_fc = t_hc = 0
        for post in data:
            if not isinstance(post, dict):
                continue
            fc, hc = process_post(post, url_map)
            t_fc += fc
            t_hc += hc
        path.write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        print(f"  json {name}: featured {t_fc}, html urls {t_hc}")


def main() -> None:
    if not UPLOADS.is_dir():
        raise SystemExit("Thiếu thư mục: " + str(UPLOADS))

    files = list_uploads_image_files()
    print(f"images/uploads: {len(files)} file ảnh")
    if not files:
        raise SystemExit("Không có file ảnh trong uploads.")

    by_lower = build_by_lower(files)
    vc_urls, u2_paths = collect_urls_from_json()
    print(f"URL VC trong JSON (unique): {len(vc_urls)}")
    print(f"Đường /images/upload2/... trong JSON (unique): {len(u2_paths)}")

    vc_map = build_vc_map(vc_urls, files, by_lower)
    u2_map = build_upload2_map(u2_paths, files)
    # gộp: cùng một chuỗi có thể không trùng key
    url_map = {**vc_map, **u2_map}
    print(f"Ánh xạ thay thế (VC + upload2 → uploads): {len(url_map)}")
    if not url_map:
        print("Không có khớp nào — kiểm tra tên file trong images/uploads/ (basename trùng URL hoặc wp-content_uploads_YYYY_MM_...).")
        return

    rewrite_all_json(url_map)
    print("Xong: URL ảnh trỏ tới /images/uploads/... khi tìm thấy file tương ứng trong images/uploads/.")


if __name__ == "__main__":
    main()
