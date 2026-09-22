# Account Flow First — thử luồng trước, kết nối MongoDB sau

## Phạm vi

Tiếp nối Account Commerce trên baseline `feature/3d-store` (1b0496f), giữ package-lock mới của người dùng. Home, Shop, Quick View, model/camera/màu/tốc độ Product Detail không thay đổi. Có Account/Auth, xe mặc định, lịch sử/chi tiết đơn; không thêm admin hay thanh toán thật.

Account có vòng bi 3D thủ tục, không phải xe hoặc thông số sản phẩm. Nút Explode/Assemble tách/lắp các phần; focus form thay đổi trạng thái hình học. Có pause, phản hồi con trỏ và reduced motion. Dashboard desktop có scene nhỏ; trên mobile ẩn scene trang trí. Animation ngắn không buộc người dùng đợi mới gửi request.

## 1. Lấy code và chạy — chưa cần MongoDB

Chạy `git status -sb` trong repo. Nếu có thay đổi chưa lưu, commit hoặc sao lưu; không reset --hard/git clean. Khi working tree sạch:

```bat
git fetch origin
git switch --track origin/feat/account-flow-first
```

Nhánh local đã tồn tại: `git switch feat/account-flow-first` rồi `git pull --ff-only origin feat/account-flow-first`. Không pull nhánh này vào một nhánh khác khi chưa xem diff.

Vào thư mục DTH-3D-Commerce có package.json chứa script dev:api, check; không đứng trong frontend. Đường dẫn có thể khác trên máy khác:

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
npm ci
npm run test:account
npm run dev:flow
```

Dừng Vite cũ bằng Ctrl+C nếu port 5173 bận. Bước này chỉ cần Vite: KHÔNG chạy seed/backend/mongod. Mở địa chỉ Vite in ra, vào `/account`; banner phải là **FLOW DEMO / NO DATABASE**.

Trong PowerShell dùng `npm.cmd`; chuyển thư mục bằng `Set-Location -LiteralPath '...'`, không dùng `cd /d` của CMD.

`dev:flow` dùng `--mode flow` và file công khai frontend/.env.flow. Mode-specific env ưu tiên hơn .env.local chung, nhưng biến VITE_STORE_MODE đã đặt sẵn trong terminal vẫn có ưu tiên cao hơn. Không đặt secrets trong VITE_*.

## 2. Luồng mẫu không database

Email mẫu: **demo@dth.test**. Mật khẩu fixture công khai: **DthFlow2026!**.

Đây KHÔNG phải xác thực thật. Đăng ký thử bằng email giả khác kết thúc @dth.test, ví dụ quan@dth.test, cùng mật khẩu fixture trên. Không dùng email/mật khẩu thật; adapter không lưu mật khẩu.

```text
Sign in / Create account
 -> Saved vehicle: Demo Moto / Street 155 / 2022
 -> Save vehicle
 -> Shop: Apex Coilover
 -> Quick View -> Open product & 3D
 -> Add to bag
 -> Bag -> Review order -> tích xác nhận demo
 -> Place simulated order
 -> mã FLOW-...
 -> Account -> Orders -> mở đơn vừa tạo -> F5
