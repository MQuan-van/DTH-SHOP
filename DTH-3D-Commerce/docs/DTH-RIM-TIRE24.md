# Rim / Tire — phân tách danh mục, 03/11/2026

Đã thay nhóm Wheel trên giao diện bằng **Rims (mâm)** và **Tires (lốp)**. Đây là thay đổi taxonomy và luồng chọn sản phẩm; chưa tách hình học GLB và chưa chuyển dữ liệu MongoDB.

## Hành vi đã áp dụng

- Danh mục chuẩn: `suspension`, `rims`, `tires`, `exhausts`, `mirrors`, `brakes`.
- Studio Gallery, các Studio dự phòng, Shop Showcase/Catalog, Build, Home/Story, thẻ sản phẩm, đề xuất và nhãn giỏ hàng dùng hai nhóm mới.
- Build giữ tối đa sáu nhóm, một sản phẩm mỗi nhóm. Chọn Rim và Tire cùng lúc được phép; thay Rim chỉ thay slot Rim.
- `category=wheels` cũ được đọc như `rims`; sản phẩm có category `wheels` được chiếu thành `rims` trong catalog giao diện. Đây là quy ước tương thích tạm, không phải xác nhận phân loại cơ khí cho mọi sản phẩm cũ.
- Không thêm sản phẩm Tire giả. Danh mục Tire trống nếu chưa có SKU thực được xuất bản.
- Giữ ID/slug, tên sản phẩm, URL GLB/preview, giá, tồn kho, fitment, vật liệu, Admin presentation và định danh giỏ hàng. Tên demo “Alloy wheel” vẫn là tên gốc của model ghép.
- Admin thêm/sửa sản phẩm hỗ trợ Rims/Tires. Record cũ giữ lựa chọn `Rims · legacy record` với giá trị lưu `wheels`; sửa giá/tên không tự đổi category. Chọn Rims hoặc Tires rồi Save mới là thao tác phân loại có chủ ý.
- Backend dùng validator chung nên nhận hai category mới; các route và cấu trúc payload hiện tại không đổi. Category `wheels` vẫn được chấp nhận cho client/record cũ.
- Build mobile dùng lưới 3 × 2 để sáu nhãn không đè lên icon.

## Asset 3D và hotspot

Model Wheel demo có cả vòng cao su và mâm trong cùng GLB. Chỉ đổi category không tạo ra hai bộ phận độc lập. Không sửa hoặc tái sinh những GLB này.

Đã thêm slot tác giả `rims-front`, `rims-rear`, `tires-front`, `tires-rear`, cùng slot category chung. Chúng chưa có tọa độ mặc định. Chỉ bật focus sau khi đánh dấu và xác nhận trên đúng GLB.

Điểm cũ `wheels`, `wheels-front`, `wheels-rear` vẫn được đọc và giữ trong profile xuất/nhập, nhưng không tự chuyển thành điểm Rim/Tire hoặc xuất hiện như hotspot mới. Admin được báo cần hiệu chuẩn lại. Những điểm khác giữ nguyên. Hash, asset URL, orientation, bounds, normal, pose, confirmation và ngân sách raycast vẫn được kiểm tra. Giới hạn số anchor tăng theo allowlist từ 14 lên 20 để chứa các slot mới và ba slot assembly cũ; không nới giới hạn geometry hay loader.

Không có thư mục profile focus đã publish trong checkout tại lúc kiểm tra. Không ghi profile hoặc dữ liệu thật.

Để hoàn thiện sản phẩm riêng:

1. Chuẩn bị `rim.glb` và `tire.glb` riêng, hoặc tách từ file tác giả trong Blender và xuất thành **file mới**, giữ file gốc. Kiểm tra từng mesh, vật liệu, trục, origin và kích thước.
2. Tạo hai SKU riêng trong Admin, chọn Rims/Tires tương ứng, khai báo giá, ảnh, nguồn asset và mapping xe đã kiểm chứng. Không sao chép giá hoặc fitment của Wheel sang Tire theo suy đoán.
3. Mở `/shop?mode=build&focus-editor=1` với Admin, đánh dấu các bề mặt Rim/Tire trên đúng model xe, xác nhận camera rồi export/publish profile theo workflow hiện có.
4. Muốn lắp/thay phụ tùng trực tiếp trên NVX cần mounting calibration và asset phù hợp riêng. Bản này vẫn là xem và shortlist, chưa mô phỏng lắp ghép hay kiểm tra tương thích rim–tire bằng kích thước.

