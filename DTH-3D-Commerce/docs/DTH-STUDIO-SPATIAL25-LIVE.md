# Spatial Studio 25 — đã gộp vào trang chính

04/11/2026. Mở <http://127.0.0.1:5173/> và refresh. Không chạy thêm frontend nếu cổng đã hoạt động.

05/11/2026: [Bản sân khấu rộng và Collection 3D tĩnh](DTH-STUDIO-SPATIAL25-WIDE.md) là giao diện Studio đang chạy. Kích thước và ảnh ở tài liệu này ghi lại bản tích hợp trước đó.

## Sửa tự quay — 04/11/2026

Sau tích hợp, idle camera dùng `sin(time) * .055`, chỉ lắc khoảng ±3,15° nên model trông gần như đứng yên dù UI ghi Slow orbit. Đã đổi thành orbit đủ 360° theo `secondsPerTurn` hiện có. Một camera director vẫn sở hữu camera; không xoay/sửa geometry hoặc material GLB, không thay setting Admin. Pause/Resume, Inspect, reduced motion, Save-Data, authored stop và hidden/offscreen/dialog gates được giữ nguyên.

Khi camera vòng ra phía sau, leader được lấy lại từ bề mặt thật hướng về camera. Có cooldown để không raycast model mỗi frame; không tạo mesh label hoặc điểm lắp giả.

File sửa: `frontend/src/experience/studio25Preview/SpatialStage25.jsx`, `frontend/src/experience/studio25Preview/spatial-stage25.logic.mjs`, `tests/studio25-camera.test.mjs` và tài liệu này. Thêm ba regression tests cho góc một phần tư/nửa/đủ vòng, wrap liên tục và timing không hợp lệ; camera suite hiện có 19 tests.

- Các suite camera/live gallery/preview/header/Gallery24: **71/71 đạt**, 0 skip.
- Production build: **đạt, 11,02 giây**. Preview entry dùng chung scene: **đạt, 2,59 giây**.
- Browser chính 5173 với catalog/API thật: ảnh liên tiếp ghi nhận TTX đi từ mặt trước sang mặt sau; leader vẫn chỉ bề mặt. Pause và Inspect giữ nguyên projection sau một khoảng quan sát; Resume/Overview hoạt động. Mobile 390×844 có hai góc quay khác nhau, không tràn ngang (`clientWidth = scrollWidth = 375`); chuyển TTX → Monoshock ready với một Canvas. Đã trả viewport về mặc định.
- Đây là kiểm tra chuyển động/render thật, không phải benchmark FPS/GPU, không đo chu kỳ đủ vòng bằng đồng hồ trong browser. Chu kỳ/góc đủ vòng được kiểm tra riêng bằng unit tests. Không đổi native reduced-motion setting của hệ điều hành.

Backup, ảnh và log: `test-results/studio25-auto-orbit/`. Không sửa backend/dữ liệu/GLB, không cài dependency, chưa commit/push. Hướng dẫn đồng bộ PC/laptop ở cuối tài liệu vẫn áp dụng; include các file scene/test dùng chung cùng dependency chưa track từ bước tích hợp, không commit backup hoặc `.env`.

## Phần đã áp dụng

Studio mặc định hiện dùng Header 26 và toàn bộ gallery Spatial 25:

- Tên, giá, màu, thông số hiện có và ngữ cảnh xe nằm cạnh model trong bố cục giữa màn hình, rộng tối đa 1180px. Thông số lấy từ record, không tự tạo. Màn hình nhỏ xếp model trên, thông tin ngay dưới.
- Leader line từ tên tới một điểm raycast trên bề mặt GLB thật. Đây là đường chỉ sản phẩm, không phải điểm lắp ráp/hotspot cơ khí. Đường chỉ ẩn khi camera chuyển, bị chặn hoặc ở mobile.
- Chọn sản phẩm làm camera lùi/đi theo đường cong/tiến tới vị trí model mới trong cùng scene. Không kéo model bằng CSS. Lựa chọn cuối thắng khi bấm liên tục. Copy của sản phẩm cũ chỉ đổi sau khi model mới vẽ được và camera tới nơi.
- Kệ ba sản phẩm cùng nhóm, không có khung card bao quanh hoặc một hàng dài scrollbar. All parts mở collection có category/search, giá thật, trạng thái Tires trống và reset tìm kiếm.
- Giữ Inspect, zoom/xoay/reset và Expand. Expand di chuyển cùng portal host/Canvas vào native dialog. Native Escape, focus return và các input gates vẫn dùng được.
- Header/chọn xe/account/cart/support vẫn do Shell và các module hiện có sở hữu. Nút View product và Build là Router links thật.

