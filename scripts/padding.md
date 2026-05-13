Một ảnh — padding trên + dưới bằng nhau (ví dụ 20px)


cd /Volumes/SSKSSD/GitHub/2026/houselink-landing-page
.venv/bin/python scripts/pad-image-vertical.py images/logo-clients/ABB-Photoroom.png --vertical 20

.venv/bin/python scripts/pad-image-vertical.py images/logo-clients/ABB-Photoroom.png --shrink-vertical 20


Một ảnh — trên và dưới khác nhau
.venv/bin/python scripts/pad-image-vertical.py images/logo-clients/Wtw-Photoroom.png --top 12 --bottom 18
Chỉ xem trước (không ghi file)
.venv/bin/python scripts/pad-image-vertical.py images/logo-clients/Wtw-Photoroom.png --vertical 20 --dry-run
Sao lưu bản gốc trước khi ghi đè
.venv/bin/python scripts/pad-image-vertical.py images/logo-clients/Wtw-Photoroom.png --vertical 20 --backup images/_pad-backup
Padding là trong suốt (RGBA); chiều cao ảnh tăng thêm top + bottom, chiều ngang giữ nguyên.

Có hai cách “giảm padding”, tùy ý bạn:

1. Bạn vừa tự thêm vùng trong suốt trên/dưới (ví dụ --vertical 20) — muốn bớt đúng số pixel đã thêm
Dùng crop mép (cắt từ mép trên / mép dưới):

cd /Volumes/SSKSSD/GitHub/2026/houselink-landing-page
# Cắt 20px phía trên và 20px phía dưới (giống hệt bớt padding đối xứng đã thêm)
.venv/bin/python scripts/pad-image-vertical.py images/logo-clients/ABB-Photoroom.png --shrink-vertical 20
# Hoặc trên / dưới khác nhau
.venv/bin/python scripts/pad-image-vertical.py images/logo-clients/Wtw-Photoroom.png --shrink-top 10 --shrink-bottom 15
--dry-run vẫn dùng được để xem kích thước trước khi ghi file.

2. Muốn bỏ viền trong suốt / nền trắng quanh logo (tự động crop sát “mực”)
Dùng script strip (không cần biết trước đã thêm bao nhiêu px):

# Một file
.venv/bin/python scripts/strip-logo-clients-padding.py --file images/logo-clients/Wtw-Photoroom.png
# Cả thư mục logo-clients
.venv/bin/python scripts/strip-logo-clients-padding.py
