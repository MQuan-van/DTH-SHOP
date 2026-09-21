# Account Studio — tích hợp vào DTH

## Phạm vi

Cụm Account theo kế hoạch: đăng nhập/đăng ký, tổng quan tài khoản, một xe đã lưu, lịch sử đơn có tìm kiếm/phân trang, chi tiết đơn tải lại từ MongoDB, đăng xuất và xóa tài khoản có xác nhận. Giao diện Candy Cyan / Pearl White; giảm chữ phụ, chuyển động 180–320 ms; giảm chuyển động theo hệ điều hành. Không bổ sung hiệu ứng 3D hoặc thay màu vật liệu của sản phẩm.

Đây là chức năng của website demo. Không có thanh toán thật, xác minh email, khôi phục mật khẩu hay triển khai production trong milestone này.

## Các trang

| URL | Nội dung |
|---|---|
| `/account` khi chưa đăng nhập | Đăng nhập / tạo tài khoản |
| `/account` khi đăng nhập | Tổng quan, xe đã lưu và ba đơn gần nhất |
| `/account?view=vehicle` | Chọn hãng, mẫu, năm; lưu hoặc xóa lựa chọn mặc định |
| `/account?view=orders` | Danh sách đơn, tìm mã đơn/tên sản phẩm, 8 đơn/trang |
| `/account?view=orders&order=DTH-...` | Chi tiết một đơn của tài khoản hiện tại |
| `/account?view=security` | Thông tin tài khoản và xác nhận xóa |

Các URL này dùng chung route Account. Back/Forward hoạt động qua query string; không tạo nhiều project độc lập.

## QUAN TRỌNG: bản local và GitHub chưa đồng bộ

Nhánh `feat/account-studio` dựa trên `style/candy-blue-pearl`, commit `ebd0750ab447b4ceba3e66ac8b13971d65e36c58`. Source trên nhánh gốc còn phiên bản Shop/Product/Checkout cũ hơn các đoạn người dùng đã áp dụng local trong cuộc trò chuyện.

**Không thay cả project local hoặc `StoreApp.jsx`, `api.js`, `app.mjs` bằng bản trên nhánh này. Không dùng `git reset --hard`.**

Lộ trình tích hợp an toàn:

1. Kiểm tra đúng repository bằng `git status -sb`, `git remote -v`, `git rev-parse --show-toplevel`.
2. Lưu/commit các thay đổi local cần giữ; bảo đảm `.env`, dữ liệu MongoDB, mật khẩu và node_modules không nằm trong commit.
3. Đưa bản local mới nhất lên một nhánh backup/integration riêng trên đúng remote DTH-SHOP.
4. Merge/cherry-pick phần Account; nếu conflict, giải quyết theo yêu cầu dưới đây, không chọn toàn bộ ours/theirs một cách máy móc.
5. Chạy build và kiểm thử lại trên bản đã gộp. Kết quả CI của nhánh Account không chứng nhận các sửa đổi chưa được push từ máy người dùng.

### Những thay đổi cần giữ khi resolve conflict

- `StoreApp.jsx`: thêm import `AccountPage` và đổi duy nhất route account thành `<AccountPage />`. Giữ nguyên ShopPage/QuickView/ProductDetails/Bag/Completed mới trên máy. Hàm Account cũ không còn được gọi, có thể xóa sau khi kiểm tra import.
- `backend/commerce/app.mjs`: thêm các route `/account/vehicle`, `/account/orders`, `/account/orders/:id` và bổ sung userView. Giữ nguyên `/orders/:id`, expectedTotal, quoteOrder và idempotency validation mới ở local.
- `frontend/src/shop/api.js`: thêm saveAccountVehicle/loadAccountOrders/loadAccountOrder, bảo toàn createOrder có expectedTotal và loadOrder dùng cho confirmation.
- `useStore.jsx`: gộp logic khôi phục xe đã lưu và cleanup khi đổi tài khoản, không thay khóa localStorage hoặc logic thêm giỏ mới mà chưa kiểm tra.
- `models.mjs`: thêm duy nhất savedVehicleId vào User; giữ các schema/index mới khác.
- Các file mới `account/AccountPage.jsx`, CSS module, `shared/account.mjs`, tests và workflow có thể thêm riêng.

