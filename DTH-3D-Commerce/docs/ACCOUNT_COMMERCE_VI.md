# Account Commerce — 22/09/2026

## Nền tích hợp

Nhánh: `feat/account-commerce`, lấy đúng `feature/3d-store` tại `f4d6ed0cfc00b52f2667099ff1a3a7f101f028ed` làm nền.
Code ứng dụng đã được build/test rồi commit tại `7b5df4d882a2fa45856ca21632b76c06b57f14ff`.
Không merge nhánh `feat/account-studio` cũ hoặc PR #2 dựa trên `style/candy-blue-pearl`.
Giữ nguyên Home, catalog, Quick View, Viewer3D, vật liệu/camera/hướng xoay, Review order và kiểm tra expectedTotal của bản mới. Không sửa package manifests hay package-lock, không thêm dependency ứng dụng.

## Giao diện và chuyển động

`/account`: đăng nhập/đăng ký với xác nhận mật khẩu, hiện/ẩn mật khẩu, chống gửi lặp và lỗi ngay tại form. Bên trái desktop là vòng bi 3D dựng bằng geometry, kim loại và cyan; đây là vật thể thương hiệu trang trí, không phải mô hình xe hoặc sản phẩm được bán. Có Pause/Play, tắt chuyển động theo reduced motion, dừng khi khuất/đổi tab, dự phòng SVG khi 3D lỗi. Mobile ẩn cảnh 3D để dành chỗ cho form.

Sau đăng nhập: Overview, Saved vehicle, Orders, Settings. Chuyển mục bằng URL query, animation fade/slide ngắn, nhịp xuất hiện dòng đơn, hover ảnh/nút. Không dùng subtitle marketing dài hoặc thống kê giả. Đã bỏ hàm Account cũ không dùng khỏi StoreApp.

`/account?view=vehicle`: Make → Model → Year có label/id riêng; lưu một xe mặc định vào tài khoản, khôi phục sau đăng nhập, cho phép xóa lựa chọn mặc định. Lựa chọn xe của từng dòng giỏ vẫn giữ nguyên.

`/account?view=orders`: tìm theo mã đơn/tên sản phẩm, phân trang 8 đơn. `&order=...` mở chi tiết; tên, số lượng, đơn giá, thành tiền và tổng tiền dùng snapshot của đơn trong MongoDB. Ảnh minh họa/link sản phẩm dùng catalog hiện tại khi sản phẩm còn tồn tại.

`/account?view=security`: thông tin tài khoản, đăng xuất và hộp xác nhận xóa tài khoản với mật khẩu hiện tại. Cancel/Escape không xóa. Xóa vĩnh viễn chỉ thực hiện sau xác nhận.

## API và dữ liệu

Kế thừa cookie HttpOnly, session hash, Origin/CSRF middleware hiện tại; không lưu password/token vào localStorage.
`PUT /api/shop/account/vehicle` chỉ cập nhật savedVehicleId của người đang đăng nhập.
`GET /api/shop/account/orders` và `GET /api/shop/account/orders/:id` đều giới hạn theo userId từ session, không tin userId gửi từ client.
Các endpoint checkout/receipt mới của feature/3d-store vẫn được giữ.

MongoDB dùng các collection `store_users`, `store_sessions`, `store_products`, `store_vehicles`, `store_orders`. Xe lưu ở `store_users.savedVehicleId`. Chỉ checkout tạo document đơn; Add to bag chưa tạo đơn.

## Kết quả kiểm tra

Hosted run thành công: https://github.com/MQuan-van/DTH-SHOP/actions/runs/35681199911
Môi trường: Ubuntu 24.04, Node 22, MongoDB 8, Vite production build ở API mode, Playwright 1.55 Chromium.

- `npm ci`, kiểm tra import và production build: PASS.
- 148 test logic/regression: 61 nền + 34 Account helper + 8 Home Stage + 45 Shop Motion: PASS.
- 20 tình huống HTTP/API với MongoDB thật: PASS. Node báo 21 do tính cả test cha.
- 17 checkpoint trình duyệt: PASS, không có uncaught pageerror trong luồng đã chạy.
- Luồng thực tế: đăng ký → lưu xe → Shop → Quick View → Product → Add to bag → Review → checkout → Account → receipt → F5.
- Kiểm tra đăng xuất/re-login quay về đúng /bag; tìm đơn rỗng/reset; layout Account ở 320/390/768; login ở 320/390/768/1440; reduced motion; Cancel/Escape ở hộp xóa.
- API thử quyền sở hữu đơn, CSRF/Origin, injection input, giá đổi chặn checkout, retry song song chỉ tạo một đơn, đọc session lặp, khởi động lại API vẫn đọc xe và đơn từ MongoDB.

