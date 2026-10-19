# DTH — Step 15: Yamaha NVX V1 / V2 / V3

## Phạm vi

Ba lựa chọn cố định là **Yamaha NVX V1, Yamaha NVX V2, Yamaha NVX V3**. Không có bước chọn năm; không dùng năm giả như 0, 2024 hoặc “undefined”. Mã lưu vào giỏ hàng/tài khoản/API là `yamaha-nvx-v1`, `yamaha-nvx-v2`, `yamaha-nvx-v3`.

Bản cập nhật thêm Garage, thẻ radio chọn phiên bản, lựa chọn nhanh trên Shop, phản hồi khi lưu và phần xem phụ tùng 3D. Thẻ xuất hiện lần lượt, hover/selection và đổi phần xem có animation bằng code. Tắt “UI motion” hoặc bật reduced motion để tắt chuyển động giao diện. Điều khiển xoay 3D vẫn thuộc viewer hiện có.

Không sửa loader, video loading, GLB, Viewer3D, ánh sáng/camera Home, CSS màu Home, backend models, package.json hay package-lock.json. Home chỉ có thay câu chữ hướng dẫn chọn xe, không đổi bố cục/hiệu ứng. ShopPage.jsx không bị ghi đè; lựa chọn nhanh được chèn vào VehicleFitmentStrip.

**Phần xem 3D là mô hình phụ tùng minh họa đang có, không phải mô hình nguyên chiếc Yamaha NVX.** Bản này không tạo hoặc mua tài sản 3D mới, không phát video giả làm 3D.

## Dữ liệu và adapter

`shared/catalog.json` được giữ làm fixture/nguồn asset demo gốc. Frontend preview, Flow và seed sử dụng `buildNVXDemoCatalog()` trong `shared/nvx.mjs` để tạo catalogue ba NVX. Ở API mode, database sau migration là nguồn dữ liệu; API chỉ công bố ba mã NVX và không tự fallback sang fixture khi lỗi.

## Bảng tương thích minh họa

Bản đồ dưới đây chỉ là **dữ liệu thử nghiệm của đồ án**, không chứng minh khả năng lắp đặt ngoài thực tế:

| Nhóm sản phẩm demo | NVX được gán trong bộ minh họa |
|---|---|
| Apex | V1 |
| Vector | V2 |
| Touring | V3 |
| Studio | V1, V2, V3 |

Chỉ 20 ID sản phẩm minh họa đã biết được xem xét. Sản phẩm tự thêm, model/provenance đã đổi hoặc mapping khác được giữ nguyên, không suy đoán. Giá, tên, mô tả, tệp ảnh, GLB và lịch sử đơn không bị đổi bởi migration.

## Cài code trên laptop — dùng CMD

Lưu **một file** `DTH-NVX-Step15.mjs` ở `E:\DTH-NVX-Step15.mjs`. Đây là installer tự chứa; **không cần giải nén hoặc thư mục files/manifest đi kèm**.

Dừng frontend và backend bằng Ctrl+C. MongoDB Windows Service có thể tiếp tục chạy. Các lệnh sau chỉ dành cho root ứng dụng:

```bat
cd /d "E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce"
git status
dir "E:\DTH-NVX-Step15.mjs"
node "E:\DTH-NVX-Step15.mjs" --project "." --check
```

`--check` không sửa file và không đụng database. Nếu `CHECK STOP`, dừng, đọc tên file xung đột và gửi output để đối chiếu; không force/reset/chép đè. Khi `CHECK OK`:

```bat
node "E:\DTH-NVX-Step15.mjs" --project "." --apply
node --test tests/nvx-step15.test.mjs tests/nvx-migration.test.mjs tests/nvx-api.test.mjs
npm run check
npm run build
```

Chỉ đi tiếp khi từng lệnh thành công. Không có dependency mới. Nếu bản clone chưa cài node_modules, cần `npm ci` từ root ứng dụng trước khi build/API, không cài thêm từng package lẻ. Installer tạo backup chính xác của các file nó sửa ở `.git/dth-nvx-step15-code-backups` và in đường dẫn thật.

## Chuyển dữ liệu MongoDB — bước tách riêng, cần xác nhận

**Giữ backend dừng trong suốt bước này.** Không chạy seed đồng thời, không để Admin ở một phiên khác ghi database. Service MongoDB vẫn bật. Kiểm tra kế hoạch trước:

```bat
node backend/commerce/nvx/migrate.mjs --check
```

Nếu có `DATA CHECK OK`, đọc các dòng `PLAN` và `PRESERVED`. Migration chỉ hỗ trợ database `dth_3d_commerce` hoặc `dth_*_test`, từ chối `NODE_ENV=production`. `--check` chỉ đọc; không tạo collection/index/backup.

Để chấp nhận bảng tương thích **giả lập**, chạy:

```bat
node backend/commerce/nvx/migrate.mjs --apply --confirm-demo-fitment
```

