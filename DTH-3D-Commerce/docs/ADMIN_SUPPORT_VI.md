# DTH Admin Studio + Live Support — hướng dẫn chạy và mở rộng

## Phạm vi bản đầu

Nâng cấp khu quản trị trong chính dự án React/Vite + Express/MongoDB. Nhánh: `feat/admin-support-studio`, dựa trên `feature/3d-store` tại `8290fbc`. Không đổi Home, Shop, Quick View hoặc cấu hình model/camera/vật liệu/tốc độ Viewer3D. Không truy cập database của người dùng trong quá trình kiểm thử.

- `/admin`: số liệu thực về sản phẩm, xe, đơn mô phỏng và hội thoại đang mở.
- `/admin/inbox`: danh sách khách, hội thoại realtime, ảnh, typing, unread, Sent/Seen, Resolve/Reopen; thông tin xe/đơn gần đây ở cột ngữ cảnh trên desktop đủ rộng.
- `/admin/products`: tìm kiếm, ẩn/hiện, thêm/sửa bằng form; compatibility và thông số; xem trước ảnh/3D theo yêu cầu. Giữ ID khi sửa. Kiểm tra timestamp chống ghi đè sửa đổi mới hơn.
- `/admin/vehicles`: đọc/tìm cấu hình xe hiện có và số sản phẩm liên kết. Sửa ánh xạ trong form sản phẩm; chưa thêm CRUD xe.
- `/admin/orders`: đọc/tìm đơn, xem giá đã lưu lúc checkout. Chưa xử lý vận chuyển, hoàn tiền hoặc thanh toán thật.
- Cửa hàng: nút Support dành cho khách đã đăng nhập. Admin vào Inbox. Đây là chat riêng của DTH, không phải tích hợp tài khoản Facebook Messenger.

## 1. Lấy source an toàn

Dừng Vite/backend trước khi chuyển nhánh và cài dependency. MongoDB đang chạy có thể giữ nguyên.

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status -sb
git remote -v
```

Đường dẫn có thể là `...\DTH-SHOP\DTH-3D-Commerce` trên máy khác. `origin` phải trỏ vào MQuan-van/DTH-SHOP. Lưu/commit có chọn lọc các thay đổi chưa lưu; không commit .env hoặc dữ liệu MongoDB. Không dùng reset --hard, git clean hoặc thay remote lần nữa.

Khi working tree sạch:

```bat
git fetch origin
git switch feat/admin-support-studio
git pull --ff-only origin feat/admin-support-studio
npm ci
npm run check
npm test
npm run test:account
npm run test:admin
npm run build
```

Nếu chưa có nhánh local và Git không tự tạo tracking branch: `git switch --track origin/feat/admin-support-studio`. Nếu Git báo diverged/conflict, dừng và xem `git status`; không reset để xử lý nhanh.

`npm ci` cần thiết vì backend thêm sharp 0.35.4 và lockfile tương ứng. Không cài riêng một phiên bản sharp khác, không dùng --force/--legacy-peer-deps. Trong PowerShell dùng npm.cmd; các lệnh cd /d ở đây dành cho CMD.

## 2. Kết nối database hiện có — không seed lại

Chat giữa hai tài khoản cần backend thật. `dev:flow` vẫn phục vụ luồng Account/Shopping cũ nhưng KHÔNG giả lập quyền admin hay nhận tin nhắn thật. Không có chat giả tự chuyển sang thành công nếu API lỗi.

Backend `backend/.env` giữ nguyên file đang chạy và kiểm tra:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/dth_3d_commerce
PORT=5000
HOST=127.0.0.1
NODE_ENV=development
```

Frontend dùng `frontend/.env.local`, không phải .env.example:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Giữ MongoDB đang chạy. Nếu đã có catalog thì không chạy seed lại. Từ root ứng dụng, terminal backend:

```bat
npm run dev:api
```

Terminal frontend khác:

```bat
npm run dev
```

