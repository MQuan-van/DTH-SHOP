# DTH Step 20 — AI Asset Studio

## Mục tiêu

- Backend tự quét **một thư mục inbox** (ảnh JPG/PNG/WEBP, tối đa 20 MB/ảnh).
- Admin chọn **1–4 ảnh của cùng một đối tượng**, bấm Generate và xác nhận tiêu credits.
- Backend gọi Meshy Image-to-3D hoặc Multi-Image-to-3D, lưu ID task, tự theo dõi tiến độ và tải GLB về máy.
- Admin xem trước GLB, bấm Publish cho NVX V1 / V2 / V3.
- Storefront Build đọc manifest model được duyệt; **không sửa GLB gốc** do bạn đã thêm vào frontend/public.

### Đường dẫn file trên máy

Ví dụ Windows:

```text
D:\DTH-AI-Assets\inbox\
  nvx-v2-front.jpg
  nvx-v2-rear.jpg
  nvx-v2-left.png
D:\DTH-AI-Assets\generated\
  <internal-task-id>.glb
  .dth-ai-studio\state.json
```

Nếu đã có `AI_ASSET_INBOX`, `AI_ASSET_OUTPUT` trong `backend/.env`, phần mềm sẽ dùng đúng các đường dẫn đó. Nếu không, mặc định là `data/ai-assets/inbox` và `data/ai-assets/generated` trong project (thư mục `data` đã được .gitignore).

### Backend .env

```env
MESHY_API_KEY=msy_...YOUR_PRIVATE_KEY...
MESHY_API_BASE=https://api.meshy.ai
AI_ASSET_INBOX=D:\DTH-AI-Assets\inbox
AI_ASSET_OUTPUT=D:\DTH-AI-Assets\generated
```

- Không bao giờ đưa API Key vào React/frontend hoặc GitHub.
- `.env` đã bị .gitignore; vẫn cần kiểm tra `git status` trước khi commit.
- Không gửi key trong chat; bản cài **không đọc** key trong quá trình --check/--apply.
- Backend chạy trên cùng máy chứa folder. Sau này deploy lên cloud nên chuyển sang private object storage.
- Chạy **API mode** (VITE_STORE_MODE=api). Đăng nhập Admin.

### Sử dụng

1. Khởi động backend + MongoDB và frontend như thường lệ.
2. Truy cập `/admin/ai-assets` trên cùng origin với website. Trang `/admin` (nếu còn bản Admin chuẩn) có link mở AI Asset Studio.
3. Copy ảnh vào folder `inbox`. Danh sách tự cập nhật ~7 giây, hoặc chọn Scan now.
4. Click chọn ảnh (ảnh đầu tiên là ảnh chính), tối đa 4 ảnh.
5. Chọn **Generate 3D** và đồng ý xác nhận tiêu credits.
6. Đợi Meshy xử lý. Task và trạng thái được lưu trong `generated/.dth-ai-studio/state.json` và phần mềm poll khoảng 12 giây. Không bấm lại khi task đang chạy.
7. Khi `GLB ready`, chọn **Preview GLB 360°**, sau đó chọn phiên bản xe và Publish. Quay lại `/shop?mode=build`, làm mới trang và chọn phiên bản tương ứng.
8. Nếu model không đúng, publish lại một task GLB đã có để khôi phục, hoặc đơn giản là **không publish**. Model GLB tự nhập trước đó vẫn giữ nguyên.

**Lưu ý:** V1 / V2 / V3 trong Build luôn là xe thật hay mô hình minh họa tùy dữ liệu. Meshy tạo mô hình mô phỏng, **không** được dùng như bản đo cơ khí chính xác hoặc hướng dẫn lắp phụ tùng.

### Dữ liệu và an toàn

- Chỉ Admin có thể liệt kê ảnh, lấy thumbnail, xem task, preview và publish.
- Chỉ bản GLB đã được publish mới có endpoint công khai (`/api/shop/ai-assets/models/vX.glb`).
- Ảnh trong inbox **không tự gửi lên Meshy**; chỉ gửi ảnh khi người dùng bấm Generate và xác nhận.
- Mỗi ảnh tối đa 20 MB; GLB tối đa 128 MiB theo giới hạn viewer Step19.
- Ảnh dưới thư mục con chưa hỗ trợ, copy trực tiếp vào `inbox`.
- Hai quy trình generate không được chạy song song. Nếu rớt mạng ở thời điểm Meshy đã nhận task nhưng chưa nhận ID, task chuyển `UNCERTAIN`; kiểm tra Meshy Request Logs trước khi thử lại để tránh trừ credits hai lần.
- Chỉ một backend process được quản lý cùng thư mục `generated`; `state.json` là trạng thái local, chưa thiết kế cho nhiều server.
- Không xóa thư mục `generated` sau khi publish vì model trong storefront được stream từ đó.
- Public endpoint hiện cho phép người truy cập tải GLB đã duyệt; phù hợp demo public showroom. Đừng publish model có bản quyền hoặc nội dung không được phép chia sẻ.
- Key vẫn nằm backend; API submit dùng server-side Base64 data URI.
- `--check` không tạo folder, không gọi API; `--apply` không đọc hoặc in secrets, không tạo nhiệm vụ tiêu credits.

### Kiểm tra

```bat
node "C:\DTH-AI-Step20.mjs" --project "." --check
node "C:\DTH-AI-Step20.mjs" --project "." --apply
node --test tests/ai-assets-20.test.mjs
npm run build --workspace frontend
npm run dev --workspace backend
npm run dev --workspace frontend
```

Truy cập `/admin/ai-assets`. Nếu frontend hiển thị `API mode required`, kiểm tra cấu hình API mode hiện tại. Nếu backend trả về 401/403, đăng nhập tài khoản Admin.

### Giới hạn thực tế của bản phát hành

- Chưa xác minh với **API key thật** hoặc gọi task Meshy có tính phí.
- Tạo model, tải GLB, duyệt và publish được kiểm thử bằng **mô phỏng Response của Meshy**, không tiêu credits.
- Frontend/GLB/driver Windows phải kiểm tra trên máy người dùng. Các test cung cấp không thay thế E2E browser.
- Không có hệ thống tính tiền, upload ảnh từ browser, background workers phân tán hoặc lựa chọn texture nâng cao.

### Tài liệu Meshy

- https://docs.meshy.ai/en/api/image-to-3d
- https://docs.meshy.ai/en/api/multi-image-to-3d
- https://docs.meshy.ai/en/api/quick-start
