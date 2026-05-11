#!/usr/bin/env python3
"""
Khớp ảnh trong images/upload 2/ hoặc images/upload2/ với URL trong js/data-*.json (featured + content/excerpt).

Chỉ thay URL kiểu:
  https://vietnamconstruction.vn/wp-content/uploads/YYYY/MM/<tên-file>
bằng đường dẫn **local cùng site**, trỏ thẳng file trong thư mục đó, ví dụ:
  /images/upload2/<tên-file> hoặc /images/upload%202/<tên-file>
hoặc (nếu trong thư mục con) /images/upload2/Detail%20events/...

Không copy sang images/uploads/. Ảnh bạn tải về để trong upload2 / upload 2 là đủ để tránh bị chặn hotlink.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
# Hỗ trợ cả tên có dấu cách (theo yêu cầu) và upload2 không dấu cách (repo hiện tại).
_UP2_CANDIDATES = [ROOT / "images" / "upload 2", ROOT / "images" / "upload2"]
JS = ROOT / "js"

JSON_FILES = [
    "data-event-en.json",
    "data-event-vi.json",
    "data-market-en.json",
    "data-market-vi.json",
    "data-learn-en.json",
]

WP_UPLOADS_RE = re.compile(
    r"https?://(?:www\.)?vietnamconstruction\.vn/wp-content/uploads/(\d{4})/(\d{2})/([^\"'>\s#]+)",
    re.IGNORECASE,
)

SIZE_RE = re.compile(r"-(\d+)x(\d+)(?=\.[^.]+$)", re.IGNORECASE)
SIZE_STEM_SUFFIX_RE = re.compile(r"-(\d+)x(\d+)$", re.IGNORECASE)
DUP_RE = re.compile(r" \(\d+\)(?=\.[^.]+$)")


_UP2_RESOLVED: Path | None = None


def uploads2_root() -> Path:
    """Thư mục ảnh local: ưu tiên `images/upload 2`, không có thì `images/upload2`."""
    global _UP2_RESOLVED
    if _UP2_RESOLVED is not None:
        return _UP2_RESOLVED
    for p in _UP2_CANDIDATES:
        if p.is_dir():
            _UP2_RESOLVED = p.resolve()
            return _UP2_RESOLVED
    raise SystemExit(
        "Thiếu thư mục (cần một trong): "
        + " · ".join(str(x) for x in _UP2_CANDIDATES)
    )


def upload2_public_url(file_path: Path) -> str:
    """Đường dẫn URL từ web root tới file trong thư mục upload2 / upload 2."""
    up2 = uploads2_root()
    rel = file_path.resolve().relative_to(up2)
    folder_seg = quote(up2.name, safe="")
    tail = "/".join(quote(part, safe="") for part in rel.parts)
    return f"/images/{folder_seg}/{tail}"


def normalize_dup_name(name: str) -> str:
    return DUP_RE.sub("", name)


def pixel_area_from_name(name: str) -> int:
    ms = list(SIZE_RE.finditer(name))
    if not ms:
        return 9_999_999
    w, h = ms[-1].groups()
    return int(w) * int(h)


def rank_upload2_candidate(fname: str) -> tuple:
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


def find_best_upload2(wp_fname: str, files: list[Path]) -> Path | None:
    wext = Path(wp_fname).suffix.lower()
    wp_lower = wp_fname.lower()

    exact = [p for p in files if p.name.lower() == wp_lower and ext_compatible(wext, p.suffix.lower())]
    if exact:
        return max(exact, key=lambda p: rank_upload2_candidate(p.name))

    core = core_stem_from_wp_fname(wp_fname)
    min_prefix = 6
    cands: list[Path] = []
    for p in files:
        if not ext_compatible(wext, p.suffix.lower()):
            continue
        stem_raw = DUP_RE.sub("", Path(p.name).stem)
        c_core = strip_size_suffixes(stem_raw)
        if c_core.lower() == core.lower():
            cands.append(p)
        elif len(core) >= min_prefix and c_core.lower().startswith(core.lower() + "-"):
            cands.append(p)
    if not cands:
        return None
    return max(cands, key=lambda p: rank_upload2_candidate(p.name))


def collect_wp_urls_from_json() -> set[str]:
    out: set[str] = set()
    for name in JSON_FILES:
        path = JS / name
        if not path.is_file():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
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

                    def grab(u):
                        if isinstance(u, str) and "vietnamconstruction.vn/wp-content/uploads/" in u:
                            out.add(u)

                    grab(fm.get("source_url"))
                    md = fm.get("media_details")
                    if isinstance(md, dict):
                        sizes = md.get("sizes")
                        if isinstance(sizes, dict):
                            for sz in sizes.values():
                                if isinstance(sz, dict):
                                    grab(sz.get("source_url"))
            for key in ("content", "excerpt"):
                block = post.get(key)
                if isinstance(block, dict):
                    r = block.get("rendered")
                    if isinstance(r, str):
                        for m in WP_UPLOADS_RE.finditer(r):
                            out.add(m.group(0))
    return out


def list_upload2_images() -> list[Path]:
    exts = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
    files: list[Path] = []
    root = uploads2_root()
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            files.append(p)
    return files


def build_vc_to_local_map(urls: set[str], upload2_files: list[Path]) -> dict[str, str]:
    m: dict[str, str] = {}
    for url in urls:
        wp_fname = unquote(urlparse(url).path.rstrip("/").split("/")[-1])
        src = find_best_upload2(wp_fname, upload2_files)
        if src:
            m[url] = upload2_public_url(src)
    return m


# Khớp đường dẫn phẳng trong HTML/JSON; tránh .+? + lookahead (lệch khi sau ảnh là ) hoặc ,).
FLAT_IN_UPLOADS_RE = re.compile(
    r"/images/uploads/(wp-content_uploads_\d{4}_\d{2}_[^\"'>\s#?]+)",
    re.I,
)


def flat_uploads_segment_to_wp_fname(seg: str) -> str | None:
    m = re.match(r"^wp-content_uploads_\d{4}_\d{2}_(.+)$", seg, re.I)
    return m.group(1) if m else None


def rewrite_featured_media(fm: dict, vc_map: dict[str, str], upload2_files: list[Path]) -> int:
    n = 0
    if not isinstance(fm, dict):
        return 0
    su = fm.get("source_url")
    if isinstance(su, str):
        if su in vc_map:
            fm["source_url"] = vc_map[su]
            n += 1
        else:
            nu = try_uploads_flat_to_upload2(su, upload2_files)
            if nu:
                fm["source_url"] = nu
                n += 1
    md = fm.get("media_details")
    if isinstance(md, dict):
        sizes = md.get("sizes")
        if isinstance(sizes, dict):
            for _k, sz in sizes.items():
                if not isinstance(sz, dict):
                    continue
                u = sz.get("source_url")
                if not isinstance(u, str):
                    continue
                if u in vc_map:
                    sz["source_url"] = vc_map[u]
                    n += 1
                else:
                    nu = try_uploads_flat_to_upload2(u, upload2_files)
                    if nu:
                        sz["source_url"] = nu
                        n += 1
    return n


def try_uploads_flat_to_upload2(url: str, upload2_files: list[Path]) -> str | None:
    """Từ /images/uploads/wp-content_uploads_YYYY_MM_fname → upload 2 nếu khớp fname."""
    base = url.split("?")[0].strip()
    m = re.search(r"/images/uploads/(wp-content_uploads_\d{4}_\d{2}_[^/]+)$", base, re.I)
    if not m:
        return None
    fname = flat_uploads_segment_to_wp_fname(m.group(1))
    if not fname:
        return None
    src = find_best_upload2(fname, upload2_files)
    if not src:
        return None
    return upload2_public_url(src)


def rewrite_html(html: str, vc_map: dict[str, str], upload2_files: list[Path]) -> tuple[str, int]:
    if not isinstance(html, str):
        return html, 0
    changed = 0

    def repl_vc(m: re.Match) -> str:
        nonlocal changed
        full = m.group(0)
        nu = vc_map.get(full, full)
        if nu != full:
            changed += 1
        return nu

    html = WP_UPLOADS_RE.sub(repl_vc, html)

    def repl_up(m: re.Match) -> str:
        nonlocal changed
        full = m.group(0)
        nu = try_uploads_flat_to_upload2(full, upload2_files)
        if nu and nu != full:
            changed += 1
            return nu
        return full

    if "/images/uploads/wp-content_uploads_" in html:
        html = FLAT_IN_UPLOADS_RE.sub(repl_up, html)
    return html, changed


def process_post(post: dict, vc_map: dict[str, str], upload2_files: list[Path]) -> tuple[int, int]:
    fc = 0
    emb = post.get("_embedded")
    if isinstance(emb, dict):
        fms = emb.get("wp:featuredmedia")
        if isinstance(fms, list) and fms and isinstance(fms[0], dict):
            fc += rewrite_featured_media(fms[0], vc_map, upload2_files)
    hc = 0
    for key in ("content", "excerpt"):
        block = post.get(key)
        if isinstance(block, dict):
            r = block.get("rendered")
            if isinstance(r, str):
                new_r, c = rewrite_html(r, vc_map, upload2_files)
                if c:
                    block["rendered"] = new_r
                    hc += c
    return fc, hc


def rewrite_all_json(vc_map: dict[str, str], upload2_files: list[Path]) -> None:
    for name in JSON_FILES:
        path = JS / name
        if not path.is_file():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            continue
        t_fc = t_hc = 0
        for post in data:
            if not isinstance(post, dict):
                continue
            fc, hc = process_post(post, vc_map, upload2_files)
            t_fc += fc
            t_hc += hc
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"  json {name}: featured {t_fc}, html urls {t_hc}")


def main() -> None:
    uploads2_root()  # fail sớm nếu thiếu thư mục

    upload2_files = list_upload2_images()
    print(f"upload 2: {len(upload2_files)} ảnh")
    urls = collect_wp_urls_from_json()
    print(f"URL ảnh VC trong JSON (unique): {len(urls)}")

    vc_map = build_vc_to_local_map(urls, upload2_files)
    print(f"đã khớp URL → local upload 2: {len(vc_map)}")

    rewrite_all_json(vc_map, upload2_files)
    print("Xong: JSON dùng /images/<upload2|upload%202>/... cho các URL đã khớp (không đụng images/uploads/).")


if __name__ == "__main__":
    main()