Không cần `npm run seed` trước bước này. Với database trống, migration thêm ba NVX và các sản phẩm demo còn thiếu. Với bản demo cũ, chỉ cập nhật các mapping khớp điều kiện an toàn. Seed được giữ nguyên nguyên tắc “thêm record còn thiếu”, nên chạy seed một mình không chuyển được toàn bộ mapping cũ.

Backup dữ liệu của các thao tác dự kiến được ghi **trước khi ghi database** trong `.git/dth-nvx-step15-data-backups`. Không ghi URI/password vào backup. Các unique index `id` của sản phẩm/xe được bảo đảm khi apply; undo không gỡ index. Đây không phải transaction toàn bộ database: hãy dừng các writer; mỗi update có điều kiện đối chiếu để dừng khi dữ liệu đã thay đổi. Nếu bị ngắt, không drop/reset database; dùng `--check` hoặc rollback có kiểm tra.

Các document xe demo cũ vẫn ở database để giữ thông tin/lịch sử; API và màn quản trị chọn xe chỉ công bố ba NVX. Xe mặc định cũ trong tài khoản không tự đổi sang V1: Garage báo cần chọn lại và chỉ thay khi người dùng bấm lưu. Lựa chọn Shop cũ trong localStorage được sao lưu ở khóa thêm hậu tố `.before-nvx-step15` rồi bỏ chọn. Giỏ hàng cũ vẫn giữ từng dòng, yêu cầu chọn lại xe tương thích hoặc xóa dòng; không tự đổi xe, giá hay đơn hàng cũ.

## Chạy dự án

Terminal backend:

```bat
cd /d "E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce"
npm run dev:api
```

Terminal frontend:

```bat
cd /d "E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce"
npm run dev
```

Mở `http://127.0.0.1:5173/`. Xem chọn xe trong header; Shop có ba nút chọn nhanh; Garage ở `/account?view=vehicle` sau đăng nhập. Không phải xóa khóa loader hay xóa toàn bộ localStorage.

## Kiểm tra thủ công trước khi commit

Chọn V1/V2/V3: không có năm, không hiện undefined. Hủy hộp chọn không đổi lựa chọn đã xác nhận. Lưu mặc định ở Garage rồi tải lại/đăng nhập lại. Đổi xe toàn cục không tự đổi dòng giỏ hàng đã có. Giỏ cũ phải hiện trạng thái cần xem lại. Mở 3D, kéo xoay, zoom, reset; chọn phiên bản khác không làm mất khả năng thao tác. Thử mobile và reduced motion; 3D lỗi vẫn chọn/lưu xe được. Kiểm tra Checkout trên đơn mô phỏng và giá sau khi sửa Admin.

Có test trình duyệt bổ sung **chưa chạy trên full repo trong môi trường tạo gói**. Chỉ chạy với **compiled Flow**, không dùng database thật:

```bat
npm run build:flow
npm run preview
```

Terminal kiểm thử khác (đã có Python Playwright + Chromium):

```bat
python tests/browser/nvx_step15.py --url http://127.0.0.1:4173 --require-3d
```

Sau khi thử Flow, dừng preview; `npm run build` lại với env API nếu cần bản build API. Các browser/integration test cũ còn thao tác Make/Model/Year hoặc dùng fixture ID xe cũ cần được cập nhật tương ứng; không xem sự có mặt của file test hoặc CI workflow là bằng chứng đã pass.

## Quay lại — không cần điền timestamp backup

Dừng cả hai terminal ứng dụng. Nếu đã apply dữ liệu, phải kiểm tra/undo dữ liệu **trước**:

```bat
node backend/commerce/nvx/migrate.mjs --undo-latest
```

Lệnh chỉ hoàn tác dữ liệu còn giống sau migration. Nếu xe mới đã dùng trong tài khoản/đơn hàng hoặc sản phẩm ngoài kế hoạch, hay file/data đã được sửa tiếp, nó từ chối để tránh mất thay đổi. Không ép undo. Sau khi dữ liệu được khôi phục, hoặc nếu chưa từng apply dữ liệu:

```bat
node "E:\DTH-NVX-Step15.mjs" --project "." --undo-latest
```

Code undo không ghi đè file đã chỉnh sau cài. Backup chỉ dành cho máy/app đã tạo nó; không đoán folder timestamp hoặc xóa thủ công các thư mục .git.

## Dùng hai máy

Sau khi chạy và kiểm tra trên laptop, xem `git diff` và stage có chọn lọc các file source/test/note rồi commit/push. Không push `.env`, database, URI hay mật khẩu. Installer không commit/push thay bạn.

Ở PC: pull cùng branch, sau đó chạy `node backend/commerce/nvx/migrate.mjs --check` và bước apply có xác nhận nếu database PC chưa chuyển. Git đồng bộ code, **không đồng bộ MongoDB local hay backup trong .git**. Không cần cài installer lần nữa khi source Step 15 đã được pull đầy đủ.

Tham chiếu nguồn ứng dụng khi xây gói: `MQuan-van/DTH-SHOP`, branch `feat/shop-discovery`, commit `894a061f4c230a34e892ccaab50b3546738400ee`. Xem `docs/NVX_STEP15_TEST_REPORT.md` để biết phạm vi đã và chưa kiểm chứng.
