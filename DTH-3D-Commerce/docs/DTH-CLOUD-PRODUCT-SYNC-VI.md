# DTH Step 23.4A.1 — Đồng bộ catalog qua MongoDB Atlas (PC / Laptop)

## Chính xác những gì được đồng bộ

Sau **lần copy ban đầu từ MongoDB local trên PC**, cả hai backend đọc/ghi chung database Atlas `dth_3d_commerce` qua biến `MONGO_URI` trong `backend/.env`. Từ đó, sản phẩm thêm/sửa trong Admin ở PC sẽ hiện trên laptop **sau khi refresh hoặc tải lại catalog**, không cần `git push` cho bản ghi database.

Bộ chuyển dữ liệu chỉ copy ba collection:
- `store_products`: tên, giá, modelUrl, danh mục, tương thích, cấu hình 3D sản phẩm;
- `store_vehicles`: 3 mẫu NVX;
- `store_experiences`: cấu hình Home/Studio đã lưu/publish.

Bản đầu này **không chuyển** `store_users`, `store_sessions`, `store_orders`, dữ liệu chat/support, thư mục chứa ảnh và GLB, file `.env`, hoặc thư mục AI Asset Studio (như `AI_ASSET_OUTPUT`). Không đổi/xóa dữ liệu MongoDB local, không xóa file GLB, không sửa logic API/cart. Để đăng nhập Admin trên Atlas cần tạo tài khoản thử nghiệm mới và cấp quyền Admin (xem bên dưới).

## 0. Bảo vệ dữ liệu và key

- **Không chia sẻ** Atlas URI có mật khẩu, API key, `backend/.env`, hoặc bản backup trong chat/GitHub.
- `backend/.env.atlas.local` đã được `.gitignore` bỏ qua. Không `git add -f` file này.
- Phát hiện `.env.example` cũ từng chứa chuỗi giống Meshy API key: thu hồi và tạo key mới trong bảng điều khiển Meshy. Bản vá thay dòng ví dụ bằng placeholder; **lịch sử Git có thể vẫn lưu bản cũ**.
- Chỉ nên dùng database dùng chung này cho **dữ liệu thử nghiệm FYP**. Hạn chế quyền DB user về `readWrite` trên `dth_3d_commerce`; không dùng `Atlas Admin` hay `readWriteAnyDatabase`.
- **Không chạy `npm run seed` trên Atlas trước khi chuyển catalog**, vì script từ chối đích đã có dữ liệu để tránh ghi đè.

## 1. Tạo Atlas (trong trình duyệt)

1. Vào https://cloud.mongodb.com, tạo Project `DTH-3D-Commerce` và Free cluster (phục vụ FYP/test).
2. **Security → Database Access**: tạo database user có quyền `readWrite` trên **dth_3d_commerce**.
3. **Security → Network Access**: thêm IP công khai hiện tại của PC; sau đó laptop nếu khác IP. Tránh `0.0.0.0/0`.
4. Cluster → **Connect → Drivers → Node.js**, sao chép URI Atlas. Gắn path `/dth_3d_commerce` **trước** dấu `?`.
5. URI có mật khẩu chứa ký tự đặc biệt (`@`, `#`, `/`, `?`, v.v.) phải encode phần password theo URL percent-encoding.

## 2. PC — backup local trước

**Sử dụng CMD, không phải PowerShell**. Dừng backend PC sau khi xong các thao tác Admin, và đừng tạo sản phẩm mới cho tới khi copy hoàn tất. MongoDB local vẫn cần chạy.

```cmd
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
npm ci
node --test tests\atlas-catalog-sync.test.mjs
node tools\atlas-catalog-sync.mjs --backup
```

Bản backup Extended JSON theo BSON types nằm trong `backups/atlas-catalog-...` và bị Git bỏ qua. Sao chép thư mục này sang vị trí an toàn nằm ngoài repository nếu cần. Đây là backup **3 collection catalog**, không phải toàn bộ MongoDB.

## 3. PC — cấu hình Atlas URI riêng (chưa đổi backend)

```cmd
copy backend\atlas-catalog.env.template backend\.env.atlas.local
notepad backend\.env.atlas.local
```

Chỉnh đúng `MONGO_ATLAS_URI=...` trong file local. **Không sửa `backend/.env` ngay**; backend phải dùng MongoDB local cho tới khi hoàn thành `--verify`.

```cmd
node tools\atlas-catalog-sync.mjs --plan
```

Kết quả mong đợi: có **ít nhất một `store_products`** trên PC, các collection catalog trên Atlas bằng 0 và `PLAN OK`.

## 4. PC — copy một lần lên Atlas

**Chỉ khi thấy `PLAN OK`:**

```cmd
node tools\atlas-catalog-sync.mjs --apply
node tools\atlas-catalog-sync.mjs --verify
```

`--apply` tự backup catalog local thêm một lần, sau đó **chỉ insert** vào các collection catalog rỗng trên Atlas. Không drop, replace, upsert hay xóa collection. `--verify` so số lượng và SHA-256 của nội dung Extended JSON canonical để đảm bảo đồng nhất tại thời điểm chuyển.

