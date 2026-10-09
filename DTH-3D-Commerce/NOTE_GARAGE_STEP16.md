# DTH — My Garage / Account 2.0 · Step 16

Bản cập nhật dựa trên branch `feat/shop-discovery`, commit
`646bed45d7dbeb886d5205ae418b6588549168d8` (Step 15 Yamaha NVX).
Không tự push GitHub. Không cần tải thêm model, cài thư viện mới hoặc chạy lại seed.

## 1. Phạm vi

- Lưu tối đa ba phiên bản: NVX V1, NVX V2, NVX V3. Không có năm, VIN hay bản ghi đăng ký xe.
- Thêm, xóa có xác nhận, chọn và bỏ xe mặc định; dữ liệu thuộc tài khoản đang đăng nhập.
- Xe mặc định của Step 15 được đọc như một xe trong Garage, không cần migration hàng loạt.
- Trong API mode, thao tác lưu đi qua backend và được lưu vào document người dùng trong MongoDB.
- Trong Flow mode, dữ liệu chỉ thuộc phiên/tab mô phỏng; không phải đăng nhập hoặc lưu MongoDB thật.
- Account: Overview / Garage / Orders / Profile. Giữ URL `?view=vehicle` cho Garage và `?view=security` cho Profile.
- Profile giữ thông tin tài khoản và thao tác xóa hiện có; bản này không thêm chức năng đổi email/mật khẩu.
- UI ít chữ: một hành động mua hàng chính, menu phụ gọn, một khu xem phụ tùng 3D.
- Animation bằng CSS / Web Animations API, có giảm chuyển động. Không có video làm giả 3D.
- Giữ file Viewer3D, loader, Home, GLB, camera, cart, checkout và package-lock hiện tại.

### Ba trạng thái khác nhau

1. **Garage**: danh sách NVX lưu trong tài khoản.
2. **Default**: xe được dùng khi đăng nhập lại; thêm xe thứ hai không đổi default. Xóa xe mặc định sẽ bỏ default, không tự chọn xe khác.
3. **Shopping selection**: xe dùng để xem/lọc hàng trên trình duyệt. Bấm **Shop matching parts** mới chọn xe đó để mua hàng. Chọn thẻ chỉ đổi bản xem trước.

Đổi default hoặc xóa xe Garage không sửa xe trên các dòng giỏ hàng và không sửa đơn hàng cũ.
Các model phụ tùng và mapping vẫn là minh họa đồ án, không phải chứng nhận lắp vừa xe thực tế.
Không có model nguyên chiếc NVX được bổ sung trong bước này.

## 2. Cài trên PC ổ C bằng CMD

Tải file **DTH-Garage-Step16.mjs** vào đúng:

```text
C:\DTH-Garage-Step16.mjs
```

Đây là file độc lập: không giải nén, không copy thư mục `files`, không chạy lại installer Step 15.
Dừng frontend/Vite và backend bằng Ctrl+C; giữ MongoDB đang chạy.

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status
dir "C:\DTH-Garage-Step16.mjs"
node "C:\DTH-Garage-Step16.mjs" --project "." --check
```

Đọc `git status`; không commit file .env, dữ liệu MongoDB, token hoặc mật khẩu.
`--check` chỉ đọc/kiểm tra source. Nếu `CHECK STOP`, dừng và giữ nguyên output.
Không reset, không git clean, không chép đè để bỏ qua lỗi.

Chỉ sau `CHECK OK`:

```bat
node "C:\DTH-Garage-Step16.mjs" --project "." --apply
```

Bộ cài thay đổi sáu file cũ bằng các đoạn sửa có kiểm tra và thêm các module/doc/test Step 16.
Local edits ngoài phạm vi được giữ lại. Nội dung cũ được sao lưu vào Git metadata của repo đang mở;
terminal in ra đường dẫn thật, không cần tự điền tên folder timestamp.

## 3. Kiểm tra sau cài

Chạy lần lượt; nếu lệnh nào báo lỗi thì dừng tại đó:

```bat
node --test "tests\garage16.test.mjs"
npm run check
npm test
npm run build
```

Các dependencies hiện tại đã đủ. Nếu trước đó chưa cài dependencies của repo trên máy này, cần
`npm ci` ở root app; không cài lẻ một phiên bản React hoặc thư viện mới để sửa nhanh lỗi.

**Không chạy lại `npm run seed`, migration Step 15 hoặc xóa database để cài Step 16.**
Các trường Garage mới được ghi khi tài khoản thực hiện thay đổi. Đọc Garage cũ không ghi database.

## 4. Chạy website

Terminal backend:

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
npm run dev:api
```

