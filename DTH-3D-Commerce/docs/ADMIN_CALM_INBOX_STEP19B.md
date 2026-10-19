# DTH — Admin Calm + Customer Care (Step 19B)

## Mục đích
- Loại bỏ hoàn toàn khung WebGL cơ khí trang trí khỏi **Overview và Inbox**; thay bằng artwork typography 2D tĩnh, không tạo canvas.
- **Không ảnh hưởng đến** 3D Home, Product, các nút Inspect, GIF/GLB của Shop hoặc Backend.
- Inbox: thêm hai tuyến đi rõ ràng `/admin` (Overview), `/` (Home website). Vẫn có `Back to conversations` khi xem hội thoại ở mobile.
- Làm mới queue / selected thread / composer / context / search / empty state, giữ nguyên API, chat SSE, unread, image, CSRF và Resolve/Reopen.
- Thanh Sync inbox yêu cầu làm mới dữ liệu từ API hiện có, không tạo dữ liệu demo.

## Cài đặt (CMD)
Giải nén ZIP vào C:\ thành C:\DTH-AdminCalmInbox-Step19B\install.mjs.

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status
node "C:\DTH-AdminCalmInbox-Step19B\install.mjs" --project "." --check
```

Chỉ chạy sau khi `CHECK OK`:

```bat
node "C:\DTH-AdminCalmInbox-Step19B\install.mjs" --project "." --apply
node --test tests\admin-calm19b.test.mjs
npm run check && npm test && npm run test:admin && npm run build
npm run dev
```

Installer chỉ thay đúng `ProShared.jsx` và `InboxPro.jsx`, thêm một CSS module, một test, tài liệu. Backup nguyên byte nằm trong `.git/dth-admin-calm19b-backups`; `--check` không sửa file; `--undo-latest` dừng nếu file bị thay đổi sau khi cài. Không seed / migration / npm install / sửa database.

## Checklist giao diện
1. `/admin`: không còn vòng bi, canvas, nút Reset mechanical view/View in 3D. Hero vẫn đẹp với đồ họa DTH tĩnh.
2. `/admin/inbox`: không còn WebGL, bấm **Overview** quay về `/admin` ngay cả khi đang mở một thread, bật Focus inbox.
3. Nút **Website home** đến `/` (trên desktop rộng; trên mobile đường đến `/` ở footer).
4. Tìm kiếm, All/Open/Resolved, Recent/Unread, chọn hội thoại, gửi chữ/ảnh, xem ảnh, Reply templates, Resolve/Reopen, Customer context, pagination vẫn dùng dữ liệu thật.
5. Gõ tin chưa gửi, đổi thread / quay Overview — ChatThread hiện tại không cam kết lưu draft khi unmount; không nhầm đây là lưu nháp tự động.
6. Thử desktop 1440px, 1280px và mobile 390px/768px; không tràn, luôn có đường thoát khỏi Inbox.
7. Thử tắt server: status Offline/Retry xuất hiện, không có số liệu giả.
8. Nếu có lỗi React runtime, chụp Console và ảnh giao diện. Test nguồn không thay cho browser E2E.

## Hoàn tác
```bat
node "C:\DTH-AdminCalmInbox-Step19B\install.mjs" --project "." --undo-latest
```

Không ép ghi đè nếu `STOP: Patch conflicts`. Nếu các file ProShared/InboxPro đã thay đổi, gửi log `--check`, không xóa, reset, hoặc sao chép đè.
