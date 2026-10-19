# Step 17 — Shop / Product UX 2.0

## Phạm vi

Bản cập nhật giao diện cho DTH-3D-Commerce, đối chiếu ba file nguồn ở commit
`0e6d63faed2fe1f0eae70aecb4c6347f923baf33` của `feat/shop-discovery`.
Không cần cài lại Step 15/16/16.2. Không thay cấu hình API mode, database, package.json hay lockfile.

Shop: một tiêu đề, bộ chọn NVX gọn, danh mục ngang, bộ lọc trong dialog ở cả desktop và mobile,
thẻ sản phẩm tập trung vào ảnh/tên/giá/tương thích demo. Nhấn ảnh hoặc tên mở trang sản phẩm;
Quick view là nút riêng. URL tìm kiếm/lọc được truyền qua state để Back to parts giữ ngữ cảnh.

Product: tăng tỷ lệ cột viewer; giữ giá, fitment và Add to bag ở ngoài; chuyển mô tả,
thông số, danh sách xe vào Details / Specifications / Compatibility. 3D tools mở các chế độ
Explore, Surface, Technical, Hotspots, camera presets và asset profile hiện có.
Các nút xoay, zoom, reset, auto rotate và lỗi/tải lại 3D vẫn ở ngoài phần mở rộng.
Đóng 3D tools đưa chế độ study về Explore và xóa selection/effect/light offset, không đổi xe/giỏ hàng.

Animation: dùng lại grid/modal/add-to-bag animation đã có; hover nhẹ cho ảnh thẻ, chuyển trạng thái
NVX/category và disclosure reveal 180ms. Motion off/reduced motion không bị bỏ qua.
Không có video, ảnh giả mới hay model mới cài vào ứng dụng.

## Cài trên laptop (CMD)

Dừng frontend/backend bằng Ctrl+C; MongoDB giữ nguyên. Lưu installer tại E:\DTH-ShopProduct-Step17.mjs.

```bat
cd /d "E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce"
git status
git diff --check
node "E:\DTH-ShopProduct-Step17.mjs" --project "." --check
```

Chỉ khi CHECK OK:

```bat
node "E:\DTH-ShopProduct-Step17.mjs" --project "." --apply
```

Nếu CHECK STOP: không ép ghi đè, không reset/clean, không tự cài lại các bước cũ. Giữ nguyên output.
Check không sửa file. Apply sao lưu trước khi sửa. Không cần toàn bộ working tree khớp byte với
checkpoint; các đoạn cần patch phải khớp và các file mới không được có nội dung khác.

## Cài trên PC (CMD)

Lưu installer tại C:\DTH-ShopProduct-Step17.mjs.

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status
node "C:\DTH-ShopProduct-Step17.mjs" --project "." --check
```

Sau CHECK OK, thay --check bằng --apply. Không copy lệnh E: vào PC.

## Kiểm tra

Chạy lần lượt, dừng ở lệnh lỗi:

```bat
node --test "tests\shop17.test.mjs"
npm run check
npm test
npm run build
```

Nếu đã có dependencies của dự án thì không cần npm ci lại chỉ vì Step17.
Không chạy seed/migration. API/MongoDB và NVX đã được thiết lập từ các bước trước.

## Chạy

Hai terminal cùng app root:

```bat
npm run dev:api
```

```bat
npm run dev
```

Mở `http://127.0.0.1:5173/shop`.
Kiểm tra chọn NVX, Matches only, nhiều danh mục, Filters và Sort. Lọc giá/search vẫn dùng state cũ.
Nhấn Quick view rồi Escape; focus phải trở lại nút. Nhấn ảnh/tên sản phẩm để đi trang chi tiết.
Mở/đóng Details / Specifications / Compatibility; thử Tab + Space/Enter và link #dth-product-specs.
Mở 3D tools trước khi thử Surface/Technical/Hotspots/preset camera. Viewer vẫn là model hiện có.
Thử quantity/add-to-bag và đổi xe: các dòng giỏ hàng cũ phải giữ vehicleId riêng.
Thử mobile, Motion off, browser reduced motion, hình/model tải lỗi, Back về Shop.
Bản này không hứa FPS giống nhau trên mọi thiết bị; cần kiểm tra WebGL thật trên PC/laptop.

## Browser regression tùy chọn

Có `tests/browser/shop17.py` cho một bản Flow đã build và đang chạy.
Cần Playwright Python + Chromium. Script này không tạo tài khoản, đơn hoặc sửa DB.
Chưa được chạy trên full repo trong môi trường đóng gói. Các bài browser cũ tìm trực tiếp
nút Surface/Technical phải mở phần `3D tools` trước; cấu trúc giao diện đã chủ đích thay đổi.

## Quay lại (code only)

Dừng frontend/backend. Laptop:

```bat
node "E:\DTH-ShopProduct-Step17.mjs" --project "." --undo-latest
```

PC đổi đường dẫn installer sang C:. Không nhập tên folder backup minh họa.
Undo từ chối ghi đè file đã sửa thêm sau apply; hãy giữ lại output khi có conflict.
Bản này không thay database nên không có thao tác undo DB.

## Commit sau khi chạy ổn

Kiểm tra staging không có .env, password, backup hay database:

```bat
git diff --check
git add frontend/src/shop/catalog/ShopPage.jsx frontend/src/shop/product/ProductDecisionPage.jsx frontend/src/shop/product/ProductMedia.jsx frontend/src/shop/ux17 tests/shop17.test.mjs tests/browser/shop17.py NOTE_SHOP_PRODUCT_STEP17.md docs/SHOP_PRODUCT_STEP17_TEST_REPORT.md
git diff --cached --stat
git status
git commit -m "feat: refine shop and product buying experience"
git push
```

Installer không tự commit/push. Git đồng bộ code, không đồng bộ MongoDB hoặc file .env local.

## Nguồn kỹ thuật

- Nguồn ba file chính: repo MQuan-van/DTH-SHOP, commit 0e6d63faed2fe1f0eae70aecb4c6347f923baf33.
- Native disclosure: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
- Motion preference: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