## Bảo toàn dữ liệu và thay đổi có sẵn

Backup trước sửa: `backups/rim-tire24-before-2026-11-03T02-37-00-954Z/` (482 file source/test/tool và manifest SHA-256; thư mục ignored).

`shared/catalog.json` được so hash với backup và không thay đổi. Đây là fixture/provenance lịch sử. `shared/nvx.mjs` giữ suffix `wheels` để tham chiếu đúng 20 ID cũ; các regex asset và `tools/make_assets.py` tiếp tục nhận tên file lịch sử. Các từ wheel trong sự kiện chuột và rim trong ánh sáng không phải category và không bị thay thế.

Không seed, migration, ghi MongoDB, sửa `.env`, package/lockfile, đổi branch, commit, push hoặc reset Git. Không khởi động API. Một chỉnh sửa đồng thời trong `gallery24/StudioGallery24.jsx` (comment dòng disclosure) được quan sát sau backup; giữ nguyên, không tính là thay đổi của tác vụ này.

## Kiểm thử và giới hạn bằng chứng

- `node --test tests/rim-tire24.test.mjs`: **19/19** đạt. Kiểm tra hai category, alias cũ, không bịa SKU, bất biến catalog, validator, lọc/tìm, sáu slot shortlist, giữ tổng tiền/fingerprint và anchor riêng.
- `node tools/verify-premium24.mjs`: **1.605/1.605** đạt, không fail/skip; kiểm tra cấu trúc/import đạt.
- Production build frontend: đạt, **7,95 giây** ở lượt cuối. Log: `test-results/rim-tire24-final.log`.
- Browser thật ở **Flow / no database**, cổng test 5180: Studio có Rims 4 / Tires 0; chuyển sang Tire bỏ Canvas cũ và hiện trạng thái trống; chuyển lại Rim tải GLB demo, `ready`, đúng một Canvas.
- Bookmark Shop `category=wheels&fit=all` vẫn hiện Rims được chọn và bốn sản phẩm; cả Showcase và Catalog dùng hai nhóm mới. Chọn Tire cho kết quả 0 và nút reset.
- Mobile 390 × 844: Shop không tràn ngang, nút category đo được cao 44px. Build hiển thị đủ sáu nhóm trong lưới 3 × 2; NVX V2 báo ready; Tire trống và báo chưa có focus được tác giả xác nhận. Desktop kiểm tra tại 1440 × 1000.
- Ảnh: `test-results/rim-tire24/studio-desktop.png`, `shop-tires-mobile.png`, `build-tires-mobile.png`. Đây là fixture Flow và các GLB có thật trong repo, không phải dữ liệu API thật hoặc bằng chứng tách mesh.
- Chưa thử Save trong Admin với MongoDB, migration, model Tire độc lập, raycast trên điểm Rim/Tire đã hiệu chuẩn, FPS/GPU hoặc điện thoại vật lý. Validator được kiểm thử bằng dữ liệu trong bộ nhớ.

Server test 5180 đã dừng sau nghiệm thu; không chiếm cổng 5173/5000 của người dùng. Viewport trình duyệt được trả về mặc định.

## Chạy và đồng bộ PC–laptop

Tại thư mục DTH-3D-Commerce, giữ hai terminal riêng:

```bat
npm run dev --workspace backend
```

```bat
npm run dev --workspace frontend
```

Mở `http://127.0.0.1:5173/` và reload. Nếu backend chạy bằng lệnh start trước đó, dừng đúng terminal của nó rồi chạy lại để nhận validator mới. Không mở thêm một bản trên cùng cổng.

