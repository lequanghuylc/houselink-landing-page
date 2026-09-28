#!/usr/bin/env python3
"""Build locale FDIsignals landing pages from comments/2026-09-28-FDISignals."""

import re
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SRC = REPO / "comments" / "2026-09-28-FDISignals"
LANDING = Path(__file__).resolve().parents[1]

LOCALES = ("en", "vi", "ja", "ko", "zh")
HTML_LANG = {"en": "en", "vi": "vi", "ja": "ja", "ko": "ko", "zh": "zh-CN"}

TITLES = {
    "home": {
        "vi": "FDIsignals by HOUSELINK - Radar tín hiệu đầu tư FDI vào Việt Nam",
        "en": "FDIsignals by HOUSELINK - FDI investment signal radar",
        "zh": "FDIsignals by HOUSELINK - FDI 投资信号雷达",
        "ko": "FDIsignals by HOUSELINK - FDI 투자 시그널 레이더",
        "ja": "FDIsignals by HOUSELINK - FDI投資シグナル・レーダー",
    },
    "pricing": {
        "vi": "Bảng giá FDIsignals Signal Radar - FDIsignals by HOUSELINK",
        "en": "FDIsignals Signal Radar pricing - FDIsignals by HOUSELINK",
        "zh": "FDIsignals Signal Radar 价格 - FDIsignals by HOUSELINK",
        "ko": "FDIsignals Signal Radar 요금 - FDIsignals by HOUSELINK",
        "ja": "FDIsignals Signal Radar 料金 - FDIsignals by HOUSELINK",
    },
}

DESCS = {
    "home": {
        "vi": "FDIsignals phát hiện nhà sản xuất sắp mở rộng hoặc dịch chuyển sản xuất vào Việt Nam trước khi thông tin trở thành tin tức.",
        "en": "FDIsignals detects manufacturers preparing to expand or relocate production to Vietnam before the information becomes news.",
        "zh": "FDIsignals 在信息成为新闻之前，发现即将向越南扩产或转移产能的制造企业。",
        "ko": "FDIsignals는 정보가 뉴스가 되기 전에 베트남으로 생산을 확대하거나 이전하려는 제조기업을 포착합니다.",
        "ja": "FDIsignals は、情報がニュースになる前に、ベトナムへの生産拡大や移管を準備する製造企業を捉えます。",
    },
    "pricing": {
        "vi": "Bảng giá các gói Signal Radar dành cho khu công nghiệp, nhà thầu, nhà cung ứng và đơn vị dịch vụ chuyên nghiệp.",
        "en": "Signal Radar plans for industrial parks, contractors, suppliers and professional-service firms.",
        "zh": "面向工业园区、承包商、供应商与专业服务机构的 Signal Radar 方案价格。",
        "ko": "산업단지, 시공사, 공급사, 전문 서비스 기관을 위한 Signal Radar 요금.",
        "ja": "工業団地、施工会社、サプライヤー、専門サービス機関向けの Signal Radar 料金。",
    },
}

REGISTER_LABELS = {"Đăng ký", "Subscribe", "订阅", "가입", "申し込む"}

STRIP_RULES = [
    r"header\{[^}]*\}",
    r"\.nav\{[^}]*\}",
    r"\.nav \.brand\{[^}]*\}",
    r"\.nav \.links\{[^}]*\}",
    r"\.nav \.links a\{[^}]*\}",
    r"\.nav \.links a\.on,\.nav \.links a:hover\{[^}]*\}",
    r"\.nav \.links a\.on\{[^}]*\}",
    r"\.lang\{[^}]*\}",
    r"\.lang>button\{[^}]*\}",
    r"\.lang ul\{[^}]*\}",
    r"\.lang\.open ul\{[^}]*\}",
    r"\.lang li button\{[^}]*\}",
    r"\.lang li button:hover,\.lang li button\.on\{[^}]*\}",
    r"footer\{[^}]*\}",
    r"footer a\{[^}]*\}",
    r"\.lang-block\{display:none\}\.lang-block\.on\{display:block\}",
    r"\.nav \.spacer\{[^}]*\}",
]

SUBNAV_CSS = """
body.hl-with-fixed-header .hero{margin-top:calc(var(--header-h) + env(safe-area-inset-top, 0px))}
button.btn{font-family:inherit;cursor:pointer}
"""

HEADER_LOGO = "/images/fdisignals/fdisignals_logo_ngang.svg"

BILLING_JS = """
var BILL='y';
function toggleBill(){BILL=BILL==='y'?'m':'y';
 document.querySelectorAll('.pr-y').forEach(function(e){e.style.display=BILL==='y'?'':'none';});
 document.querySelectorAll('.pr-m').forEach(function(e){e.style.display=BILL==='m'?'':'none';});
 document.querySelectorAll('.sw').forEach(function(e){e.classList.toggle('y',BILL==='y');});
 document.querySelectorAll('.toggle .lab.y').forEach(function(e){e.classList.toggle('on',BILL==='y');});
 document.querySelectorAll('.toggle .lab.m').forEach(function(e){e.classList.toggle('on',BILL==='m');});}
document.querySelectorAll('.toggle .lab').forEach(function(l){l.addEventListener('click',function(){var want=l.classList.contains('y')?'y':'m'; if(want!==BILL) toggleBill();});});
"""