## Dữ liệu và các giới hạn được giữ

Root mới dùng StoreProvider và `studioGalleryCatalog24`, gồm bộ lọc suspension upload, kiểm tra model path và published hash binding. Không gọi fetch riêng, không fallback sang fixture/local asset studies, không đổi SKU/giá/stock/fitment. `config.productId`, `config.enabled` và binding từ published experience vẫn có hiệu lực.

Giữ nguyên GLB/material/geometry, Admin presentation, profile validation và renderer WebGL/Three r184 hiện có. Không cài/nâng dependency. Cảnh 3D có một Canvas và tối đa hai resident model khi chuyển tiếp; quay về một khi ổn định. Save-Data/authored spin stop chỉ dừng orbit tự động; native reduced-motion cũng điều khiển camera travel và GSAP.

Mount scene sau startup/intro gate; dừng input/render work khi bị chặn hoặc vùng gallery ra khỏi màn hình. Collection tự chặn scene; expanded dialog vẫn cho Inspect. Cart/NVX/support được nhận diện là overlay bên ngoài. Đổi account/vehicle đóng dialog và reset camera mode. Root không gọi API ghi hoặc thay đổi cart/vehicle persistence.

Native modal khóa cả html/body scroll và khôi phục khi đóng/unmount. Scrollbar gutter có attribute scope và cleanup để tránh đổi khung camera khi mở dialog. Observer rebind theo portal host/dialog state và bỏ callback từ node cũ; đây là lỗi đã tìm thấy khi QA chuyển sang Rims sau hot reload. Leader được áp lại sau ready commit để vẫn dùng được khi camera đứng yên.

## File thêm/sửa

Thêm:

- `frontend/src/experience/spatial25/StudioSpatial25.jsx`: live gallery, leader, selection/collection, Inspect/Expand và gates.
- `frontend/src/experience/spatial25/spatial25.logic.mjs`: catalog/selection adapter dùng logic thật.
- `frontend/src/experience/spatial25/spatial25.css`: style có scope, không import CSS global của preview.
- `tests/studio-spatial25-live.test.mjs`: 14 kiểm tra data và wiring/lifecycle.
- Tài liệu này.

Sửa:

- `frontend/src/shop/home/HomePage.jsx`: dùng Spatial25 làm default; giữ các rollback.
- `frontend/src/experience/studio25Preview/SpatialStage25.jsx`: Save-Data gate, fatal/retry, memo asset khi chỉ đổi giá, suspend input ngay khi blocked.
- `frontend/src/experience/studio25Preview/spatial-stage25.logic.mjs`: render/input/idle policy.
- `tests/studio25-camera.test.mjs`: 16 case sau bổ sung hai policy tests.
- `tests/studio-gallery24.test.mjs`: chỉ thay assertion Home default đã lỗi thời; các test bảo vệ Gallery24 vẫn còn.
- Tài liệu header/preview: cập nhật trạng thái đã gộp.

Backup và bằng chứng ở `test-results/spatial25-live/`. Không reset Git, không xóa GLB/local edits, không thay credentials hoặc MongoDB, không seed/migration/index initialization. Chưa commit/push.

## Kiểm chứng

