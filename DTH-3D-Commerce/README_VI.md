# DTH 3D Commerce — project độc lập (baseline 0.1.0)

**Đây là nền phát triển tách từ bộ cửa hàng 3D đã gửi, không phải bản FYP hoàn thiện hoặc cửa hàng bán hàng thật.**
Không dùng `overlay`, không chạy `apply.mjs`, không cần clone/copy repo cũ. Không có `.git`, remote GitHub, `node_modules`, `.env` thật hay `package-lock.json` giả trong gói.

Stack giữ theo quyết định mới: React + Vite + Three.js/React Three Fiber; Node.js + Express; MongoDB/Mongoose. Có root npm workspaces để chạy mọi lệnh từ một thư mục.

## 1. Đặt project mới cạnh project cũ, không đặt bên trong

Đường dẫn mẫu cho máy bạn:

```text
C:\Của Quân\GRE\
├── Final-Project_GRE\        ← giữ bản gốc
└── DTH-3D-Commerce\          ← giải nén bản mới vào đây
    ├── package.json
    ├── frontend\
    ├── backend\
    ├── shared\
    ├── tests\
    ├── tools\
    └── docs\
```

ZIP có sẵn thư mục `DTH-3D-Commerce`. Khi giải nén, kiểm tra không bị lồng thành `DTH-3D-Commerce\DTH-3D-Commerce`.
Nếu có thư mục cùng tên đang chứa code khác, không ghi đè; chọn tên thư mục mới và điều chỉnh đường dẫn lệnh.

## 2. Chuẩn bị môi trường

Dùng **CMD / Command Prompt** cho các lệnh Windows dưới đây, giống cửa sổ bạn đã dùng.

```bat
node -v
npm -v
git --version
```

Dùng bản vá mới của Node.js 24 LTS, hoặc Node.js 22.12+ thuộc nhánh 22 LTS. MongoDB chưa cần cho bước xem preview.
Không cần gỡ Node đang dùng khi phiên bản đã phù hợp; đóng/mở lại terminal sau khi cài mới Node.

## 3. Cài dependencies và chạy frontend

```bat
cd /d "C:\Của Quân\GRE\DTH-3D-Commerce"
dir package.json
npm pkg get name
npm run check
npm install
npm test
npm run dev
```

`npm pkg get name` phải in `"dth-3d-commerce"`. Root `package.json` có `workspaces` nên `npm install` cài dependencies cho cả frontend và backend. MongoDB không cần chạy trong lúc cài packages.

**Gói mới chưa có lockfile: lần đầu dùng `npm install`, không phải `npm ci`.** Sau khi cài thành công, root có `package-lock.json` thật. Commit lockfile này; những lần clone sau dùng `npm ci`. Không tự tạo lockfile rỗng, không copy lockfile của bộ installer cũ.

Mở:

```text
http://127.0.0.1:5173
```

Mặc định `LOCAL PREVIEW`: dữ liệu JSON giả lập, giỏ hàng localStorage, checkout trong phiên trang. Không có đăng nhập giả hay đơn hàng giả được báo là đã lưu MongoDB.

Luồng kiểm tra: Select your vehicle → Demo Moto → Street 155 → 2022 → Shop parts → Apex Coilover → xoay/zoom → Add to bag → Bag → xác nhận demo → Place simulated order.

**Lệnh mới là `npm run dev`, không phải `npm run dev:shop`.** Chạy ở root project như trên. `Ctrl+C` để dừng server.

## 4. Bật MongoDB và API khi preview đã chạy

Cài/chạy MongoDB Community Server trên máy, hoặc dùng connection string của MongoDB mà bạn quản lý. MongoDB Compass là công cụ xem dữ liệu; có Compass không đồng nghĩa server MongoDB đã chạy.

Mở CMD thứ hai ở cùng root:

```bat
cd /d "C:\Của Quân\GRE\DTH-3D-Commerce"
if not exist backend\.env copy backend\.env.example backend\.env
notepad backend\.env
```

