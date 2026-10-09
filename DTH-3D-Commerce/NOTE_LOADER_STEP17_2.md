# DTH — Loading Performance Step 17.2

Bản cập nhật loading và lịch khởi tạo đồ họa. Không phải bản nâng cấp toàn bộ Cart/Checkout.
Dựa trên code ở `0e6d63f`, hỗ trợ loader code gốc và loader code của Experience 16.2.
Các thay đổi Shop/Product Step 17 ở ngoài những đoạn khởi động đồ họa được giữ lại.
Không hỗ trợ ép ghi đè loader video hoặc một bản loader đã sửa khác: `--check` sẽ dừng.

## Thay đổi

- Giữ PNG `frontend/public/branding/dth-logo-original.png` byte-for-byte. Không video, không asset logo mới.
- 3 vùng logo cắt tĩnh, original-face reveal, silver sweep, aura và signature line.
- 7 animation track khi vào trên desktop, 5 trên màn hình dưới 600px; 1 fade khi thoát. Chỉ animate `opacity` / `transform`.
- Không animate polygon, không filter blur toàn màn hình, không hàng loạt layer `will-change`.
- Bình thường: logo đã decode → 2.5 giây trình bày (650ms cuối giữ logo tĩnh) → 360ms fade khi trang thật sẵn sàng. Không phải phần trăm tải.
- Skip/Escape/error dùng exit ngắn; watchdog độc lập 6.5 giây và cơ chế thoát dự phòng giữ nguyên.
- Freeze pose trước khi thoát, thay vì hủy entry rồi làm logo nhảy sang ảnh hoàn chỉnh.
- Shared animation clock giúp effect setup lại không cố ý tua entry về đầu. Không tắt React StrictMode.
- Gate truyền trạng thái intro qua React Context từ render đầu tiên. WebGL capability probe và scene mount ở Home cinematic, Home legacy, Story, AccountVisual, ProductMedia, Viewer3D được hoãn.
- Sau intro: đợi 180ms và hai nhịp vẽ trước khi cho đồ họa khởi tạo; có timeout dự phòng và cleanup. Lần chuyển trang sau không tự thêm thời gian chờ này.
- API/session/catalog, nội dung trang và ảnh dự phòng vẫn được chuẩn bị. Readiness không chờ 3D nên không tạo vòng chờ vô hạn.
- Vòng kiểm tra 50ms của Gate chuyển thành hẹn giờ tại các mốc brand/waiting/timeout; thay đổi dữ liệu vẫn đánh giá lại ngay.
- Nếu có Experience16.2, `useIntroCover` đọc Context để tránh trả về `false` do DOM shell chưa được commit ở lần render đầu.

## Phạm vi giữ nguyên

Không đổi database, authentication, các quy tắc redirect Login → Story → Home, giỏ hàng/checkout, GLB, vật liệu, góc camera, ảnh Story, thiết kế Home hoặc dependency. Chỉ bổ sung quyền khởi tạo ở các điểm vào đồ họa. Các trang/provider vẫn mounted trong khi intro che; không tháo toàn bộ app để tránh lag.

Đây không phải lời đảm bảo 60 FPS trên mọi máy. PNG decode, JavaScript bundle, GPU driver, extension, dev mode và tài nguyên còn lại của trang đều có thể ảnh hưởng. Cần đo production build trên máy thật.

## Cài trên máy bàn — CMD