| Nhóm | Kết quả |
| --- | --- |
| Regression hiện có | 1691/1691 đạt, 0 skip; source/import check OK; production build đạt trong 7,24 giây. |
| Các suite bổ sung | 59/59 đạt: live Spatial25 14, preview/data 7, camera 16, header preview 4, header live 18. |
| Build preview độc lập | Đạt với `vite.studio25-preview.config.mjs`; scene dùng chung được kiểm tra qua cả hai entry. Log: `test-results/spatial25-live/preview-build.log`. |
| Browser thật | Studio chính 5173, session/API mode thật; không bypass login hoặc dùng catalog fixture. |
| Camera/GLB | TTX và Monoshock render thật, đúng giá 25.000.000đ/3.500.000đ, leader bám bề mặt; rapid selection giữ lựa chọn cuối. Chuyển Suspension → Apex Rim render thật, đúng giá 3.200.000đ và shelf 1 of 4. |
| Collection | Search GT4/Monoshock, filter Rims/Tires, empty/reset, chọn sản phẩm từ own modal, Escape trả focus. |
| Inspect/Expand | Xoay/zoom trong Expand, Escape canvas đóng và trả focus về Expand; DOM có một Canvas. Portal identity được kiểm tra riêng bằng fixture và source contract, không giả đó là đo GPU identity. |
| Commerce/gates | Cart drawer thật mở, scene blocked; NVXPicker thật mở/cancel, không chọn/lưu xe. View product tới `/products/apex-wheels`, scope/scroll lock được gỡ; quay Studio thành công. Không thêm/sửa/xóa cart lines. |
| Responsive | 320/390/768/1440/2560px. Mobile input 16px, dialog nằm trong vùng client, body/html overflow được khóa/khôi phục; chọn sản phẩm đưa canvas về khung nhìn. 2560px: hero 1180px, tên ở x≈824px; client/scrollWidth đều 2545px. |

Ảnh/log nằm trong `test-results/spatial25-live/`. Chưa benchmark FPS/GPU/heap, chưa fault-inject context loss/API failure trong browser, chưa đổi native reduced-motion setting của hệ điều hành. Các tình huống đó có logic/fixture tests, không được báo là browser acceptance. GT4 được tìm/chọn trong collection; không dùng ảnh placeholder để chứng nhận render của asset đó.

Chức năng tải PNG preview của Gallery24 vẫn có trong rollback cũ; chưa port export ảnh động sang scene Spatial25. Không thay nó bằng một nút chụp giả.

## Rollback và chạy lại

- `/?studio=gallery24`: gallery trước khi gộp, vẫn có header mới.
- `/?studio=precision` và `/?studio=classic`: giữ các bản cũ.
- `/studio-spatial-preview.html` trên server preview 5182: bản thiết kế độc lập vẫn được giữ để so sánh.

```powershell
node --test tests/studio-spatial25-live.test.mjs tests/studio25-preview.test.mjs tests/studio25-camera.test.mjs tests/studio25-header.test.mjs tests/header26-live.test.mjs
node tools/verify-premium24.mjs
npm.cmd run build --workspace frontend -- --config vite.studio25-preview.config.mjs
```

## PC / laptop

Branch đang dùng: `feat/story-shop-ultra-pc-20261026`. Review/stage theo nhóm đường dẫn cụ thể sau khi bảo toàn local edits. Có nhiều dependency Gallery24/header/categories còn có thể chưa track từ các bước trước; không chỉ commit ba file Spatial25 rồi bỏ các dependency đó. Không git add . mù quáng, không reset/force push và không commit test-results/backups/.env.

Sau khi review, kiểm thử và commit đủ nhóm source/test/doc trên PC:

```powershell
git push origin feat/story-shop-ultra-pc-20261026
```

Laptop: bảo toàn/commit công việc hiện có, đúng branch và working tree sạch trước khi:

```powershell
git fetch origin
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
npm ci
```

Nếu divergent/local changes, dừng review merge thay vì reset. MongoDB và GLB upload không tự đồng bộ qua Git; dùng quy trình asset/data đã thống nhất, không tự migration trên laptop.
