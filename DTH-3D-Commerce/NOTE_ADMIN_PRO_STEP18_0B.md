# DTH — Admin Experience Pro / Step 18.0B

Nâng cấp Overview và Inbox, giữ API/CSRF/phân quyền và logic chat hiện có. Không sửa Product CRUD trong bước này.

## Những gì thay đổi

- Sidebar navy, bề ngang làm việc lớn hơn, typography dễ đọc, các panel trắng/xanh đồng bộ.
- Header có một cụm cơ khí **WebGL2 thực** được dựng bằng mã: phản xạ/ánh sáng xấp xỉ, bearing xoay chậm và phản hồi con trỏ. Đây là hình cơ khí trang trí, không phải model phụ tùng bán hàng hoặc xe NVX.
- Không thêm dependency, font, model tải từ ngoài hoặc postprocessing.
- Desktop tự tải cảnh sau khi intro hoàn tất và header xuất hiện. Mobile, reduced motion và data saver mặc định dùng fallback; bấm View in 3D để chủ động tải. Reduced motion vẫn giữ cảnh tĩnh.
- Tạm dừng loop khi gõ, mở dialog, tab ẩn, header ngoài viewport, Focus inbox hoặc Motion off. DPR tối đa 1.5. Context loss có fallback và Retry tạo canvas mới.
- Dashboard hiển thị tổng từ API, hàng đợi hiện tại, tỷ lệ visible/hidden và đơn demo gần đây. Không giả doanh thu/growth/SLA, không gắn nhãn customer online dựa trên kết nối SSE của admin.
- Inbox có Focus inbox, bộ lọc server hiện có, sắp xếp Recent/Unread **trong trang hiện tại**, context panel/dialog và 3 câu trả lời mẫu do người viết. Template chỉ chèn vào bản nháp, không tự gửi, không ghi đè draft, không vượt 3.000 ký tự.
- Đọc/gửi/retry/chống gửi trùng/typing/seen/ảnh của ChatThread cũ được giữ nguyên. Thêm duy nhất prop tùy chọn `composerTools` để Admin chèn nội dung vào draft. Customer widget không nhận prop này.
- Quyền admin vẫn được kiểm tra bằng API mode + role admin; backend không đổi.

## Cài trên PC (CMD)

Giải nén ZIP vào `C:\`. ZIP có sẵn thư mục `DTH-AdminExperience-Step18_0B`.

Dừng Vite bằng Ctrl+C; MongoDB/backend có thể giữ chạy. Lưu checkpoint hiện tại sau khi test, không reset local edits để ép cài.

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status
git branch --show-current
node "C:\DTH-AdminExperience-Step18_0B\install.mjs" --project "." --check
```

Chỉ khi `CHECK OK`:

```bat
node "C:\DTH-AdminExperience-Step18_0B\install.mjs" --project "." --apply
```

Installer nhận diện Admin gốc hoặc Step18.0. Sửa đúng hai file: AdminLayout.jsx và ChatThread.jsx. Thêm module `admin/ops18b`, test và note. Không chép đè file mới khác nội dung. Backup ghi trong `.git/dth-admin-pro18b-backups` của repo thực.

## Test rồi chạy

```bat
node --test "tests\admin-pro18b.test.mjs"
```

Khi PASS:

```bat
npm run check && npm test && npm run build
```

Chạy lại frontend:

```bat
npm run dev
```

Backend chưa chạy thì mở terminal khác ở cùng root: `npm run dev:api`. Giữ MongoDB đang chạy và `frontend/.env.local` ở API mode. Không cần seed, migration hoặc npm install mới cho gói này.

Mở `http://127.0.0.1:5173/admin` và `http://127.0.0.1:5173/admin/inbox`. Trường hợp browser đang zoom quá nhỏ, nhấn Ctrl+0 để về 100% trước khi đánh giá chữ/bố cục.

## Checklist thực tế trước khi commit

1. Tài khoản admin vào được; tài khoản customer không được cấp quyền mới.
2. Dashboard hiển thị đúng các tổng hiện tại. Không có dữ liệu thì hiển thị empty state, không có số liệu giả.
3. Trên desktop thấy bearing 3D, Pause dừng, gõ tin nhắn dừng, Focus inbox giữ nguyên draft và thread.
4. Reply templates nối thêm vào draft; phải bấm Send mới gửi. Kiểm tra gửi/nhận giữa tài khoản khách và admin trên MongoDB thật.
5. Gửi ảnh, mở ảnh, Escape; thử ngắt kết nối, retry, Resolve/Reopen; không gửi trùng khi click nhanh.
6. Desktop hẹp có nút Customer context; mobile có Back to conversations và không tràn ngang.
7. Chuyển Overview/Inbox/Products/Orders rồi quay lại. Trang quản lý sản phẩm không bị thay CRUD.
8. `npm run build` phải thoát với mã 0. Chữ “built” rồi crash libuv trên Windows vẫn không phải PASS.

Sau khi đạt, review `git diff`, stage đúng file, kiểm tra không có `.env`/secret; commit/push checkpoint 18.0B. Step tiếp theo là Product CRUD 18.1.

## Rollback an toàn

Dừng Vite và chạy trong root app:

```bat
node "C:\DTH-AdminExperience-Step18_0B\install.mjs" --project "." --undo-latest
```

Undo kiểm tra TẤT CẢ các file trước khi phục hồi. File bị sửa hoặc xóa thêm sau apply sẽ khiến undo dừng, không ghi đè. Undo chỉ code, không MongoDB. Thư mục trống có thể còn lại.

## Laptop

```bat
cd /d "E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce"
node "E:\DTH-AdminExperience-Step18_0B\install.mjs" --project "." --check
```

Chỉ đổi đường dẫn installer theo thư mục giải nén thực tế. Khi đã commit/push từ PC, laptop chỉ pull code, không cài lại gói. MongoDB hai máy vẫn độc lập.