Nếu lỗi ở giữa chừng, **dừng tại đây**. Đích Atlas có thể chứa dữ liệu copy dở và công cụ sẽ chặn lần `--apply` tiếp theo. Kiểm tra bằng Compass rồi khôi phục từ backup/khởi tạo database thử nghiệm mới trước khi thử lại. Không tự động xóa hoặc `dropDatabase`.

## 5. PC — chuyển backend sang Atlas

Sao lưu `backend/.env` ở vị trí bảo mật ngoài repo trước khi sửa, rồi mở:

```cmd
notepad backend\.env
```

Giữ nguyên các biến `PORT`, `HOST`, `SHOP_ORIGINS`, `AI_ASSET_*`...; chỉ thay `MONGO_URI=` thành **cùng URI Atlas** trong `backend/.env.atlas.local`.

```cmd
node tools\verify-atlas-backend.mjs
npm run dev:api
```

Backend không tự đổi giữa local/Atlas. Chỉ `MONGO_URI` quyết định nơi đọc ghi. Đừng chạy đồng thời backend đang trỏ local và backend đang trỏ Atlas khi bạn muốn dữ liệu đồng nhất.

### Tạo tài khoản Admin thử nghiệm trên Atlas

Vì bộ chuyển *không* mang theo `store_users`, hãy đăng ký một tài khoản thử nghiệm trên website đang dùng backend Atlas, rồi chạy **trong root repository**:

```cmd
npm run admin:grant -- your-admin-test-email@example.com
```

Đăng xuất/đăng nhập lại. Không copy mật khẩu vào lệnh, không dùng email/mật khẩu production. Nếu tài khoản đó chưa đăng ký trên Atlas, công cụ sẽ từ chối và không tự tạo user.

## 6. Laptop — cùng database, không chạy copy lần nữa

```cmd
cd /d "E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce"
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
git lfs pull
notepad backend\.env
```

Chỉ thay `MONGO_URI` bằng **cùng URI Atlas đã dùng trên PC**. Nếu laptop chưa có `backend/.env`, sao chép mẫu rồi sửa:

```cmd
if not exist backend\.env copy backend\.env.example backend\.env
```

Đảm bảo `frontend/.env.local` đang có `VITE_STORE_MODE=api` và `VITE_SHOP_API_URL=/api/shop`. Sau đó:

```cmd
node tools\verify-atlas-backend.mjs
npm run dev:api
```

Chạy frontend trong CMD khác:

```cmd
npm run dev
```

Mở `/admin/products/ohlins` và `/` (Studio), kiểm tra Ohlins TTX và các sản phẩm khác. Nếu sản phẩm mới chưa hiện ngay, tải lại trang để fetch catalog. Hiện chưa có websocket push realtime.

## 7. Những thứ Git LFS vẫn phải đồng bộ

- `modelUrl` của Ohlins TTX là đường dẫn `frontend/public/models/ai-products/...glb` trỏ tới GLB **trên máy chạy frontend**. Atlas không lưu file GLB.
- Khi thêm GLB mới, vẫn phải push Git LFS ở PC rồi `git pull && git lfs pull` trên laptop cho tới khi xây cloud asset storage.
- Những model do AI Asset Studio publish qua API phụ thuộc thư mục output/state của backend PC, **không nằm trong Atlas**.

## 8. Kiểm tra an toàn khi trục trặc

- `querySrv ECONNREFUSED` / `queryTxt ECONNREFUSED`: DNS hiện tại không trả lời truy vấn SRV/TXT của Atlas. Ngày 04/11/2026, Node trên PC dùng DNS `127.0.0.1` bị refused; cùng URI ping Atlas thành công qua `1.1.1.1`/`8.8.8.8`. Backend hỗ trợ opt-in `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` trong `backend/.env`. Chỉ áp dụng với URI `mongodb+srv://`, thay resolver trong tiến trình Node dùng config này, không đổi DNS Windows, không thay URI/mật khẩu. Để trống/xóa dòng này để dùng DNS hệ thống. Restart backend sau khi sửa `.env` vì Node watch không theo dõi file đó. Không tự chuyển sang MongoDB local hoặc seed dữ liệu.
- `MongoServerSelectionError`: kiểm tra IP Access List của PC/laptop, internet, cluster đang hoạt động và network TLS.
- `AuthenticationFailed`: database user/password hoặc password chưa percent-encode.
- `PLAN BLOCKED`: Atlas có dữ liệu catalog hoặc PC không có sản phẩm. Không xóa từ xa để vượt guard.
- `VERIFY FAILED`: không thay `backend/.env`. Kiểm tra bản backup và các collection đích.
- `CONFIG OK`, `Ohlins TTX: FOUND` nhưng trang trắng: kiểm tra Vite API proxy, `frontend/.env.local` và Git LFS model file.
- Sau khi bắt đầu sử dụng Atlas, không chạy lại `--verify` với kỳ vọng local và cloud luôn khớp: dữ liệu mới chỉ được ghi Atlas nên khác local là bình thường.

## Tham khảo

- https://nodejs.org/api/dns.html#dnssetserversservers
- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- https://www.mongodb.com/docs/atlas/compass-connection/
- https://www.mongodb.com/docs/atlas/driver-connection/
- https://www.mongodb.com/docs/drivers/node/current/data-formats/extended-json/