Mở đúng địa chỉ Vite hiển thị, ví dụ `http://127.0.0.1:5173`. Cổng 5173 và 5000 cần đang chạy song song, MongoDB trên 27017. Backend tự tạo/index hai collection chat; không cần chỉnh database bằng tay. Nếu server cũ giữ kết nối SSE, Ctrl+C rồi đợi server thoát trước khi bật lại.

## 3. Tạo quyền admin cho tài khoản của chính bạn

Không có mật khẩu admin công khai trong source. Đăng ký một tài khoản riêng trên `/account` ở API mode, dùng mật khẩu thử nghiệm đủ mạnh và không dùng lại mật khẩu cá nhân.

Trong terminal mới tại root, thay email bên dưới bằng đúng email tài khoản vừa đăng ký:

```bat
npm run admin:grant -- "EMAIL-ADMIN-CUA-BAN"
```

Lệnh chỉ nâng quyền cho tài khoản đã tồn tại và không bị vô hiệu hóa. Nó không tạo tài khoản, không thay mật khẩu, không sửa catalog/đơn. Phiên cũ bị thu hồi để buộc đăng nhập lại. Đây là hành động operator local, không phải API cho khách tự nâng quyền.

Đăng nhập lại rồi mở `/admin` hoặc `/admin/inbox`. Giữ một tài khoản customer riêng để thử chat. Đừng nâng quyền mọi tài khoản thử nghiệm.

## 4. Thử chat bằng hai phiên đăng nhập độc lập

Cửa sổ thường: đăng nhập admin, mở `/admin/inbox`. Cửa sổ InPrivate/Incognito hoặc trình duyệt khác: đăng nhập customer, mở cửa hàng và bấm Support. Hai tab trong cùng profile thường chia sẻ cookie, không phù hợp để thử hai vai trò khác nhau.

1. Khách gửi tin. Admin thấy hội thoại/tin mới mà không F5.
2. Admin gõ trả lời. Khách thấy typing ngắn và nhận trả lời.
3. Bấm Image, chọn ảnh, xem preview rồi Send. Thử cả hai chiều; bấm ảnh nhận để mở lớn.
4. Đọc tin ở cuối hội thoại, cửa sổ có focus: phía gửi được cập nhật Seen. Đọc của admin là trạng thái chung của nhóm hỗ trợ, chưa tách từng nhân viên.
5. Đóng Support rồi admin gửi: nút Support có unread. Mở lại để đọc. Huy hiệu global hiện theo trang hội thoại đã tải; Inbox có phân trang.
6. F5 cả hai phía: lịch sử và ảnh vẫn đọc được. Thử dừng rồi bật backend: kết nối phải tự nối lại và tải lại tin còn thiếu.
7. Admin Resolve; khách gửi tin tiếp thì hội thoại tự mở lại.
8. Mất kết nối khi gửi: chỉ hiện Sending/Not sent; không hiển thị thành công giả. Retry giữ mã gửi để tránh lưu trùng cùng lần thử. Tin đã được server lưu có thể được xác nhận qua stream ngay cả khi phản hồi POST bị mất.

Enter gửi, Shift+Enter xuống dòng; bộ gõ đang composition không bị gửi nhầm. Một ảnh mỗi tin, JPEG/PNG/WebP, tối đa 5 MiB trước xử lý. Server kiểm tra dữ liệu thực, giới hạn pixel, bỏ metadata và chuyển WebP tối đa 1600px / 2 MiB. SVG, HTML, GIF và ảnh động không được hỗ trợ. Đây không phải quét antivirus hoặc mã hóa đầu cuối.

`Connected` / `Live connection` chỉ nói kết nối browser-server đang có; không hứa nhân viên đang online hay trả lời ngay. Nhân viên cần mở Inbox để trả lời. Chưa có thông báo push khi đóng trình duyệt.

## 5. Kiểm tra trong Compass sau khi thử giao diện

Kết nối `mongodb://127.0.0.1:27017`, database `dth_3d_commerce`.