Lưu file cài ở `C:\DTH-LoaderPerformance-Step17_2.mjs`. Dừng Vite bằng Ctrl+C. Backend và MongoDB có thể giữ chạy.

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status
dir "C:\DTH-LoaderPerformance-Step17_2.mjs"
node "C:\DTH-LoaderPerformance-Step17_2.mjs" --project "." --check
```

Chỉ sau `CHECK OK`:

```bat
node "C:\DTH-LoaderPerformance-Step17_2.mjs" --project "." --apply
```

`CHECK STOP` → giữ nguyên code, gửi output. Không reset/restore/clean hoặc cài chồng các step cũ để ép vượt kiểm tra.

## Cài trên laptop — CMD

Lưu file tại `E:\DTH-LoaderPerformance-Step17_2.mjs`. Đường dẫn app có **DTH-SHOP**:

```bat
cd /d "E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce"
git status
node "E:\DTH-LoaderPerformance-Step17_2.mjs" --project "." --check
```

Chỉ sau `CHECK OK`:

```bat
node "E:\DTH-LoaderPerformance-Step17_2.mjs" --project "." --apply
```

## Test code

Chạy từng lệnh từ root app. Dừng khi có lỗi:

```bat
node --test "tests\loader172.test.mjs"
node --test "tests\loader-cinematic.test.mjs"
node --test "tests\app-loader.test.mjs"
npm run check
npm test
npm run build
```

Không cần `npm install`, `seed` hoặc migration vì bản cập nhật này không thêm dependencies/dữ liệu.
Nếu clone mới thiếu node_modules, cài theo lockfile (`npm ci`) như workflow của project; không tự cài riêng một package khác phiên bản.

## Chạy và so sánh

Backend terminal (MongoDB sẵn sàng):

```bat
npm run dev:api
```

Terminal frontend development:

```bat
npm run dev
```

Mở `http://127.0.0.1:5173/`. Sau khi build thành công, dừng Vite và xem production build:

```bat
npm run preview
```

Mở `http://127.0.0.1:4173/`. Giữ backend chạy; `.env.local` phải chọn API mode trước build nếu cần đăng nhập thật. `vite preview` là kiểm tra build tại local, không phải deployment.

## Xem lại intro

Trong **F12 → Console trình duyệt**, KHÔNG phải CMD:

```javascript
sessionStorage.removeItem('dth.ignition.seen.v1');
location.href = '/';
```

Chỉ xóa cờ intro. Không xóa giỏ hàng, account hoặc marker Story. Có session đăng nhập/đã xem Story thì flow tiếp tục theo quy tắc hiện có. Vào `/account` trực tiếp vẫn có thể bỏ qua intro như trước; thử startup tại `/`.

Kiểm tra: logo chuyển động/giữ tĩnh/thoát; Skip sớm, Escape; Login, Story, Home; chuyển trang không phát lại startup; xoay/zoom/model retry sau intro; reduced motion; viewport điện thoại. Test một lần cache mới và một lần cache nóng.

## Kiểm tra browser tự động trên app thật (tùy môi trường test sẵn có)

Cần Playwright Python + Chromium. Khi preview + API chạy:

```bat
python tests\browser\loader172.py --url http://127.0.0.1:4173 --path /
```

Có thể chạy lại với `--path /story` hoặc đường dẫn sản phẩm. Kết quả ở `test-results/loader172`. Script dùng browser context mới, không đăng nhập/ghi DB, đo các lần gọi WebGL và khoảng cách rAF. Không coi rAF là bằng chứng FPS GPU tuyệt đối.

## Undo có bảo vệ

Dừng frontend, đứng tại root app:

```bat
node "C:\DTH-LoaderPerformance-Step17_2.mjs" --project "." --undo-latest
```

Laptop đổi duy nhất đường dẫn installer sang `E:\DTH-LoaderPerformance-Step17_2.mjs`.
Backup nằm dưới `.git/dth-loader172-code-backups`, installer in đường dẫn thật khi apply. Undo kiểm tra toàn bộ file trước; file đã sửa thêm thì dừng, không ép ghi đè. Chỉ khôi phục code, không đổi MongoDB. Không tự nhập timestamp minh họa.

## Lưu checkpoint

`git status` báo modified/untracked sau apply là bình thường. Khi kiểm tra xong:

```bat
git diff --check
git add .
git diff --cached --name-only
```

Đọc danh sách, không để `.env`, database data hoặc thông tin bí mật trong staging. Rồi mới:

```bat
git commit -m "perf: streamline intro and defer graphics startup"
git push
```

Máy còn lại chỉ pull đúng branch khi working tree đã được lưu an toàn. Không chạy lại installer nếu code đã nằm trong commit vừa pull.
