# Hiệu chuẩn đường line và camera trên NVX thật — Step 23.1

## Vì sao chưa có line ngay sau cài?
Bộ cài không điền tọa độ phuộc/mâm/thắng/pô đoán từ ảnh. Trên GitHub, GLB NVX
được lưu bằng Git LFS; môi trường tạo bản này chỉ đọc được pointer, không đọc
được mesh thật. Các category vẫn hoạt động để lọc sản phẩm. Line và camera focus
chỉ xuất hiện khi có profile đã đánh dấu trên đúng GLB.

Đây là công cụ tác giả cục bộ, không phải chứng nhận lắp đặt thật. Không sửa GLB,
không tự lưu MongoDB và không giả vờ phụ tùng đã được gắn lên xe.

## 1. Kiểm tra model cục bộ
Tại thư mục DTH-3D-Commerce:

```bat
node tools\audit-nvx23.mjs
```

Lệnh chỉ đọc cấu trúc GLB, tên node/mesh, dung lượng và hash. V1 chưa có thì ghi
`not supplied`, không lấy V3 thay. Nếu file là LFS pointer, chạy `git lfs pull`
trên đúng branch và kiểm tra lại. Node/mesh có tên không chứng minh cấu tạo cơ khí.

## 2. Mở editor với tài khoản admin
Giữ Backend, MongoDB và Vite hoạt động, đăng nhập tài khoản admin rồi mở:

```text
http://127.0.0.1:5173/shop?mode=build&focus-editor=1
```

Chọn đúng NVX V2 hoặc V3, chờ model thật lên. Không chọn một bản chưa có GLB.
Bấm category Suspension/Wheels/Brakes/Exhaust/Mirrors. Mở `Focus editor · local export`
ở góc sân khấu. Chế độ này xuất file JSON về máy, không mở quyền ghi dữ liệu API.

## 3. Đặt điểm và góc nhìn
1. Bấm `Mark selected part`.
2. Kéo xe đến góc nhìn rõ bộ phận. Kéo và thả không được tính là bấm chọn điểm.
3. Bấm trực tiếp lên bề mặt đúng bộ phận. Camera chuyển điểm ngắm đến chỗ vừa chọn.
4. Dùng Rotate/Zoom/Left/Right chỉnh góc, khoảng cách và quan sát tránh che khuất.
5. Bấm `Capture angle` để lưu pose đang thấy.
6. Lặp lại cho từng category cần hỗ trợ. Mỗi category có một điểm trong bản này.
7. Bấm `Export JSON`.

Không bấm một vị trí bất kỳ rồi đặt nhãn bộ phận không có trong model. Vị trí của
wheels/brakes ở bản này là một vùng lựa chọn; cấu hình từng bánh/đĩa riêng cần schema
slot mở rộng trong bước tiếp theo.

## 4. Đặt file JSON vào dự án
Nếu đang hiệu chuẩn V3, tên xuất là `yamaha-nvx-v3.json`. Copy vào:

```text
frontend\public\models\nvx\focus\yamaha-nvx-v3.json
```

Nếu thư mục `focus` chưa có, tạo nó. Không đổi nội dung JSON bằng tọa độ suy đoán.
V2 dùng `yamaha-nvx-v2.json`. Với published model, `assetFile` giữ URL/revision đúng
mà editor ghi nhận; không tự đổi nó thành URL của một model khác.

Tải lại trang Build. Khi profile khớp ID, path, SHA-256, rotation và không gian
normalization, line/label được bật. Khi model đổi byte hoặc orientation, profile
cũ bị từ chối; đánh dấu lại thay vì bỏ kiểm tra hash.

## 5. Nghiệm thu bắt buộc
- Xoay toàn cảnh: line neo đúng bộ phận; điểm bị khuất không hiện xuyên thân xe.
- Bấm từng category: camera focus đúng phần, panel sản phẩm không che đối tượng.
- Thử màn hình laptop/desktop/mobile, resize, đổi category nhanh, Reset/Esc.
- Tất cả sản phẩm trong panel vẫn dựa trên dữ liệu tương thích demo hiện có.
- `Export diagnostics` chỉ là counter và CPU submit time, không phải báo cáo FPS.
- Đường camera cần quan sát thật để bảo đảm không đi qua thân xe; phép toán framing
  và giới hạn khoảng cách không tự chứng minh đường đi không va chạm với mọi mesh.

## Đồng bộ sang máy còn lại
File profile nằm trong public của repository nên có thể review/commit cùng code.
GLB phải được đồng bộ qua Git LFS với cùng hash. Không commit API keys hoặc .env.
Một profile được khai báo theo hash không tự chuyển lịch sử Meshy hay dữ liệu MongoDB.