- `store_chat_conversations`: một hội thoại mỗi customer, status và các vị trí đọc.
- `store_chat_messages`: text, seq, senderId/senderRole, mã chống gửi trùng, image đã xử lý.
- `store_users`: role vẫn kiểm tra phía server. Đăng ký public không nhận role admin từ body.

Lọc conversationId trong messages để đối chiếu tin hai chiều. Ảnh nằm trong document tin nhắn ở dạng nhị phân đã xử lý, không có URL public trong frontend/public. API ảnh kiểm tra cùng quyền owner/admin như hội thoại; khách khác hoặc chưa đăng nhập không truy cập được.

Khách xóa tài khoản qua chức năng xác nhận mật khẩu hiện có sẽ xóa hội thoại/ảnh của khách cùng các dữ liệu demo liên quan. Không xóa thử tài khoản quan trọng để demo.

## 6. Kiến trúc mở rộng

Frontend:

```text
src/shop/admin/        AdminLayout, Overview, Inbox, Products, Vehicles, Orders
src/shop/support/     SupportProvider, SupportWidget, ChatThread, support.css
```

Backend:

```text
commerce/admin/       routes.mjs, grant.mjs
commerce/support/     routes.mjs, models.mjs, images.mjs, hub.mjs
shared/support.mjs    giới hạn và validation
```

Transport: HTTP POST để gửi/ghi MongoDB, SSE (EventSource) để đẩy sự kiện từ server tới các browser có quyền; browser dùng sequence tải phần tin còn thiếu. Không polling định kỳ thay realtime. Request đã ghi DB mới được báo gửi thành công. Typing chỉ là sự kiện tạm, không lưu thành tin nhắn.

Phạm vi vận hành bản đầu: MỘT tiến trình API. Trước khi chạy nhiều replica/cluster cần thay hub bộ nhớ bằng broker chung (ví dụ Redis pub/sub), củng cố thứ tự/serialization liên tiến trình, đo tải và giới hạn tài nguyên. Ảnh nhỏ nằm trong MongoDB phù hợp bản demo; trước khi mở rộng nên tách image storage có ACL riêng, quota, lifecycle/retention và backup.

Module tiếp theo có thể bổ sung nhân viên/permissions chi tiết, phân công hội thoại, tags, quick replies, lưu bản nháp theo hội thoại, push/email thông báo, nhiều ảnh/file và công cụ kiểm duyệt. Chưa có những tính năng đó trong bản này. Không có cuộc gọi/video, trạng thái hiện diện từng nhân viên, chat Facebook hoặc giao dịch thật.

Product editor xác nhận khi Cancel còn thay đổi và cảnh báo đóng/reload tab. Chưa chặn toàn bộ navigation nội bộ/Back của browser; hãy Save trước khi chuyển mục.

## 7. Kiểm thử và giới hạn

`npm run test:admin`: unit validation và xử lý ảnh thật. CI dùng MongoDB `_test` riêng và hai browser context độc lập để kiểm tra HTTP/SSE, gửi ảnh hai chiều, reload, reconnect, retry, phân quyền và responsive. Đọc kết quả run của đúng commit; sự tồn tại của file test không đồng nghĩa test đã qua.

Không chạy `tests/support.integration.test.mjs` trên database ứng dụng: nó có cleanup/dropDatabase và chỉ nhận URI database test có guard. CI không kết nối tới MongoDB của bạn.

Các test theo tình huống không phải kiểm toán bảo mật production, không chứng minh mọi trình duyệt/thiết bị/FPS hoặc khả năng chịu tải nhiều khách. Audit dependency chỉ phản ánh kết quả tại thời điểm quét. Giữ website ở local/demo cho đến khi kiểm tra deployment, TLS, dữ liệu riêng tư, backup và tải thực.

Nguồn kỹ thuật: MDN Server-sent events / EventSource; OWASP File Upload Cheat Sheet / Authorization Cheat Sheet; tài liệu sharp constructor và output metadata.