Terminal frontend:

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
npm run dev
```

Mở:

```text
http://127.0.0.1:5173/account?view=vehicle
```

Đăng nhập tài khoản API của bạn. `frontend/.env.local` cần đang dùng API mode như Step 15:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Kiểm tra nhanh:

- Xe mặc định cũ hiện trong Garage; thêm NVX khác không thay default đã có.
- Đặt default mới, tải lại trang, đăng xuất/đăng nhập: Garage được đọc lại từ API.
- Chọn thẻ để xem trước; bấm Shop matching parts để lọc Shop. Giỏ hàng đang có giữ nguyên xe từng dòng.
- Thêm lại cùng phiên bản không tạo bản sao. Hủy xóa không thay dữ liệu; xóa default bỏ default.
- Mở hai tab rồi sửa Garage: bản cũ phải báo xung đột và tải lại, không âm thầm ghi đè.
- Kiểm tra rotate / zoom / reset / nút auto-rotate trong viewer hiện có. Bản này không tự bật quay trên mọi trang.
- Khi model không tải được vẫn còn ảnh/thông tin sản phẩm. Thử viewport điện thoại và chế độ reduced motion.
- Orders, chi tiết đơn, Profile, đăng nhập/đăng xuất, loader và Home vẫn hoạt động.

## 5. Các trường và API

User được bổ sung `garageVehicleIds` và `garageRevision`; giữ `savedVehicleId` để tương thích Step 15.
Mỗi lần ghi thay đổi dùng điều kiện revision trên cùng document người dùng. Request cũ trả 409 thay vì ghi đè.
Origin / JSON / CSRF / session / write-limit được giữ từ app hiện có. Owner lấy từ session, không từ request body.

```text
GET  /api/shop/account/garage
POST /api/shop/account/garage
PUT  /api/shop/account/vehicle  (tương thích cũ, cùng service Garage)
```

Request mutation gồm `action`, `vehicleId`, `revision`. Không nhận userId, giá, giỏ hàng hay quyền tài khoản.
Các response chỉ xuất thông tin tài khoản được phép; không xuất passwordHash.

## 6. Kiểm thử bổ sung (tùy chọn)

### MongoDB test riêng, không dùng database app

Đã có test opt-in nhưng chưa được chạy với MongoDB trong môi trường tạo gói.
Lệnh dưới tạo hai collection ngẫu nhiên trong database test rồi dọn đúng hai collection đó.
Không đưa URI `dth_3d_commerce` vào test này.

```bat
set "GARAGE16_TEST_MONGO_URI=mongodb://127.0.0.1:27017/dth_garage16_test"
node --test "tests\garage16.mongo.test.mjs"
set "GARAGE16_TEST_MONGO_URI="
```

### Browser integration trên Flow build

Script trong `tests/browser/garage16.py` cần Python + Playwright + Chromium, không phải npm runtime dependency.
Chỉ chạy với compiled Flow, tài khoản fixture công khai và không có database thật.
Không chạy script này trên tài khoản thật/API production.

```bat
npm run build:flow
npm run preview
```

Ở terminal riêng, root app:

```bat
python tests\browser\garage16.py --url http://127.0.0.1:4173
```

Xong kiểm thử Flow thì chạy lại `npm run build` theo env API trước khi dùng bản build thông thường.
Không cần bật Flow để sử dụng Step 16 trên website chính.

## 7. Quay lại code trước Step 16

Dừng frontend/backend, ở root app:

```bat
node "C:\DTH-Garage-Step16.mjs" --project "." --undo-latest
```

Undo có kiểm tra: nếu file đã được sửa sau cài, nó dừng để không xóa local edits của bạn.
Undo **chỉ khôi phục code**, không xóa hay tự đảo dữ liệu Garage đã lưu. Không xóa document user/MongoDB.
Backend Step 15 chỉ dùng `savedVehicleId`; các trường Garage thêm vào document có thể còn đó và được đọc lại
khi cài Step 16 trở lại. Không chạy đồng thời hai bản backend khác nhau vào cùng database.

## 8. Checkpoint và dùng hai máy

Sau khi build và thao tác website đã ổn, kiểm tra danh sách staged trước khi commit/push:

```bat
git diff --check
git add .
git diff --cached --name-only
git commit -m "feat: add persistent NVX garage and refined account UI"
git push
```

Chỉ commit source/docs/tests cần thiết. Bộ cài không tự commit hoặc push.
Máy laptop sau khi pull không cần cài lại gói nếu các thay đổi Step 16 đã có trong Git.
Restart backend để schema/routes mới có hiệu lực.

**Git không đồng bộ MongoDB local.** PC và laptop dùng hai MongoDB local riêng sẽ có tài khoản/Garage riêng.
Muốn cùng dữ liệu trên hai máy, cả hai phải dùng cùng backend/database được cấu hình an toàn;
chỉ dùng chung GitHub repo và email đăng nhập không đủ.
