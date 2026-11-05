# DTH Spatial Studio 25 — sân khấu rộng và kệ 3D tĩnh

Ngày 2026-11-05. Bản cập nhật đã áp dụng và kiểm tra trên [Studio chính](http://127.0.0.1:5173/) với baseline [Spatial Studio 25](DTH-STUDIO-SPATIAL25-LIVE.md).

## Bố cục và ánh sáng

Trên desktop, sân khấu dùng bề ngang viewport với lề co giãn. Canvas lớn hơn để model có đủ diện tích khi đổi góc, còn tên, giá và thông số ở cạnh model với leader từ phiên bản trước. Khu bộ sưu tập trải hết bề ngang, với tối đa ba sản phẩm cùng nhóm. Sản phẩm đang chọn có nền nhẹ và gạch xanh. Tên sản phẩm, trạng thái chọn và nút mở All parts vẫn dễ thấy khi xem kệ.

Nền pearl có dải xanh và teal nhẹ. Trên thiết bị có chuột, GSAP di chuyển và thay đổi độ trong suốt của một vùng gradient đã tạo sẵn. Vùng sáng bị giới hạn trong Studio và không nhận sự kiện input. Thiết bị touch và chế độ reduced motion dùng nền tĩnh. Luồng điều khiển camera, chọn sản phẩm, Pause và Inspect vẫn do scene hiện có quản lý.

## Nguồn ảnh kệ

Kệ và All parts dùng ảnh render tĩnh. Ba mẫu phuộc được chụp từ chính GLB trên renderer Studio thành PNG alpha 352×352, cố định góc và giữ tỷ lệ silhouette. Các sản phẩm demo có ảnh khớp ID, đường dẫn GLB và ảnh gốc sẽ dùng lại render trong suốt của Shop.

| ID catalog | PNG chuẩn bị sẵn | GLB nguồn |
| --- | --- | --- |
| `ohlins` | `ohlins-ttx-0262d0bd.png` | `0262d0bd-690d-439e-8132-8b07088abadb.glb` |
| `x1r-gtr` | `x1r-gtr-40762c2a.png` | `40762c2a-50bd-4514-a523-1ff523c9a9f0.glb` |
| `x1r-red` | `x1r-gt4-587efa2d.png` | `587efa2d-8287-4fa2-aba4-9f075c521277.glb` |

Ảnh được lưu trong `frontend/public/previews/spatial25-stills/` và gắn theo ID, URL model cùng SHA-256 trong `static-previews25.mjs`. Kiểm thử đối chiếu hash với bytes GLB tại checkout. Nếu có presentation Admin, ảnh tĩnh mặc định sẽ không được dùng. Scene có thể chụp theo presentation hiện tại khi kệ gần viewport, model đã ổn định và đủ điều kiện chạy. Tác vụ xử lý tuần tự, ưu tiên asset có sẵn trong scene, dùng render target tạm trên cùng renderer và lưu kết quả vào cache trong phiên. Khi thiếu ảnh hoặc chụp thất bại, kệ vẫn giữ tên và trạng thái `3D preview unavailable`.

Ảnh GT4 mặc định dùng góc 3/4 để thấy ty, lò xo và bình dầu. Góc này gắn với đúng GLB gốc và chỉ dùng khi chụp ảnh kệ. Camera ở sân khấu tiếp tục dùng profile hoặc presentation hiện có.

## Kiểm tra browser

Studio chính chạy bằng session và catalog API thật. API công khai trả 23 sản phẩm. Bộ lọc Studio giữ 19 sản phẩm, gồm TTX, X1R GTR và GT4 với đúng ba ID trên. Đo ở viewport 2560×1440, bằng pixel CSS:

| Vùng | Trước | Sau |
| --- | ---: | ---: |
| Sân khấu | 1180 × 610 | 2352,67 × 960 |
| Khung Canvas | 802,41 × 610 | 1576,30 × 937 |
| Bộ sưu tập | 1000 rộng | 2544,67 rộng |
| Kệ | 820 rộng | 2352,67 rộng |

- Ở lượt chụp ban đầu, browser ghi nhận ba PNG 352×352 sinh từ scene với một Canvas. Ở lượt cuối, cả ba `currentSrc` trỏ đúng PNG đã đóng gói và `naturalWidth` đều là 352. Nhấn Enter trên GT4 đưa model thật lên sân khấu, giữ bộ ảnh tĩnh của kệ và một Canvas.
- All parts tìm được GT4 với đúng PNG, và mục Rims tải đủ bốn ảnh render trong suốt từ Shop. Chọn Apex Alloy wheel đưa model vào trạng thái ready. Expand dùng một Canvas trong dialog. Escape đóng dialog và đưa focus về nút Expand sau khi khung nhìn cập nhật.
- Khi di chuột, ghi nhận vị trí x của vùng sáng từ 1280 đến 1564,57, scale từ 0,9587 đến 1 và opacity từ 0,7707 đến 1. Opacity về 0 trong dialog.
- Ở khung 390×844, client width và scroll width đều là 375 px, khu bộ sưu tập rộng 374,67 px và vùng sáng theo chuột có opacity 0. Sân khấu vẫn có một Canvas.

Ảnh desktop 1440 `hero-final.jpg` và `collection-final.jpg`, cùng số liệu `browser-evidence.json`, nằm trong `test-results/spatial25-wide/`. Ảnh 2560 có thể bị cắt mép phải do giới hạn vùng chụp. Browser đo `clientWidth` và `scrollWidth` đều bằng 2545 px ở 2560. Chưa đo FPS/GPU hoặc thử trên điện thoại vật lý.

## Kiểm thử và build

- **79/79 tests đạt**, 0 fail/skip trong suite Studio và header liên quan. Kiểm tra mới gồm nhận diện asset chính xác, xác minh alpha/hash, chọn tác vụ chụp, khôi phục renderer khi chụp lỗi và hợp đồng kệ dùng render tĩnh.
- **Production frontend build đạt** trong **6,68 giây**. Build của preview riêng cũng đạt trong **2,29 giây**, với cảnh báo kích thước chunk của Vite.
- Log nằm tại `test-results/spatial25-wide/tests.log`, `test-results/spatial25-wide/build.log` và `test-results/spatial25-wide/preview-build.log`.

```powershell
node --test tests/studio25-wide.test.mjs tests/studio25-shelf-capture.test.mjs
npm.cmd run build --workspace frontend
npm.cmd run build --workspace frontend -- --config vite.studio25-preview.config.mjs
```

## Phạm vi thay đổi

File tích hợp

- `frontend/src/experience/spatial25/StudioSpatial25.jsx`, `spatial25.css` cho layout, kệ và wiring.
- `frontend/src/experience/studio25Preview/SpatialStage25.jsx` nối tác vụ chụp với renderer hiện có.

File mới

- `frontend/src/experience/spatial25/StudioColorWash25.jsx`, `studio-color-wash25.css`, `static-previews25.mjs`.
- `frontend/src/experience/studio25Preview/ShelfCapture25.jsx`, `shelf-capture25.logic.mjs`.
- Ba PNG trong `frontend/public/previews/spatial25-stills/`, `tests/studio25-wide.test.mjs` và `tests/studio25-shelf-capture.test.mjs`.
- `docs/DTH-STUDIO-SPATIAL25-WIDE.md`.

Backup các file tích hợp ở `test-results/spatial25-wide/backups/` và `test-results/spatial25-shelf/backups/`. Giá, catalog, tài khoản, chọn xe, cart, API và MongoDB dùng hợp đồng hiện có. Asset GLB và presentation Admin được đọc để render. Không có migration hay ghi dữ liệu trong đợt sửa này.

## PC và laptop

Dùng [hướng dẫn đồng bộ Spatial Studio](DTH-STUDIO-SPATIAL25-LIVE.md#pc--laptop). Review local edits và stage các file đã liệt kê cùng những dependency baseline cần thiết, gồm cả ba PNG. Giữ `test-results/`, `.env` và thông tin kết nối ở máy local. Sau khi commit/push trên máy nguồn, dùng `git fetch origin` và `git pull --ff-only origin feat/story-shop-ultra-pc-20261026` trên laptop khi local edits đã được xử lý. Chưa commit hoặc push trong lượt này.
