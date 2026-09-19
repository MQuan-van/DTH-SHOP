# Lộ trình đề xuất — từ baseline độc lập đến FYP

## Quyết định đã chốt

Giữ repo cũ như nguồn tham chiếu. Repo mới và database mới độc lập. Stack: React + Vite + Three.js/React Three Fiber, Node.js + Express, MongoDB/Mongoose. Chỉ mock checkout; không real payment, AR, native app hoặc xác minh fitment bằng VIN/live manufacturer API.

Theo proposal đã cung cấp: 20–30 sản phẩm, 4–5 danh mục, 3D toàn catalog demo, compatibility filtering, auth, catalog/detail, cart/mock checkout. Wishlist/reviews/search thuộc Should-Have; order history/related products/theming thuộc Could-Have. Baseline có một số Should/Could sẵn trong code nhưng không có nghĩa mọi Must-Have đã được kiểm thử.

## Mốc 0 — khởi tạo độc lập

Giải nén ngoài repo cũ; npm install; test/check/build; chạy preview; git init; tạo GitHub repo trống; kiểm tra remote; commit/push. Thành công khi có source/lockfile tái lập ở repo mới và không sửa bản gốc.

## Mốc 1 — chốt requirements và chứng cứ nghiên cứu

Lập requirement IDs và acceptance criteria; ghi phạm vi xe/catalog. Làm nghiên cứu/literature/user research theo proposal, không giả transcripts hoặc câu trả lời survey. Ghi quyết định thay stack và các mục proposal phải cập nhật: technology justification, architecture, authentication, database integrity, testing, deployment và thư viện/license.

## Mốc 2 — xác minh một luồng đầy đủ

Chọn một xe → thấy part đúng → mở GLB thật → add bag → login → mock order → order lưu MongoDB. Kiểm thử cả mismatch/unknown/expired session/network error trước khi mở rộng catalog.

## Mốc 3 — chuẩn hóa code và quản trị

StoreApp.jsx đang chứa nhiều component/trang. Sau khi có baseline chạy được, tách page/component thành module riêng nhưng giữ hành vi bằng regression tests. Hoàn thiện form admin thay editor JSON, validation, CRUD, mapping quản lý được. Asset pipeline có kiểm tra đường dẫn/kích thước/nguồn/license; đừng thêm real payment ngoài phạm vi.

## Mốc 4 — 3D và dữ liệu toàn catalog

Chuẩn hóa 20–30 demo products trong 4–5 danh mục, model tương ứng, đủ thông tin và ảnh fallback. Có nguồn cho fitment thật nếu dùng; nếu synthetic phải nhãn rõ. Hoàn thiện lighting, kiểm tra tỷ lệ, loading/error/retry, tối ưu trên thiết bị tầm trung. Không đặt logo/nhãn real manufacturer lên model minh họa như thể xác thực.

## Mốc 5 — kiểm thử hệ thống và triển khai

Đạt build thật, API/Mongo integration tests, frontend component tests, end-to-end và test quyền truy cập. Sau khi đã có lockfile thật, thêm CI cho install/test/build; không coi unit tests thay thế functional tests. Public deployment cần cấu hình origin/HTTPS/cookies/env và dữ liệu demo an toàn. GitHub source URL không tự là URL website live.

## Mốc 6 — đánh giá và report

Theo proposal: ≥8 design principles; user research ≥5 interviews + ≥20 survey responses; ≥90% documented functional-test pass rate; ≥5 external UAT participants; mục tiêu mean SUS ≥68; phản ánh từng objective với bằng chứng. Đây là mục tiêu của proposal, không phải kết quả starter đã đạt. Literature source counts và các yêu cầu Contextual Report vẫn phải đối chiếu tài liệu gốc.

SUS phản ánh usability chứ riêng con số này không đo trực tiếp mức giảm purchase hesitation. Có thể đề xuất task measures/câu hỏi confidence riêng và trao đổi với supervisor; phần bổ sung này không được trình bày như đã có trong proposal hoặc như bằng chứng tăng conversion/giảm returns thực tế.

## Quản lý mỗi lần thay đổi

Tạo branch ngắn cho từng mục, commit nhỏ mô tả đúng thay đổi, test trước merge vào main. Không cần tạo cả dev/staging/production branches ngay đầu FYP solo. Lưu issue, test result và screenshot theo commit. Viết report dựa trên implementation/results thật.
