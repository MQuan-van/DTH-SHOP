# Studio 25 — Spatial Gallery: kế hoạch và demo

Ngày kiểm tra: 04/11/2026. Phạm vi hiện tại: bản xem thiết kế độc lập, chưa thay Studio chính.

Cập nhật mới nhất: toàn bộ gallery/camera/collection đã gộp vào Studio chính sau khi người dùng yêu cầu. Xem `DTH-STUDIO-SPATIAL25-LIVE.md`. Phần dưới lưu lại giai đoạn demo và hướng thiết kế ban đầu.

Giai đoạn trước khi gộp toàn bộ: riêng Header 26 đã áp dụng trên Studio chính, xem `DTH-HEADER26-LIVE.md`; gallery/camera Spatial 25 khi đó còn là preview riêng.

## Mở demo

<http://127.0.0.1:5182/studio-spatial-preview.html>

Server demo đã được mở ở cổng riêng 5182. Nếu link đang hoạt động, không chạy thêm một server trên cùng cổng. Không dừng backend 5000 hoặc frontend 5173 của người dùng.

Khi cần mở lại, chạy từ thư mục ứng dụng:

```powershell
npm.cmd run dev --workspace frontend -- --host 127.0.0.1 --port 5182 --strictPort
```

Backend hiện có được dùng qua proxy của Vite. Demo chỉ GET danh mục public; không đăng nhập, seed, migration, tạo index hoặc ghi dữ liệu. Nếu API không có, demo ghi rõ local asset studies và không tự gán giá cho TTX/Monoshock.

## Hướng thiết kế

| Hạng mục | Cách làm |
| --- | --- |
| Tên, giá, thông tin | Cụm nội dung nằm trong bố cục giữa màn hình rộng tối đa 1180px, cạnh sản phẩm. Tên dài có cỡ chữ riêng để tránh tách một chữ cuối dòng. |
| Đường chỉ | SVG nối từ tên tới một điểm raycast trúng bề mặt GLB thật. Không gán tên mesh hoặc ý nghĩa lắp ráp. Ẩn khi di chuyển, bị che, ngoài khung và trên mobile. |
| Đổi sản phẩm | Mỗi sản phẩm có một vị trí trong cùng scene. Camera lùi ra, đi theo đường cong rồi tiến tới sản phẩm mới; GLB không bị kéo ngang bằng CSS. Khoảng 1,18 giây sau khi asset sẵn sàng; thời gian tải asset là riêng. Lựa chọn cuối cùng thắng khi bấm liên tục. |
| All parts | Kệ chọn ba sản phẩm cùng nhóm, không khung thẻ bao quanh, sản phẩm đang chọn ở giữa. All parts mở bộ sưu tập có tìm kiếm và lọc; không kéo một hàng dài bằng scrollbar. |
| Header | Đã thay bằng Precision 26: menu 16px và một vạch candy blue đi theo hover/focus; nút chọn xe navy góc cắt; My DTH dùng icon tài khoản. Bỏ nhãn phụ và ô chữ D. Xem `DTH-HEADER26-REFINEMENT.md`. Không thêm WebGL renderer cho nút. |
| Mobile | Model phía trên, thông tin ngay dưới, kệ chọn ba sản phẩm. Menu thu gọn. Giữ cuộn trang tự nhiên ở overview; Inspect có nút xoay/zoom và thao tác trực tiếp. |

Giữ pearl/white, navy và candy blue. Không thêm mũi tên trang trí. Animation giao diện dùng transform/opacity và cleanup theo scope; renderer do React Three Fiber quản lý.

## Kế hoạch đưa vào Studio chính sau khi duyệt hướng

1. Chốt bố cục, khoảng cách nội dung và nhịp camera trên demo này.
2. Gắn gallery mới qua adapter ở Studio hiện tại, giữ bản Gallery24 để quay lại. Đưa CSS nền/font của entry độc lập vào scope Studio trước khi tích hợp.
3. Nối header với callback chọn xe, session/account và giỏ hàng đang có. Bản preview hiện chỉ đổi ngữ cảnh xe trong React; account/bag có liên kết tới trang hiện có, không mô phỏng tài khoản hay giỏ hàng thật.
4. Giữ nguyên route sản phẩm, giá, tồn kho, lọc, cart, checkout, API và dữ liệu. Giữ validators, GLB và Admin presentation; không tái tạo geometry/material.
5. Kiểm tra lại đăng nhập, chọn xe, cart, sản phẩm lỗi/chậm, bàn phím, reduced motion và thiết bị thật. Đo FPS/GPU/memory trước khi kết luận hiệu năng hoặc thêm hiệu ứng nặng.

## Files thêm trong lần làm này

- `frontend/studio-spatial-preview.html`: entry demo độc lập.
- `frontend/vite.studio25-preview.config.mjs`: build demo riêng vào test-results, không thay entry production.
- `frontend/src/experience/studio25Preview/main.jsx`: khởi động demo.
- `frontend/src/experience/studio25Preview/StudioSpatialPreview25.jsx`: bố cục, callout, leader, kệ chọn, các dialog và đọc catalog.
- `frontend/src/experience/studio25Preview/studio25-preview.css`: typography, bố cục, responsive, focus và reduced motion.
- `frontend/src/experience/studio25Preview/studio25.data.mjs`: chuẩn hóa read-only, giá/link an toàn, bộ chọn, leader math.
- `frontend/src/experience/studio25Preview/Header25.jsx`, `header26.css`, `header25.logic.mjs`: header hiện tại của preview; `header25.css` giữ lại từ bản trước.
- `frontend/src/experience/studio25Preview/SpatialStage25.jsx`, `spatial-stage25.logic.mjs`: một Canvas, camera director và điểm bề mặt thật.
- `tests/studio25-preview.test.mjs`, `tests/studio25-header.test.mjs`, `tests/studio25-camera.test.mjs`: kiểm tra data, header và camera math.
- Tài liệu này. Log/ảnh kiểm tra nằm trong `test-results/studio25-preview/` và `test-results/studio25-*.log`.