```

Xe đã lưu và receipts nằm trong sessionStorage khi trình duyệt cho phép. F5 cùng tab giữ được dữ liệu, không phải bằng chứng persistence MongoDB. Tab/phiên mới hoặc xóa storage có thể mất dữ liệu. Storage bị chặn: dùng bộ nhớ tới lần reload. Các key giỏ/xe/checkout dth.flow.* tách khỏi dth.commerce.* của API. Dữ liệu fixture không được chuyển sang tài khoản thật khi bật API.

API mode KHÔNG tự fallback sang demo khi lỗi. Preview cũ là catalog-only; flow mới là bài thử đầy đủ; api là kết nối server thật.

## 3. Chỉnh chuyển động

`frontend/src/shop/account/motion.config.mjs` tập trung thời lượng, độ nghiêng hover, tốc độ quay và DPR của scene. AccountScene.jsx là hình học; AccountVisual.jsx quản lý pause/visibility/fallback; AccountMotion.jsx quản lý chuyển cảnh.

Reduced motion tắt idle motion/tilt/chuyển cảnh nhưng giữ thao tác. Scene lỗi có SVG fallback. Không tuyên bố FPS giống nhau trên mọi thiết bị. Vòng bi chỉ trang trí nhận diện DTH, không phải cấu hình xe khách đã chọn.

## 4. Kiểm thử

`npm test`: test nền. `npm run test:account`: helper Account và fixture adapter. Test fixture không chứng nhận security của API.

GitHub Actions có hai job theo thứ tự:

1. Flow: npm ci; unit/regression; build flow; Chromium trên React đã compile. KHÔNG chạy API/MongoDB. Kiểm tra network phải không gửi /api/shop/*.
2. Database: chỉ chạy sau flow; MongoDB riêng trong CI; HTTP integration; API production build; browser Account/checkout/persistence. Không kết nối DB trên máy bạn.

Screenshots và JSON là artifacts của run. Xem kết quả thực của commit, không suy ra PASS từ việc chỉ có file test. Chưa kiểm thử Safari/Firefox, điện thoại vật lý, UAT, FPS/Core Web Vitals.

## 5. Cuối cùng — kết nối MongoDB local

Chỉ làm sau khi hài lòng giao diện và flow. Compass là GUI xem dữ liệu, mongod là database server. Máy đã chạy MongoDB thì không cài lại.

### A. MongoDB Server

Với bản ZIP/đường dẫn bạn đã dùng; đổi đường dẫn executable khi sang máy khác:

```bat
if not exist "C:\mongodb-data\db" mkdir "C:\mongodb-data\db"
"C:\Của Quân\GRE\mongodb-win32-x86_64-windows-8.3.11\bin\mongod.exe" --dbpath "C:\mongodb-data\db" --bind_ip 127.0.0.1 --port 27017
```

Giữ terminal mở. Nếu đã có tiến trình trên port/dbpath này thì không chạy thêm. Không mở MongoDB không xác thực ra Internet.

### B. Backend

Từ root app, không ghi đè .env đang có:

```bat
if not exist backend\.env copy backend\.env.example backend\.env
notepad backend\.env
```

Giữ các biến khác từ file mẫu, sửa URI:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/dth_3d_commerce
```

Chỉ DB mới/chưa có catalog mới cần `npm run seed`. Sau đó `npm run dev:api`, giữ terminal mở.

### C. Frontend API thật

Dừng Vite flow. Trong frontend/.env.local:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Chạy **npm run dev**, KHÔNG phải dev:flow. Banner phải ghi MONGODB / API MODE. Đổi env cần restart Vite. Tạo tài khoản API mới với mật khẩu riêng, không dùng fixture công khai để bảo vệ dữ liệu.

### D. Compass và nghiệm thu dữ liệu thật

Compass: `mongodb://127.0.0.1:27017`, DB dth_3d_commerce. Collection thực theo schema: store_products, store_vehicles, store_users, store_sessions, store_orders.

Đăng ký/đăng nhập trên website, lưu xe, đặt đơn mới. Đơn API có mã DTH-..., không phải FLOW-....

Trong store_users kiểm tra email và savedVehicleId; không có password plaintext. Trong store_orders lọc `{ "id": "MA-DON-DTH-VUA-TAO" }`, đối chiếu lines/quantity/unitPrice/lineTotal/total.

Account -> Orders -> cùng mã đơn -> F5. Network phải có GET /api/shop/account/orders/<id> thành công. Dừng rồi bật lại backend; đăng nhập lại nếu cần; đơn và document vẫn còn. Đây mới là nghiệm thu persistence, không phải chỉ thấy health hoặc success.

Không chạy integration test trên DB dth_3d_commerce: test có cleanup dữ liệu thử; chỉ dùng tên DB `_test` riêng. Không push .env, thư mục MongoDB data hay credentials lên GitHub.

## Nguồn kỹ thuật

Vite: https://vite.dev/guide/env-and-mode
MongoDB: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/
Compass: https://www.mongodb.com/docs/compass/connect/
Reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