PC: review `git status --short`, `git diff` và các file mới trước khi stage. Repository đang có cả thay đổi Gallery/Premium chưa commit từ phiên trước; cần review và đưa đủ các module/test liên quan vào bộ commit. Không dùng `git add .` hoặc chỉ stage taxonomy trong khi bỏ quên các dependency mới của Gallery. Có thể dùng `git add -p -- <file>` cho file tracked và `git add -- <file>` cho file mới. Sau khi review staging:

```bat
git diff --cached --stat
git diff --cached
git commit -m "Split product categories into rims and tires"
git push origin feat/story-shop-ultra-pc-20261026
```

Laptop: kiểm tra `git status --short` và lưu/commit các chỉnh sửa đang làm trước; không reset hoặc pull đè. Trên cùng branch:

```bat
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
node tools/verify-premium24.mjs
```

Sau đó chạy backend/frontend như trên. Không có dependency mới cần nâng cấp. Git không đồng bộ MongoDB; bản này không yêu cầu migration. Cần review từng sản phẩm Wheel cũ trước khi đổi category thật trong Admin hoặc lập một migration được phê duyệt riêng.

## File sửa trong tác vụ này

Danh sách bên dưới được đối chiếu với backup đầu tác vụ; không bao gồm chỉnh sửa đồng thời của người dùng.

- `frontend/src/experience/commerce23/commerce23.css`
- `frontend/src/experience/commerce23/Icon23.jsx`
- `frontend/src/experience/commerce23/spatial23.logic.mjs`
- `frontend/src/experience/home/CinematicHome.jsx`
- `frontend/src/experience/hotspots233/createHotspotStage233.mjs`
- `frontend/src/experience/hotspots233/hotspots233.logic.mjs`
- `frontend/src/experience/hotspots233/VehicleStage233.jsx`
- `frontend/src/experience/story/StoryPage.jsx`
- `frontend/src/experience/studio22h/studio22h.css`
- `frontend/src/experience/studio22h/studio22h.logic.mjs`
- `frontend/src/experience/studio22h2/studio22h2.css`
- `frontend/src/experience/studio22h2/studio22h2.logic.mjs`
- `frontend/src/experience/studio22h2/StudioIcons22H2.jsx`
- `frontend/src/shop/admin/Products.jsx`
- `frontend/src/shop/api.js`
- `frontend/src/shop/cart/CartDrawer.jsx`
- `frontend/src/shop/cart/page/cartPage.logic.mjs`
- `frontend/src/shop/catalog/catalog.config.mjs`
- `frontend/src/shop/catalog/catalog.logic.mjs`
- `frontend/src/shop/catalog/search/SearchDiscovery.jsx`
- `frontend/src/shop/components/ProductCard.jsx`
- `frontend/src/shop/discovery174/discovery.config.mjs`
- `frontend/src/shop/discovery174/discovery.logic.mjs`
- `frontend/src/shop/discovery174/premium-shop.css`
- `frontend/src/shop/home/home.config.mjs`
- `frontend/src/shop/home/sections/Categories/CategoriesSection.module.css`
- `frontend/src/shop/product/productDecision.logic.mjs`
- `frontend/src/shop/product/recommendations/recommendation.logic.mjs`
- `frontend/src/shop/StoreApp.jsx`
- `frontend/src/shop/story214/verticalMotion215.mjs`
- `shared/domain.mjs`
- `tests/domain.test.mjs`
- `tests/full-cart.test.mjs`
- `tests/hotspots-23-3.test.mjs`
- `tests/product-recommendations.test.mjs`
- `tests/shop-motion.test.mjs`
- `tests/spatial-commerce-23.test.mjs`
- `tests/studio-atelier-22h.test.mjs`
- `tests/studio-gallery24.test.mjs`
- `tests/studio23-suspension-route.test.mjs`
- `tests/vertical-story-21-5.test.mjs`
- `tools/verify-premium24.mjs`
- `shared/categories.mjs`
- `tests/rim-tire24.test.mjs`
- `docs/DTH-RIM-TIRE24.md`