Không sửa file production có sẵn, package/lockfile, credentials, GLB hoặc MongoDB trong phạm vi demo này. Các thay đổi từ các bước trước vẫn được giữ lại; không commit/push/reset Git.

## Kiểm chứng

Phiên bản đã đối chiếu trong máy: React 19.2.8, Three 0.184.0, Fiber 9.8.1, drei 10.7.8, GSAP 3.15.0, Vite 6.4.3. Không cài/upgrade thư viện. Không có @gsap/react nên dùng gsap.context với cleanup.

Đã đọc hướng dẫn frontend-design, UI/UX, web-design-guidelines, GSAP và các skill 3D liên quan. Review React bổ sung đã thực hiện bằng đọc code. Không tuyên bố đã chạy script UI/UX Python hoặc audit tự động của skill.

| Kiểm tra | Kết quả |
| --- | --- |
| Unit demo | 25/25 đạt: 7 data/leader, 4 header, 14 camera. |
| Regression ứng dụng có sẵn | 1691/1691 đạt, 0 skip. `node tools/verify-premium24.mjs`; local imports OK. |
| Production build hiện có | Đạt, 8,93 giây trong lần kiểm tra này. |
| Build entry demo | Đạt, 2,62 giây. Có cảnh báo chunk Three.js lớn; chưa tối ưu/compress asset hoặc đổi dependency. |
| Public API thật | GET `/api/shop/products` HTTP 200, 23 records. Sau bộ lọc Studio hiện hành còn 19 mục, trong đó 3 suspension upload thật. |
| Giá/model thật | TTX 25.000.000đ, Monoshock 3.500.000đ, GT4 7.000.000đ; đã mở GLB thật trong browser. |
| Browser | 390×844, 768×1024, 1440×1000, 2560×1440; kiểm tra ảnh và không có tràn ngang. Đây là viewport trên máy hiện tại, không thay cho đo trên điện thoại/laptop vật lý. |
| Tương tác | Chuyển TTX/Mono/GT4, chọn liên tục, Inspect/xoay/zoom/reset, leader trở lại, chọn lại cùng sản phẩm giữ Inspect, Escape canvas trả overview. |
| Dialog/header | All parts, search X1R, Tires trống/reset, Escape và trả focus; chọn NVX V2 chỉ trong preview; mở account/bag panel; menu mobile/Escape. |
| Renderer | DOM quan sát một Canvas; tối đa hai scene resident trong chuyển tiếp, một khi ổn định. Không đo heap/GPU/FPS. |

Browser console không có error trong luồng đã thử; có cảnh báo deprecation `THREE.Clock` từ dependency Fiber/Three hiện tại. Chưa đổi dependency để xử lý cảnh báo này.

Reduced motion có logic và test math, CSS/JS lắng nghe native preference; chưa chạy browser với thiết lập hệ điều hành reduced-motion. Chưa fault-inject mất WebGL/API/GLB trong browser. Watchdog chỉ báo thất bại, không giả thành công. Hướng nhìn GT4 giữ nguyên presentation hiện có, không sửa asset để thay đổi dáng.

## Lặp lại kiểm tra

```powershell
node --test tests/studio25-preview.test.mjs tests/studio25-header.test.mjs tests/studio25-camera.test.mjs
node tools/verify-premium24.mjs
npm.cmd run build --workspace frontend -- --config vite.studio25-preview.config.mjs
```

## PC và laptop

Branch đang làm: `feat/story-shop-ultra-pc-20261026`. Repo đang có nhiều thay đổi chưa commit từ các bước trước. Preview phụ thuộc module Gallery24 và `shared/categories.mjs` hiện cũng chưa được track; không chỉ commit riêng thư mục preview rồi kỳ vọng laptop đủ dependency.

Trước khi push: xem `git status --short`, review từng nhóm source/test/doc liên quan và các dependency nói trên, stage theo đường dẫn cụ thể, chạy kiểm tra rồi commit. Không dùng reset/force-push hoặc tự động đưa mọi file chưa commit vào một commit. Không commit `.env`, credentials hoặc test-results.

Khi các nhóm cần thiết đã commit trên PC:

```powershell
git push origin feat/story-shop-ultra-pc-20261026
```

Trên laptop: bảo toàn/commit công việc đang làm trước. Khi working tree sạch và đang đúng branch, chạy:

```powershell
git fetch origin
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
npm ci
```

Nếu Git báo divergent hoặc có thay đổi local, dừng để review merge; không reset. MongoDB không đi theo Git. Asset upload có thể bị ignore hoặc chỉ tồn tại trên PC: kiểm tra các URL GLB thật trên laptop và chuyển asset qua quy trình đã thống nhất; không suy ra rằng pull source là đã đồng bộ dữ liệu/asset.