Sửa test Home cũ để chấp nhận autoRotateSpeed âm (đổi chiều), không sửa tốc độ -1 của người dùng.
Sửa lỗi chờ URL trong bài test: `**/bag` khớp cả `/account?return=/bag` trước khi đăng nhập hoàn tất. Nay chờ chính xác URL /bag và xác nhận session. Các test responsive kiểm tra đúng heading của từng trang, không chỉ bất kỳ h1.

Giới hạn: chưa kiểm thử Safari/Firefox hoặc điện thoại vật lý, chưa đo FPS/Core Web Vitals, chưa kiểm toán production/UAT. Build có cảnh báo chunk Three.js lớn; không che cảnh báo. Chưa làm password recovery/email verification. Thanh toán/vận chuyển/tương thích vẫn là mô phỏng.

## Lấy source về Windows

Dừng Vite và backend, giữ MongoDB. Chạy CMD tại Git root:

```bat
cd /d "E:\Greenwich\Final-Project_GRE\TEST\DTH-SHOP"
git status -sb
git stash push -m "local-lock-before-account-commerce" -- DTH-3D-Commerce/package-lock.json
git fetch origin
git switch --track origin/feat/account-commerce
cd DTH-3D-Commerce
npm ci
npm run check
npm test
node --test tests/account.test.mjs tests/home-stage.test.mjs tests/shop-motion.test.mjs
npm run build
```

Chỉ áp dụng khi thay đổi local duy nhất vẫn là package-lock như đã báo. Nếu có file source khác thay đổi, giữ chúng bằng commit/stash phù hợp trước khi đổi nhánh. Không reset --hard, không restore lockfile mất bản local. Stash không bị xóa; xem bằng git stash list. Chưa pop lockfile vào bản đã test nếu chưa đối chiếu chênh lệch. Nếu local branch đã tồn tại, dùng git switch feat/account-commerce rồi đối chiếu trước khi cập nhật.

Giữ backend/.env trỏ MongoDB thật trên máy. frontend/.env.local:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Từ thư mục DTH-3D-Commerce, hai CMD riêng chạy `npm run dev:api` và `npm run dev`; mở địa chỉ Vite in ra rồi vào /account. PowerShell bị chặn npm.ps1 thì dùng npm.cmd. Không chạy thêm Vite thứ hai chiếm 5173, không cần seed lại database đang có dữ liệu.

## Tự nghiệm thu

Dùng tài khoản demo mới. Chọn Demo Moto / Street 155 / 2022 rồi Save vehicle. F5 và kiểm tra Header. Mở Apex Coilover từ Shop, thêm giỏ, Review order và đặt mô phỏng. Account → Orders → mở cùng mã đơn → F5. Compass phải có document mã đó trong store_orders, savedVehicleId trong store_users. Đăng xuất rồi đăng nhập lại phải đọc được cùng đơn.

## Chạy kiểm thử tích hợp riêng

Chỉ dùng database thử nghiệm. Bài test có dọn/xóa database thử và có chặn tên database khác:

```bat
set "TEST_MONGO_URI=mongodb://127.0.0.1:27017/dth_account_test"
node --test tests/account.integration.test.mjs
set TEST_MONGO_URI=
```

Không đổi tên test DB thành dth_3d_commerce. Browser CI cũng dùng DB riêng, không truy cập MongoDB trên máy người dùng.

## Chỉnh tiếp

`frontend/src/shop/account/AccountPage.jsx`: nội dung/form/layout.
`AccountPage.module.css`: spacing, màu, chuyển động; --account-enter-ms:320ms và --account-stagger-ms:30ms.
`AccountScene.jsx`: geometry, ánh sáng và tốc độ 3D riêng Account.
`AccountVisual.jsx`: pause/play, reduced motion, visibility, fallback.
Không cần sửa HeroScene hoặc home.config khi chỉnh Account.
