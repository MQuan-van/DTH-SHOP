# DTH Access 24.7 — Wheel Wash

Ngày 2026-11-05. Hiệu ứng nền đã tích hợp trên `/login` và các màn hình dùng chung Access Surface, kế thừa [Blue Vault 24.6](DTH-ACCESS246-BLUE-VAULT.md).

## Tương tác

Lăn chuột hoặc vuốt trackpad theo chiều dọc trên vùng sân khấu để đưa nền qua dải xanh băng, tím iris và cobalt. Lăn ngược đưa dải sáng đi theo chiều ngược lại. Ba lớp gradient tĩnh chuyển vị trí, tỷ lệ, góc và độ trong suốt trong vùng hậu cảnh. Form giữ độ tương phản bằng lớp nền riêng và reading veil của Blue Vault.

Listener `wheel` dạng passive gắn vào `main[data-access246]`. Hiệu ứng nhận được input ngay cả khi trang vừa khít viewport và trình duyệt vẫn cuộn tự nhiên khi nội dung dài hơn viewport. Bỏ qua vùng form, nút/link, phần tử nhập liệu, thao tác cuộn chủ yếu theo chiều ngang và các tổ hợp Ctrl, Meta hoặc Shift. Ctrl + wheel vẫn thuộc về trình duyệt.

Mỗi sự kiện được chuẩn hóa từ pixel, dòng hoặc trang và giới hạn ở ±240 px. Đích tween chỉ đi trước hoặc sau pha đang hiển thị tối đa một mốc màu để tránh tích hàng đợi khi lăn nhanh. Đích đi liên tục qua mốc lặp, còn lúc render chỉ lấy pha trong `[0, 4)`. GSAP tái sử dụng một tween hữu hạn, lấy mẫu một timeline tạm dừng và gỡ cả listener lẫn context khi rời trang.

Wheel Wash dùng chung điều kiện chặn motion của Blue Vault. Focus vào input, gửi form, mở Access help, ẩn tab hoặc Pause giữ nền ở vị trí hiện tại. Layout compact, reduced motion và Save-Data dùng nền tĩnh. Thiết kế này dùng CSS transform/opacity cho nền, camera hiện có vẫn do Canvas và director245 quản lý.

## Phạm vi

File mới

- `frontend/src/experience/access246/WheelWash247.jsx` gắn listener và nội suy ba lớp sáng.
- `frontend/src/experience/access246/wheelWash247.logic.mjs` chuẩn hóa input và tính pha.
- `tests/access247-wheel.test.mjs` kiểm tra delta mode, zoom, giới hạn, đảo chiều, điểm nối palette, tích lũy trackpad, giới hạn đích tween và hợp đồng listener/JSX.
- `docs/DTH-ACCESS247-WHEEL-WASH.md` ghi lại phạm vi và kiểm thử.

File tích hợp

- `frontend/src/experience/access246/AccessAtmosphere246.jsx` mount hiệu ứng và truyền gate hiện có.
- `frontend/src/experience/access246/access246.css` tạo ba dải màu và quy tắc reduced motion.

Backup hai file tích hợp nằm ở `test-results/access247/backups/`. Phiên bản này chỉ bổ sung phần trình bày của Access Surface. Camera, GLB, auth, Support, API và dữ liệu dùng lại từ 24.6. Hash của auth handler, Support và GLB nguồn khớp với bản 24.6.

## Kiểm thử và build

- **187/187 tests đạt** trong 974,29 ms, gồm 179 baseline và 8 test 24.7, 0 fail/skip. Kiểm tra source contract và compile JSX nằm trong số này.
- **Production frontend build đạt** trong **6,74 giây**.
- Log ở `test-results/access247/tests.log` và `test-results/access247/build.log`.

```powershell
node --test tests/access247-wheel.test.mjs
npm.cmd run build --workspace frontend
```

## Kiểm tra browser

- Desktop 1280×720 có `scrollHeight` 720 và `scrollY` 0. Ba lớp màu từ `[0, 0, 0]` chuyển tới `[0.44, 0, 0.06]` sau một lần lăn xuống. Các lần lăn kế tiếp đưa nền qua xanh băng `[0.88, 0, 0.12]` và tím iris `[0.11, 0.91, 0.12]`. Lăn lên đưa các giá trị trở lại theo chiều ngược, quan sát được mẫu `[0.3789, 0.5922, 0.12]`.
- Focus input và Pause đều giữ nguyên transform `matrix(1.19025, .0906676, -.0906676, 1.19025, -28.7223, 11.0997)` và opacity `[0.4204, 0.5431, 0.12]` khi tiếp tục lăn.
- Desktop 1280×540 có `scrollHeight` 641. Khi lăn, `scrollY` tăng từ 0 lên 101.33 và các lớp màu thay đổi, xác nhận hiệu ứng cùng tồn tại với cuộn native.
- Khung nhìn mobile 390×844 hiển thị poster. Browser ghi nhận 0 lớp Wheel Wash và 0 Canvas.

Các ảnh `navy-before.jpg`, `ice-after.jpg`, `iris-after.jpg` và số liệu `browser-evidence.json` nằm trong `test-results/access247/`. Ảnh động `wheel-wash.webp` ghép từ 24 ảnh chụp browser, có 12 frame sau khi gộp ở 960×368. Đây là phép thử browser local, chưa gồm benchmark FPS hoặc thao tác trên thiết bị mobile vật lý.

## PC và laptop

Xem [hướng dẫn đồng bộ 24.6](DTH-ACCESS246-BLUE-VAULT.md#pc-và-laptop). Review diff và stage có chọn lọc các file ở trên cùng baseline Access 24.6 nếu máy kia chưa có. Sau khi commit/push trên máy nguồn, review thay đổi local trên máy còn lại rồi fetch/pull fast-forward cùng branch. Cấu hình `.env` và thông tin kết nối lưu riêng trên từng máy. `test-results/` chứa bằng chứng local.

Xem phiên bản hiện tại ở [trang đăng nhập local](http://127.0.0.1:5173/login). Khi FE 5173 và API 5000 đang chạy, dùng lại hai instance đó.
