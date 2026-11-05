# Backend startup — Atlas DNS fix

04/11/2026. Lỗi thực tế: `Error`, code `ECONNREFUSED`, syscall `querySrv`. DNS mà Node nhận từ hệ thống là `127.0.0.1`; truy vấn SRV của Atlas bị từ chối. Cổng API 5000 khi kiểm tra ban đầu trống, không phải lỗi chạy trùng. MongoDB local 27017 có chạy nhưng backend đang cấu hình Atlas, không dùng local.

## Bằng chứng và sửa

- DNS hệ thống: SRV `ECONNREFUSED`. Cùng hostname qua `1.1.1.1` và `8.8.8.8`: mỗi resolver trả ba bản ghi SRV.
- Cùng URI/credentials, chỉ đổi resolver trong tiến trình thử: Atlas `ping` thành công; không khởi tạo model/index trong các phép thử ping.
- Thêm opt-in `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` vào `backend/.env` local đã ignored. Giữ nguyên mọi nội dung khác, URI, credentials, DNS Windows và cấu hình mạng.
- `config.mjs` áp dụng DNS trước khi kết nối driver, chỉ với URI `mongodb+srv://`. Không có setting hoặc URI local/standard thì dùng DNS hiện có. Giá trị DNS phải là danh sách IP hợp lệ; không tự chọn public DNS khi setting trống.
- Log khởi động nêu stage và error code, phân biệt DNS/auth/port/index. Không in raw URI, error message hay stack có thể chứa credentials.
- Node watch hiện có tự nạp thay đổi và API lên lại, không tạo thêm instance hay đổi cổng.

Lưu ý: đây là resolver cấp tiến trình Node cho `dns.resolve*`, không phải resolver riêng từng connection và không thay cấu hình DNS hệ điều hành. Tham khảo [Node DNS](https://nodejs.org/api/dns.html#dnssetserversservers).

## File

- Thêm `backend/commerce/startup.mjs`: cấu hình resolver opt-in, thông báo lỗi an toàn.
- Sửa `backend/commerce/config.mjs`, `backend/server.mjs`: áp dụng setting và log theo stage.
- Thêm `tests/backend-startup.test.mjs`: 7 tests, gồm config thật trong child process không truy vấn network/DB.
- Sửa `backend/.env.example`, `docs/DTH-CLOUD-PRODUCT-SYNC-VI.md`: hướng dẫn tùy chọn.
- Sửa duy nhất key `MONGO_DNS_SERVERS` trong `backend/.env` local; không commit file này.

Không sửa auth, payload/route API, dữ liệu catalog/cart/order, GLB hoặc dependency. Không seed/migration/drop index. Server giữ nguyên quy trình `model.init()` đã có và đã được người dùng cho phép trước đó; lần tự restart này không chạy công cụ migration.

## Kiểm tra

- `node --test tests/backend-startup.test.mjs tests/domain.test.mjs tests/security.test.mjs tests/standalone.test.mjs`: **68/68**, không skip.
- `node --check backend/server.mjs`: đạt. Source/import check trong standalone suite: đạt.
- `npm run build --workspace frontend`: đạt. Không sửa frontend; đây là compile check, không phải chứng nhận browser/GLB/FPS.
- Backend thật: `GET /api/shop/health` trả `success: true`; `GET /api/shop/products` thành công và trả 23 sản phẩm từ cấu hình Atlas hiện tại.
- Log/backup source trước sửa: `test-results/backend-startup-dns/`. Không sao lưu `.env` chứa secrets vào thư mục này.

## Sử dụng / PC và laptop

Giữ terminal backend đang hoạt động. Không chạy thêm backend trên 5000. Lần mở mới dùng `npm run dev --workspace backend`; chỉ một instance. Node watch chỉ restart khi file được theo dõi thay đổi; dòng `Waiting for file changes` nghĩa là tiến trình con đã lỗi và đang chờ, không phải migration đang chạy.

Muốn quay lại DNS hệ thống: để trống hoặc xóa `MONGO_DNS_SERVERS` trong `backend/.env`, rồi restart backend. `.env` không phải module nên Node watch không tự reload riêng thay đổi của file này.

Chưa commit/push. Review và stage các đường dẫn source/test/doc cụ thể bên trên, bảo toàn các local edits khác và các dependency từ công việc trước. Không stage `.env`, `test-results` hoặc backup.

PC: sau khi review/test/commit, `git push origin feat/story-shop-ultra-pc-20261026`. Laptop: bảo toàn công việc local, đúng branch, working tree sạch rồi `git fetch origin` và `git pull --ff-only origin feat/story-shop-ultra-pc-20261026`. Không reset/force nếu divergent.

`.env` không truyền qua Git. Laptop chỉ cần thêm `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` nếu có cùng lỗi DNS và mạng cho phép hai resolver này; nếu DNS bình thường, để trống. Không copy/hiển thị URI có mật khẩu trong chat hoặc commit. Không chạy lại seed/migration để xử lý lỗi DNS.
