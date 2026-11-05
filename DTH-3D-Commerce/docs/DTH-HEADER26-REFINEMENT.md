# Header Precision 26

04/11/2026 — sửa tiếp header theo phản hồi của người dùng, trong demo Studio độc lập tại <http://127.0.0.1:5182/studio-spatial-preview.html>.

Sau khi người dùng duyệt, header đã được tích hợp vào Studio chính. Xem `DTH-HEADER26-LIVE.md` để biết wiring và kiểm thử mới nhất; phần dưới ghi lại giai đoạn refinement preview.

## Quyết định thiết kế

Header trước có quá nhiều nhãn phụ 10–11px, biểu tượng xe thiếu rõ ràng và ô chữ D không đại diện cho tài khoản thật. Phiên bản này tập trung vào một thanh điều hướng rõ ràng và một cụm hành động có phân cấp.

- Màu: pearl `#f8fafb`, navy `#102c3d`, candy blue `#2263df`, line `#d4e0e7`, blue light `#76aaf4`.
- Chữ: Manrope có sẵn; DTH 34px/800, nav 16px, account 14px, nút chọn xe 13px. Không thêm font/dependency.
- Bố cục: giới hạn 1440px, masthead 88px. Brand trái, nav giữa, cụm xe/account/bag phải. Giảm mật độ chữ, bỏ Shopping vehicle/Your space/nhãn Motorcycle parts và avatar giả.
- Chọn xe: navy, góc cắt bằng pseudo-element để giữ focus outline; nhãn một dòng và tên đầy đủ qua title/accessible label. Biểu tượng garage có ba nan chuyển góc bằng CSS perspective khi hover/focus.
- Điều hướng: một vạch active candy blue chuyển bằng GSAP quickTo; focus bàn phím được ưu tiên khi người dùng đổi từ chuột sang bàn phím. Hover không sửa aria-current hoặc route.
- Mobile: menu nổi bên dưới header, không thay chiều cao hero. 44px trở lên cho các nút. Dưới 340px giữ wordmark DTH, bỏ ba vạch logo để đủ chỗ cho bốn hành động.

Các skill đã đọc và áp dụng: frontend-design, ui-ux-pro-max, web-design-guidelines, GSAP React/timeline/performance. UI/UX sử dụng local reference; không chạy hoặc tuyên bố đã chạy search script Python. Web Interface Guidelines được đọc từ nguồn hiện tại. Review độc lập đã kiểm tra cleanup/motion/focus và callback; đây là review code, không phải đo FPS tự động.

## File thay đổi

- `frontend/src/experience/studio25Preview/Header25.jsx`: cấu trúc header, icon tài khoản, rail, menu, aria-haspopup; giữ prop/callback/URL hiện có.
- `frontend/src/experience/studio25Preview/header26.css`: stylesheet mới, scoped vào header. File `header25.css` cũ được giữ lại.
- `frontend/src/experience/studio25Preview/studio25-preview.css`: đổi body min-width từ 320px thành 0. Kiểm tra thực tế phát hiện min-width cũ kết hợp scrollbar gutter gây tràn ở viewport 320px; header mới cần vừa cả vùng client 305px.
- `docs/DTH-STUDIO25-SPATIAL-PREVIEW.md`: cập nhật mô tả header hiện tại.
- Tài liệu này.

Backup trước sửa: `test-results/header26/backups/`. Không reset Git. Không thay header production, scene 3D, API, account/cart/vehicle persistence hoặc GLB. Header vẫn nhận DOM button làm trigger để dialog trả focus đúng chỗ.

## Kiểm tra

- 25/25 unit demo đạt, 0 skip. Test label/vehicle/cart-count/URL và camera/data hiện có; không coi unit math là kiểm tra animation browser.
- Source structure và imports OK.
- Production frontend build đạt: 7,49 giây. Build entry demo đạt: 2,44 giây; log tại `test-results/header26/preview-build.log`. Cảnh báo chunk Three.js lớn đã có ở entry demo, không thay dependency hoặc asset để giảm kích thước trong lần sửa header.
- Browser thực tế: 1440px desktop, 1040/1041 breakpoint, 390px mobile và 320px nhỏ. 320px có client width 305px, scrollWidth 305px sau sửa; không tràn ngang. Nút nhỏ nhất đo được 44×44px.
- Focus Story chuyển rail từ x=29 sang x=262; aria-current vẫn là Studio. Khi focus rời nav, rail trở về Studio.
- Chọn NVX V2 cập nhật nhãn preview; My DTH và bag mở panel hiện có. Escape trả focus về nút mở panel.
- Menu mobile mở/đóng bằng nút và Escape; sau resize 1040→1041 tự đóng state mobile và hiện nav desktop.
- Hero trước/sau mở menu: top 153,67px, height 680px, không thay đổi. DOM vẫn có một Canvas.
- Native reduced-motion có logic/CSS; chưa chuyển thiết lập hệ điều hành để kiểm chứng browser. Không đo FPS/GPU. Không gọi đây là WebGL 3D header: chiều sâu garage là CSS, gallery vẫn dùng renderer hiện có.

Ảnh bằng chứng được lưu trong `test-results/header26/`. Browser console không có error trong luồng đã thử; cảnh báo Three.Clock của scene/dependency đã có từ trước, không nâng cấp thư viện để xử lý trong lần sửa header này.

## Push/pull

Chưa commit hoặc push. Dùng hướng dẫn trong `DTH-STUDIO25-SPATIAL-PREVIEW.md`: review/stage các dependency preview liên quan cùng nhóm thay đổi trước, không chỉ copy một stylesheet sang laptop; bảo toàn các local edits trước khi pull --ff-only. Không commit test-results, backup hoặc credentials.
