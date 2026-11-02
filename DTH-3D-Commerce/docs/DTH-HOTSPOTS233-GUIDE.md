# DTH Step 23.3 — Interactive hotspots

## Phạm vi
Bản nối tiếp Step 23/23.2. Giữ nguyên Header, Support, Login, product cards, popup
Add to build, shortlist, API/auth và giá. Chỉ đổi export của
`frontend/src/experience/commerce23/VehicleStage23.jsx` sang module mới `hotspots233`.
Bản 23.2 local không nằm trên GitHub tại thời điểm đóng gói: installer chỉ chấp nhận
wrapper 23.1 đã biết (hoặc bridge 23.3 đã cài), không suy đoán/ghi đè wrapper khác.

## Có gì khác 23.1?
- Tách điểm bánh trước/sau, phanh trước/sau, phuộc trước/sau và hai gương nếu model có chúng.
- Nhãn giữ category cũ: hai điểm Wheels vẫn gọi bộ lọc Wheels của Build hiện tại.
  Trước/sau là vị trí quan sát, KHÔNG tạo dữ liệu tương thích riêng cho từng vị trí.
  Phân loại sản phẩm phù hợp trước/sau cần dữ liệu mounting/fitment ở bước tiếp theo.
- Bấm một nhãn hoặc bấm bề mặt gần điểm đã hiệu chuẩn. Vùng chọn chồng nhau không
  tự đoán thắng/phuộc; dùng nhãn hoặc bộ chọn điểm thay thế.
- Đường line nối với điểm 3D, kiểm tra che khuất theo ngân sách CPU, có hysteresis
  để nhãn không đổi bên liên tục. Mobile chỉ nổi tối đa 3 nhãn; dropdown vẫn đủ điểm.
- Camera: retreat → orbit → approach; quỹ đạo mới bắt đầu từ camera hiện tại.
  Đường rút/tiến được ray-check. Nếu cản trở, giữ góc hiện tại và báo xoay/hiệu chuẩn lại.
- Profile schema 2; nhận schema 1 cũ và giữ tên chung, không tự biến Wheels thành Front wheel.
- Editor theo các bước Mark surface → Confirm point & view → Test view → Export.
- Công cụ publish kiểm tra SHA-256, ID xe, cấu hình hướng, file GLB rồi sao lưu JSON cũ.

## Cài
Giải nén toàn bộ ZIP. Dừng Vite và lưu code trước.
PC: CHECK-PC.cmd → INSTALL-PC.cmd → VERIFY-PC.cmd.
Laptop: CHECK-LAPTOP.cmd → INSTALL-LAPTOP.cmd → VERIFY-LAPTOP.cmd.
Nếu đường dẫn khác, chạy:
```
node DTH-Step23_3-Interactive-Hotspots.mjs --project "path/to/DTH-3D-Commerce" --check
node DTH-Step23_3-Interactive-Hotspots.mjs --project "path/to/DTH-3D-Commerce" --apply
```
Không copy source đè thủ công, không dùng reset --hard. STOP nghĩa là không tương thích
với file local hoặc thiếu prerequisite; chưa có file project nào được thay trong CHECK.
Bộ cài không thay package.json/lock, không cài thêm thư viện, không ghi Git/MongoDB.

## Hiệu chuẩn lần đầu trên NVX V2 (model thật)
1. Chạy frontend/backend như thường lệ; đăng nhập admin.
2. Mở `http://127.0.0.1:5173/shop?mode=build&focus-editor=1`.
3. Chọn V2 và dùng đúng phiên bản xe để mua sắm khi được hỏi. Chờ model thực tải.
4. Mở `Calibrate hotspots`. Chọn `Rear suspension` chỉ khi đúng bộ phận tồn tại.
5. `Mark surface`: editor thu lại, kéo để nhìn rõ rồi click lên bề mặt.
6. Editor mở lại. Camera hướng tới điểm vừa đánh dấu. Dùng Orbit/Zoom để chỉnh.
7. `Confirm point & view`. Sau đó `Test view` và `Full vehicle` để kiểm tra hai chiều.
8. Lặp lại Front wheel, Rear wheel, Front brake, Exhaust... chỉ các bộ phận thấy rõ.
9. `Export JSON`. Đây là tải file local, CHƯA lưu vào server/database.
10. Chạy PUBLISH-FOCUS-PC.cmd (hoặc LAPTOP); kéo JSON vừa tải vào khi được hỏi,
    xem CHECK rồi chọn Y. Tool chỉ ghi `frontend/public/models/nvx/focus/<id>.json`.
11. Tải lại Build KHÔNG kèm `focus-editor=1`, thử nhãn, click, dropdown, Reset/Esc.

Đã có profile schema 1: được đọc trực tiếp. Muốn thêm điểm trước/sau, nhập/chỉnh trong
editor rồi xuất schema 2. Giữ backup v1; code 23.1 cũ không đọc schema 2 sau rollback.
Đừng chỉ export lại profile chung rồi đổi nhãn: từng điểm phải được đặt trên GLB thật.

## Giới hạn cấu hình đã publish từ Meshy
Tool publish hiện hỗ trợ GLB local được khai báo trực tiếp trong `NVX_MODELS`.
Nếu profile chỉ tới `api/shop/ai-assets/models/...?...`, tool DỪNG thay vì gắn nhầm
với file NVX gốc. Runtime vẫn đọc profile theo ID/hash/path của model đã publish.
Việc kiểm tra/publish API model cần workflow riêng với manifest thực tế.

## Các guard quan trọng
- Hash, path, ID, rotation không khớp: profile không được dùng.
- Chưa có profile: vẫn có catalogue và xoay xe, KHÔNG có điểm bịa sẵn.
- Không có ray hit / click quá xa / overlap mơ hồ / drag / long press: không chọn sai.
- Chọn điểm chỉ cập nhật category hiện có; không thêm vào bag, không chọn phụ tùng tự động.
- Labels có thể ẩn khi bị che hoặc camera đang chuyển. Dropdown là đường điều hướng ổn định.
- Controls dừng khi modal/support mở, khi tab ẩn; reduced motion không bị bỏ qua.
- Line và camera là trợ giúp khám phá, không chứng nhận lắp ráp cơ khí.

## Rollback và đồng bộ
Installer in lệnh --restore với manifest trong %USERPROFILE%/DTH-Backups/hotspots233/.
Không restore được nếu file đã sửa tiếp: bảo vệ thay đổi mới.
JSON hiệu chuẩn có backup riêng tại DTH-Backups/focus233; rollback code không tự
rollback profile do người dùng đã publish. Muốn quay về 23.1, phục hồi JSON v1 tương ứng.
Commit profile JSON và code sau khi review. GLB tiếp tục qua LFS. MongoDB không đi cùng Git.

## Phần chưa thuộc 23.3
Không thay phụ tùng trên xe, không lưu cấu hình MongoDB, không tạo dữ liệu tương thích,
không đổi Login/Support hoặc popup 23.2. Đây là lớp chọn vị trí + camera + nối category.

Kiểm tra che khuất được giới hạn tần suất: ưu tiên một điểm mỗi category và tối đa 6
ứng viên trước camera. Kết quả cache hết hạn theo thời gian/di chuyển camera. Đây
không phải phép kiểm tra mọi tam giác mỗi khung hình; cần quan sát mép che khuất và
raycast CPU trên GLB thật. Nếu chậm, giảm số điểm hiển thị trước, không sửa model gốc.
