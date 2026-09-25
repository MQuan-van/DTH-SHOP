# Home — tự xoay sản phẩm 360° khi mở trang

Thay đổi nhỏ trên `feat/experience-studio`: Cinematic Home tự xoay model khi tải xong,
không tự bật Inspect. Chỉ sản phẩm xoay quanh trục Y; camera, chữ, vòng sau/vòng dưới
không được đưa vào nhóm xoay. Giữ nguyên asset, màu/vật liệu, database và dependencies.

## Hành vi

- Mặc định quay lặp 360°, khoảng 16 giây một vòng khi hoạt động bình thường.
- Chiều âm quanh Y (nhìn từ trên trục +Y là chiều kim đồng hồ).
- Inspect giữ tư thế đang hiển thị, dừng tự xoay, cho phép kéo/zoom thủ công.
- Return to story trả quyền điều khiển cho timeline rồi tiếp tục tự xoay.
- Tạm nhường khi scroll đang đổi chương; tiếp tục sau 0,35 giây ổn định.
- Motion off, reduced motion, tab ẩn, sân khấu ngoài vùng xem hoặc hộp thoại/Support
  đang mở đều chặn tự xoay. Không cộng bù thời gian khi quay lại tab.
- Ảnh dự phòng khi model/WebGL lỗi vẫn được giữ; không giả lập ảnh đó đang là 3D.
- Admin Experience và Product Detail không tự nhận thay đổi này: Home truyền
  cấu hình turntable riêng vào renderer. Không tự xoay khi admin đang chụp góc.

## Chỉnh tốc độ

Trong `frontend/src/experience/motion/motion.config.mjs`:

```js
export const HOME_AUTOROTATE = Object.freeze({
  enabled: true,
  secondsPerTurn: 16,
  direction: -1,
  scrollResumeDelay: 0.35,
});
```

Giảm secondsPerTurn để xoay nhanh hơn (ví dụ 10), tăng để chậm hơn (ví dụ 24).
Giới hạn 4–120 giây/vòng. `enabled: false` tắt riêng tự xoay Home; không tắt
câu chuyện scroll. Đây là cấu hình trong source, chưa phải một field mới trong Admin.
Nếu admin đã xuất bản tắt Cinematic Home, Home cũ vẫn được giữ, không ghi đè lựa chọn đó.

## Cập nhật

Dừng Vite. Tại Git root, giữ các thay đổi local trước khi chuyển nhánh:

```bat
git status -sb
git fetch origin
git switch feat/experience-studio
git pull --ff-only origin feat/experience-studio
```

Tại thư mục ứng dụng `DTH-3D-Commerce`:

```bat
npm run test:experience
npm run build:flow
npm run dev:flow
```

Dùng `npm ci` trước nếu máy chưa cài dependencies của nhánh Experience.
Để thử với API hiện có, dừng Flow rồi dùng `npm run dev` cùng backend đang chạy.
Không cần seed, đổi `.env`, xóa dữ liệu hoặc merge PR trước khi thử Home này.

## Kiểm tra

`tests/cinematic.test.mjs` bổ sung vòng xoay đủ 360°, thời gian theo delta, chiều,
pause/resume, nhường timeline và mặc định tắt ở renderer dùng chung.
`tests/browser/home_autorotate.py` quan sát tư thế render thật, kiểm tra tự xoay
mà không bấm Inspect, nhường thao tác, Support, Motion off, giảm chuyển động,
chuyển route và GLB lỗi. Bài browser chỉ chạy build test có telemetry riêng;
không bật `VITE_EXPERIENCE_TESTS` trên bản dùng cho khách. Các test trước vẫn giữ.
