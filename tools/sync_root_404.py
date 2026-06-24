#!/usr/bin/env python3
"""Emit root 404.html and locale-root stubs from 404/index.html.

- ``404.html``: site-root asset URLs (Netlify / Surge).
- ``ja/index.html`` / ``ko/index.html``: same 404 UI with ``data-hl-search-base`` for that locale.
  Prevents dumb static servers from **directory listing** when opening ``/ja/`` or ``/ko/`` with no real home page.
"""
from __future__ import annotations

import argparse
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "404" / "index.html"
DST_ROOT = ROOT / "404.html"

ASSET_REPLACEMENTS = (
    ('href="../landing-chrome.css"', 'href="/landing-chrome.css"'),
    ('href="../css/hl-404.css"', 'href="/css/hl-404.css"'),
    ('src="../landing-chrome.js"', 'src="/landing-chrome.js"'),
    ('src="../js/hl-404.js"', 'src="/js/hl-404.js"'),
)

# Injected only into publish-root ``404.html`` - not into ``ja/index.html`` / ``ko/index.html`` stubs.
# Many static hosts always return this English shell for *any* 404; Netlify section rules can skip this.
LOCALE_404_REDIRECT_SNIPPET = """
  <script>
  (function () {
    try {
      var p = location.pathname || "";
      if (/^\\/(vi|ja|ko|zh)\\/404\\.html$/i.test(p)) return;
      var m = p.match(/^\\/(vi|ja|ko|zh)(\\/|$)/i);
      if (!m) return;
      var lang = String(m[1]).toLowerCase();
      if (lang !== "vi" && lang !== "ja" && lang !== "ko" && lang !== "zh") return;
      location.replace("/" + lang + "/404.html");
    } catch (e) {}
  })();
  </script>"""


def inject_publish_root_404_locale_redirect(html: str) -> str:
    needle = '<meta name="robots" content="noindex">'
    if needle not in html:
        raise SystemExit(f"sync_root_404: missing expected fragment for redirect inject: {needle!r}")
    return html.replace(needle, needle + LOCALE_404_REDIRECT_SNIPPET, 1)


def build_asset_resolved_404_text() -> str:
    text = SRC.read_text(encoding="utf-8")
    for old, new in ASSET_REPLACEMENTS:
        if old not in text:
            raise SystemExit(f"sync_root_404: missing expected fragment: {old!r}")
        text = text.replace(old, new)
    return text


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--only-root-404",
        action="store_true",
        help="Write only publish-root 404.html (skip ja/index.html and ko/index.html stubs).",
    )
    args = ap.parse_args()

    base = build_asset_resolved_404_text()
    DST_ROOT.write_text(inject_publish_root_404_locale_redirect(base), encoding="utf-8")
    print(f"wrote {DST_ROOT}")

    if args.only_root_404:
        return

    stub = "<!-- hl:locale-root-404 -->\n"
    for lang, search_base in (("ja", "/ja/"), ("ko", "/ko/")):
        out = ROOT / lang / "index.html"
        t = base.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n" + stub, 1)
        t = t.replace('data-hl-search-base="/"', f'data-hl-search-base="{search_base}"')
        t = t.replace("<html lang=\"en\">", f'<html lang="{lang}">', 1)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(t, encoding="utf-8")
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