Giữ database riêng:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/dth_3d_commerce
PORT=5000
HOST=127.0.0.1
NODE_ENV=development
```

Giữ dòng `SHOP_ORIGINS` từ file ví dụ để frontend được gọi API. Không thay URI bằng database của bản cũ. Khi dùng Atlas, nhập URI thật vào `.env` local; không đưa URI có password lên GitHub.

```bat
npm run seed
npm run dev:api
```

Chỉ tiếp tục sau khi seed thành công. Seed thêm record còn thiếu, không drop database và không ghi đè sản phẩm đã chỉnh. Đừng xóa database cũ để xử lý lỗi seed.

Kiểm tra API trên browser:

```text
http://127.0.0.1:5000/api/shop/health
```

Phản hồi gồm `success: true` và `paymentMode: "simulation"` khi API hoạt động.

Trong terminal frontend, dừng Vite bằng Ctrl+C; tạo file cấu hình local và mở nó:

```bat
if not exist frontend\.env.local copy frontend\.env.example frontend\.env.local
notepad frontend\.env.local
```

Đổi thành:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Chạy lại frontend:

```bat
npm run dev
```

Giờ giữ hai CMD: một chạy `npm run dev:api`, một chạy `npm run dev`. Banner chuyển sang `MONGODB / API MODE`. Đăng ký bằng email thử nghiệm và mật khẩu riêng 12–128 ký tự; mua mô phỏng và kiểm tra đơn vẫn còn sau khi tải lại trang.

Database mặc định, cookie session và localStorage key đều khác bản bundle cũ. Ports vẫn như cũ: 5173, 5000; không chạy đồng thời hai bản trên cùng port.

### Admin tùy chọn

Thêm email/mật khẩu thử nghiệm vào `SHOP_ADMIN_EMAIL` và `SHOP_ADMIN_PASSWORD` trong `backend/.env`, rồi chạy `npm run seed`. Seed chỉ tạo admin mới nếu email chưa tồn tại; không nâng quyền tài khoản đã có. Xóa password seed khỏi `.env` sau khi tạo. Đăng nhập và mở `/admin`.

Admin hiện là editor JSON; chưa có form quản trị đầy đủ hay upload asset. Không dùng mật khẩu thật. Không có gateway thanh toán thật.

## 5. Tạo GitHub repository riêng

Tên đề xuất: `DTH-3D-Commerce`. Tên này chưa được tạo tự động. Trên GitHub, tạo **repository mới rỗng**, chọn đúng owner của bạn, chọn visibility phù hợp; không thêm README, license hoặc .gitignore ở bước tạo vì bản local đã có tài liệu/cấu hình.

Ở root project mới:

```bat
git init -b main
git rev-parse --show-toplevel
git status --short
git add .
git diff --cached --name-only
```

Top-level phải là thư mục `DTH-3D-Commerce`, không phải repo cũ. Trong staged files phải có source, `.env.example`, assets và `package-lock.json` mới tạo; không có `.env`, `node_modules`, dữ liệu thật hay kết quả phỏng vấn cá nhân.

Sau khi kiểm tra:

```bat
git commit -m "chore: initialize independent 3D commerce baseline"
```

Chỉ dùng ví dụ dưới nếu bạn đã tạo repo đúng tên/owner này. Nếu khác, thay bằng HTTPS URL từ nút Code của repo mới:

```bat
git remote add origin https://github.com/MQuan-van/DTH-3D-Commerce.git
git remote -v
```

**Kiểm tra origin trỏ repo mới rồi mới push:**

```bat
git push -u origin main
```

Không thay `origin` của repo cũ, không xóa `.git` của bản gốc, không dùng force push để sửa lỗi khởi tạo. Nếu `remote origin already exists`, dừng và kiểm tra đường dẫn/repository hiện tại.

Nếu Git hỏi danh tính commit:

```bat
git config user.name "TEN_HIEN_THI_CUA_BAN"
git config user.email "EMAIL_GIT_HOAC_NOREPLY_CUA_BAN"
```

Dùng thông tin bạn chọn trên GitHub, không copy placeholder thành danh tính thật. Các lệnh trên chỉ cấu hình repo mới.

## 6. Lệnh thường dùng — chạy ở root

| Lệnh | Tác dụng |
|---|---|
| `npm install` | Cài workspace và tạo/cập nhật lockfile thật. |
| `npm run check` | Kiểm tra cấu trúc/import nội bộ; không thay cho build. |
| `npm test` | Unit/domain/security primitive + structural tests, không phải end-to-end. |
| `npm run dev` | Frontend preview hoặc API mode tùy env. |
| `npm run dev:api` | Backend, cần MongoDB. |
| `npm run seed` | Thêm dataset demo vào database riêng. |
| `npm run build` | Build frontend; kết quả trong `frontend/dist`. |
| `npm run preview` | Xem bản frontend đã build trên port 4173; không tự chạy API. |
| `npm start` | Backend không watch; nếu có frontend/dist sẽ phục vụ static build. Không tự cấu hình HTTPS/production. |

Các cờ VITE_* được đưa vào frontend lúc build. Muốn bản build dùng API, chọn `VITE_STORE_MODE=api` **trước** khi chạy build. Không coi `vite preview` là triển khai production.

## 7. Bản này đã kiểm tra đến đâu?

61 test Node pass; kiểm tra cú pháp 18 JS/JSX/MJS và 2 CSS pass; kiểm tra import tương đối pass. Xem `docs/TEST_REPORT.md`.

**Chưa xác minh:** cài dependency thật, Vite build, render WebGL trên browser, API nối MongoDB, end-to-end, accessibility thực tế, UAT, production security. Môi trường tạo gói không resolve được npm registry và thiếu dependency của app. Không có cơ sở để gọi bản này là hoàn thiện 100%.

20 GLB + 20 preview được kế thừa từ gói trước: 5 họ mô hình × 4 biến thể; 8 xe giả lập. Không phải dữ liệu lắp đặt thực tế, không đủ tự động chứng minh đã đáp ứng catalog cuối cùng trong proposal.

## 8. Nguồn hướng dẫn công cụ

- GitHub Docs — Adding locally hosted code to GitHub: https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
- npm Docs — npm ci: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm Docs — workspaces: https://docs.npmjs.com/cli/v11/using-npm/workspaces/
- Node.js Releases: https://nodejs.org/en/about/previous-releases
- MongoDB Community installation: https://www.mongodb.com/docs/manual/administration/install-community/

Phạm vi học thuật lấy từ proposal bạn cung cấp; thay đổi stack theo quyết định mới trong cuộc trò chuyện. Roadmap trong `docs/ROADMAP_VI.md` là đề xuất triển khai, không phải các kết quả đã đạt.