def prefix(locale: str) -> str:
    return "" if locale == "en" else f"/{locale}"


def page_href(locale: str, kind: str) -> str:
    base = f"{prefix(locale)}/fdisignals/"
    return base if kind == "home" else base + "pricing/"


def contact_href(locale: str) -> str:
    return f"{prefix(locale)}/contact/" or "/contact/"


def chrome_prefix(locale: str, kind: str) -> str:
    depth = 1 if locale == "en" else 2
    if kind == "pricing":
        depth += 1
    return "../" * depth


def out_dir(locale: str, kind: str) -> Path:
    base = LANDING if locale == "en" else LANDING / locale
    path = base / "fdisignals"
    if kind == "pricing":
        path = path / "pricing"
    return path


def extract_style(html: str) -> str:
    css = re.search(r"<style>(.*?)</style>", html, re.S).group(1)
    for pattern in STRIP_RULES:
        css = re.sub(pattern, "", css)
    return css + SUBNAV_CSS


def extract_blocks(html: str) -> dict:
    parts = re.split(r'<div class="lang-block" data-lang="(\w+)">', html)
    blocks = {}
    for i in range(1, len(parts), 2):
        lang = parts[i]
        chunk = parts[i + 1]
        cut = re.search(r"\n<div class=\"lang-block\"|\n<footer>", chunk)
        if cut:
            chunk = chunk[: cut.start()]
        chunk = chunk.strip()
        if chunk.endswith("</div>"):
            chunk = chunk[: -len("</div>")].strip()
        blocks[lang] = chunk
    return blocks


def rewrite(html: str, locale: str) -> str:
    def repl_register(match: re.Match) -> str:
        cls = match.group(1)
        text = match.group(2).strip()
        if text in REGISTER_LABELS:
            return f'<button type="button" class="{cls}" data-hl-register-gate>{text}</button>'
        return match.group(0)

    html = re.sub(
        r'<a class="([^"]+)" href="https://houselink\.com\.vn/contact/">([^<]+)</a>',
        repl_register,
        html,
    )
    html = html.replace('href="pricing.html"', f'href="{page_href(locale, "pricing")}"')
    html = html.replace('href="index.html"', f'href="{page_href(locale, "home")}"')
    html = html.replace("https://houselink.com.vn/contact/", contact_href(locale))
    html = html.replace("https://houselink.com.vn/", prefix(locale) + "/" if locale != "en" else "/")
    return html


def render(locale: str, kind: str, css: str, body: str) -> str:
    page_key = "fdisignals" if kind == "home" else "fdisignals-pricing"
    scripts = []
    if kind == "pricing":
        scripts.append(f"<script>{BILLING_JS}</script>")
        scripts.append('<script src="/js/hl-pricing-register-gate.js" defer></script>')
    rel = chrome_prefix(locale, kind)
    scripts.append(f'<script src="{rel}landing-chrome.js" defer></script>')
    return f"""<!DOCTYPE html>
<html lang="{HTML_LANG[locale]}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{TITLES[kind][locale]}</title>
<meta name="description" content="{DESCS[kind][locale]}">
<link rel="icon" href="/images/fdisignals/fdisignals_bieu_tuong.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{css}
</style>
<link rel="stylesheet" href="{rel}landing-chrome.css">
</head>
<body class="hl-with-fixed-header" data-hl-page="{page_key}" data-hl-header-logo="{HEADER_LOGO}" data-hl-header-logo-alt="FDIsignals by HOUSELINK" data-hl-header-logo-href="{page_href(locale, "home")}">
<div id="hl-chrome-header"></div>
{body}
<div id="hl-chrome-footer"></div>
{chr(10).join(scripts)}
</body>
</html>
"""


def main() -> None:
    home_html = (SRC / "index.html").read_text(encoding="utf-8")
    pricing_html = (SRC / "pricing.html").read_text(encoding="utf-8")
    sources = {
        "home": (extract_style(home_html), extract_blocks(home_html)),
        "pricing": (extract_style(pricing_html), extract_blocks(pricing_html)),
    }
    logo_dir = LANDING / "images" / "fdisignals"
    logo_dir.mkdir(parents=True, exist_ok=True)
    for src in (SRC / "logo").iterdir():
        if src.suffix.lower() in {".svg", ".png"}:
            shutil.copy2(src, logo_dir / src.name)

    for kind, (css, blocks) in sources.items():
        missing = [code for code in LOCALES if code not in blocks]
        if missing:
            raise SystemExit(f"{kind} missing locales: {missing}")
        for locale in LOCALES:
            body = rewrite(blocks[locale], locale)
            dest = out_dir(locale, kind) / "index.html"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(render(locale, kind, css, body), encoding="utf-8")
            print(dest.relative_to(REPO))


if __name__ == "__main__":
    main()
