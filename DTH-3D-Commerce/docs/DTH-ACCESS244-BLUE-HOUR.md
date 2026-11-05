# DTH Access 24.4 — Blue Hour

> Presentation này đã được thay bằng Access Studio 24.5. Xem `DTH-ACCESS245-STUDIO.md` cho bản đang chạy. Báo cáo bên dưới giữ lại bằng chứng của revision24.4, không mô tả layout hiện tại.

Ngày nghiệm thu revision24.4: 2026-11-05. Đây là presentation trước đây tại `/login` và các màn access do AccessBoundary181 điều khiển.

## Kết quả

Nền navy/cobalt với các dải ánh sáng mềm, form pearl rộng460px ở chính giữa. Logo DTH chỉ còn ở header. Bỏ toàn bộ khối chữ kim loại phóng lớn và layout lệch phải khỏi đường chạy hiện tại.

Background là một fullscreen shader quad (2 triangles), tạo cảm giác nếp gấp/ánh sáng có chiều sâu; không phải model phụ tùng hoặc logo 3D. Pointer thay đổi ánh sáng nhẹ; entry .9s và hội tụ hữu hạn, không lặp animation liên tục. Một R3F Canvas duy nhất. Desktop có Pause/Play; focus/busy/hidden/reduced/save-data giữ gate hiện có. Mobile/reduced/save-data có SVG/gradient tĩnh, form không phụ thuộc WebGL. Có boundary cho lazy import/shader lỗi.

Card460px là kích thước ngoài, đã gồm padding. Top offset phụ thuộc viewport, không phụ thuộc chiều cao card nên đăng ký/error/help mở rộng theo luồng trang mà không căn giữa lại toàn form. Native scroll, nhãn, autocomplete, input16px và touch target được giữ.

Không sửa `AccessScreen181.jsx`, AccessBoundary, Support232, API/backend, GLB, MongoDB, giá/stock/cart/checkout trong revision này. Login/register submit, serial/live/identity guards và callback xác thực vẫn như baseline đã kiểm tra. Support vẫn ẩn cho guest. Không đăng ký tài khoản thật, gửi chat, seed hoặc migration.

## File sửa

- `frontend/src/experience/access243/AccessSurface243.jsx`: entry tương thích, re-export presentation mới.
- `frontend/src/experience/access244/AccessSurface244.jsx`: header, backdrop, form container, help/motion controls.
- `frontend/src/experience/access244/access244.css`: style riêng, không tải override Machined Light.
- `frontend/src/experience/access244/LightField244.jsx`: vòng đời Canvas, shader, pointer và ready/error states.
- `frontend/src/experience/access244/lightField244.logic.mjs`: shader/pure finite-motion math.
- `tests/access244-background.test.mjs`: pure background math + JSX/source checks.
- `tests/access243.test.mjs`: contract test theo entry mới, vẫn kiểm tra xác thực và tách credentials khỏi visual.
- `docs/DTH-LOGIN-REDESIGN-PLAN.md`, `docs/DTH-ACCESS243-IMPLEMENTATION.md`: đánh dấu presentation đã được thay.
- Báo cáo hiện tại `docs/DTH-ACCESS244-BLUE-HOUR.md`.

Giữ nguyên code scene cũ để review/rollback; không xóa file GLB. Backup entry trước sửa ở `test-results/access244/backups/AccessSurface243.before244.jsx`. Không reset Git, không stage/commit/push. Working tree có sẵn nhiều local edits từ các bước trước và được giữ.

## Kiểm thử và build

```powershell
node --test tests/access243.test.mjs tests/access243-support.test.mjs tests/access244-background.test.mjs tests/login181.test.mjs tests/refinement-23-2.test.mjs tests/account.test.mjs tests/support.test.mjs tests/header26-live.test.mjs
npm.cmd run build --workspace frontend
```

- **164/164 tests đạt**, 0 fail/skip. Đây là pure logic/math, syntax và source contracts; không gọi là164 browser tests.
- **Production build đạt, 6.83 giây.** Background lazy chunk6.61kB /2.91kB gzip, dùng Three/Fiber hiện có; không có dependency upgrade.
- Đã phản biện độc lập source và ảnh render. Checklist tham khảo: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## Trình duyệt thật

- 1440×900: một Canvas, field ready sau draw thật, card460px tại x490–950, căn giữa. Không có scene logo cũ.
- 2560×1419: một Canvas, card x1050–1510, không tràn ngang (client/scroll width2560/2560). Đã xem và lưu ảnh thật ở kích thước tương ứng ảnh người dùng.
- 1366×768: card y116–646.625, toàn bộ login trong viewport; không còn offset của layout cũ.
- 390×844: Canvas0; card x16–374, input16px, width390/390, guest Support0.
- 360×640: register mismatch bằng dữ liệu UI giả được chặn trước request. Alert y376.43–419.22 nằm trong viewport, nội dung dài cuộn tự nhiên (document885px), width345/345 khi có scrollbar.
- Access help đóng bằng Escape và trả focus; pointer đánh thức shader; Pause đặt running=false/sleeping=true. Frame counter294 giữ nguyên qua lần quan sát sau. Đây là bằng chứng nghỉ render, không phải benchmarkFPS.
- Không thấy lỗi console mới ở lần tải cuối; cảnh báo dependency `THREE.Clock` deprecated vẫn còn, không che log hoặc nâng dependency để bỏ cảnh báo.
- Sau nghiệm thu để lại tab login với ô nhập trống, đã trả viewport về mặc định.

Ảnh/log/bằng chứng ở `test-results/access244/` (Git ignore): `desktop-final.png`, `wide-final.png`, `mobile-final.png`, `browser-evidence.json`, `tests.log`, `build.log`.

Chưa benchmarkFPS/GPU, chưa thử bàn phím điện thoại thật hoặc cưỡng bức mất WebGL. Reduced-motion/error được kiểm tra bằng logic/source, không tự nhận là đã mô phỏng tất cả tình huống đó trong browser. Không chạy lại toàn bộ commerce flow hoặc tạo dữ liệu thật cho thay đổi presentation này.

## PC/laptop

Hướng dẫn bảo toàn working tree và commit baseline phụ thuộc vẫn ở `DTH-ACCESS243-IMPLEMENTATION.md`, mục Push/pull. Với revision này, review thêm module `access244`, entry re-export và các test/docs liệt kê ở trên. Không chỉ copy CSS hoặc chỉ commit folder mới mà bỏ entry/dependency baseline.

Sau khi đã review/stage đủ code cần giữ trên máy nguồn, commit và push cùng branch hiện tại `feat/story-shop-ultra-pc-20261026`. Trên máy còn lại kiểm tra local edits trước, rồi:

```powershell
git fetch origin
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
npm ci
```

Giữ `.env`/secret local, không đưa lên Git. Nếu server chưa chạy, dùng hai terminal: `npm run dev --workspace backend` và `npm run dev --workspace frontend`; không mở trùng instance ở5000/5173. Xem `http://127.0.0.1:5173/login`, Ctrl+F5 nếu tab còn hiển thị layout cũ. Session có sẵn vẫn điều hướng như trước.