## Chạy bản đã gộp (CMD, ở project root)

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
npm run check
node --test tests/account.test.mjs
npm test
npm run build
```

Backend và frontend chạy hai terminal riêng ở cùng root:

```bat
npm run dev:api
```

```bat
npm run dev
```

Giữ MongoDB local hoạt động; không chạy lại seed chỉ để thêm savedVehicleId. Trường này mặc định chuỗi rỗng cho tài khoản cũ; lần lưu sau sẽ được ghi vào document.

`frontend/.env.local`:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Đổi biến Vite xong phải khởi động lại frontend. Chỉ chạy một Vite trên 5173, một API trên 5000. PowerShell chặn npm.ps1 thì dùng npm.cmd; không cần đổi Execution Policy.

## Dữ liệu và bảo vệ

- Xe đã lưu: `store_users.savedVehicleId` trong MongoDB. Header selection vẫn là thao tác riêng; chỉ nút Save vehicle lưu mặc định vào tài khoản.
- Các dòng giỏ hàng giữ vehicleId riêng. Khôi phục xe tài khoản không âm thầm thay xe từng dòng.
- Order history đọc `store_orders`, không lấy dữ liệu demo giả để lấp chỗ trống.
- Các read order giới hạn bằng userId phía server; sửa mã trên URL không đọc được đơn của người khác.
- Saved vehicle ghi theo session; không nhận role/userId từ client làm quyền.
- Giữ cookie HttpOnly, CSRF và Origin middleware hiện có. Không lưu mật khẩu/token trong localStorage.
- Đăng xuất dọn giỏ, lựa chọn xe và lastOrder trên phiên hiện tại; bản này chưa đồng bộ sign-out qua nhiều tab/thiết bị.
- Xóa tài khoản yêu cầu mật khẩu, checkbox và modal; backend hiện xóa tuần tự, không phải transaction nhiều collection. Cần đánh giá thêm chiến lược lỗi từng phần trước production.

## Test integration: CHỈ database dùng riêng

`tests/account.integration.test.mjs` xóa và tạo lại database test để kiểm tra độc lập. Không chạy vào DB của website. Script chỉ chấp nhận đúng database `dth_account_test` trên localhost.

CMD:

```bat
set "TEST_MONGO_URI=mongodb://127.0.0.1:27017/dth_account_test"
node --test tests/account.integration.test.mjs
```

CI dùng MongoDB 8.0 service cô lập và browser database `dth_account_browser_test`. Kết quả/screenshot nằm trong GitHub Actions artifact `account-studio-evidence`. Browser test dùng Chromium + Python Playwright để mở app React đã build, không phải HTML mock.

## Chỉnh animation

Trong AccountPage.module.css:

```css
--account-enter-ms: 320ms;
--account-stagger-ms: 30ms;
```

Page/form đổi trạng thái: fade + dịch 8px. Dòng order hiện nối tiếp tối đa 150ms delay. Hover nút/thẻ phản hồi nhẹ. Không có vòng quay trang trí liên tục; chỉ spinner khi chờ request. `prefers-reduced-motion: reduce` tắt transition/animation.

## Giới hạn kiểm chứng

CI kiểm tra đúng commit/nhánh ghi trong báo cáo, không phải mọi sửa đổi local chưa được gửi. Chưa phải kiểm toán bảo mật, chứng nhận WCAG, UAT hay bằng chứng tăng conversion. Mobile được kiểm tra bằng viewport Chromium, chưa phải Safari/iPhone/Android vật lý.
