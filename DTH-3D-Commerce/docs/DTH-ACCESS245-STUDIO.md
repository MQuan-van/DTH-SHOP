# DTH Access Studio 24.5

> Art direction nền pearl của revision này đã được thay bằng Blue Vault 24.6; xem `DTH-ACCESS246-BLUE-VAULT.md`. Bố cục auth deck, camera director và GLB loader của Access Studio vẫn là nền tảng đang dùng. Các số liệu dưới đây là bằng chứng của lượt nghiệm thu24.5.

Ngày: 2026-11-05. Entry thật qua AccessBoundary181 tại `/login` và các đường dẫn đang được access gate bảo vệ.

Trạng thái: đã tích hợp và kiểm tra trên ứng dụng local. Các phép đo và giới hạn được ghi riêng bên dưới.

## Thay đổi đang chạy

Access Studio thay card đăng nhập giữa màn hình bằng sân khấu sản phẩm ở phía trên và thanh nhập thông tin ngang ở dưới. Desktop có tên/finish từ catalog, Ohlins TTX thật và điều khiển Overview/Detail/Replay camera. Mobile xếp form theo chiều dọc và dùng ảnh preview, giữ cuộn trang tự nhiên.

Catalog selector chỉ chọn sản phẩm `ohlins` đang active, thuộc suspension và có model local hợp lệ. Không tạo sản phẩm giả hoặc lấy model khác thay khi thiếu asset. Mất model/catalog không chặn form đăng nhập; ảnh preview và trạng thái chưa sẵn sàng được trình bày riêng.

Camera mở từ góc cận rồi lùi/đi vòng về bố cục toàn cảnh trong khoảng 1.25 giây. Đăng ký chuyển sang góc nhìn khác khoảng 0.8 giây; Overview/Detail có chuyển cảnh riêng. Mục đích là cho thấy các mặt của cùng một phụ tùng, không mô phỏng lắp ráp hoặc xác nhận fitment.

Form có GSAP entry và Flip khi chuyển bố cục login/register. Keyboard mode switch dùng trạng thái tức thì. Khi nhập, busy, Pause hoặc tab ẩn, camera giữ mẫu pose hiện tại; không tự xoay trong lúc người dùng nhập thông tin. Reduced motion/save-data/compact có gate riêng. Camera chỉ nhận semantic values và pointer, không nhận nội dung email/password.

Một R3F Canvas và một camera owner. GSAP chỉ điều khiển director state/DOM thuộc scope; R3F cập nhật camera bằng useFrame. Không thêm renderer/rAF độc lập. Finite motion hội tụ rồi nghỉ. Original GLB geometry/materials và presentation Admin được giữ; scene dùng profiled loader, validators và resource limits hiện có.

## Phạm vi file

Entry tích hợp:

- `frontend/src/experience/access243/AccessSurface243.jsx`: re-export AccessSurface245.

Module mới:

- `frontend/src/experience/access245/AccessSurface245.jsx`: product stage, auth deck, camera/help/playback controls.
- `frontend/src/experience/access245/access245.css`: layout desktop/mobile và style có scope.
- `frontend/src/experience/access245/useAccessDirector245.js`: GSAP lifecycle, mode/detail/replay và input/visibility gates.
- `frontend/src/experience/access245/director245.logic.mjs`: semantic camera bus và catalog selection.
- `frontend/src/experience/access245/AccessStage245.jsx`: GLB loading, R3F rendering, environment, framing và trạng thái thực sự draw.
- `frontend/src/experience/access245/camera245.logic.mjs`: pure camera math, bounds framing, pointer settling và pose retention.
- `frontend/public/branding/access245/ohlins-study-79d2b2bd.png`: poster chụp từ render GLB thật cho mobile/loading.

Kiểm thử/tài liệu:

- `tests/access245.test.mjs`
- `tests/access245-camera.test.mjs`
- `tests/access243.test.mjs`: contract theo entry đang chạy.
- `docs/DTH-ACCESS245-STUDIO.md`
- `docs/DTH-LOGIN-REDESIGN-PLAN.md`
- `docs/DTH-ACCESS244-BLUE-HOUR.md`: đánh dấu revision trước đã được thay.

Giữ các module cũ để review/rollback. Backup entry trước revision ở `test-results/access245/backups/AccessSurface243.before245.jsx`. Không dùng backup để chép đè mù lên local edits mới.

## Hợp đồng được bảo toàn

`AccessScreen181.jsx`, AccessBoundary và Support232 không được sửa trong bước presentation này. Validation, request lock, serial/live/identity-epoch guards, callback xác thực và role/return URL vẫn do baseline sở hữu. Hash Auth181 và Support232 được đối chiếu không đổi trong quá trình tích hợp.

Không sửa backend/API payload, MongoDB, catalog/price/stock, cart/checkout, asset GLB hoặc Admin presentation. Không seed/migration, không tạo tài khoản hay gửi chat thực để thử giao diện. Guest Support vẫn bị ẩn theo guard đã có. Không reset Git, đổi branch hoặc tự động commit/push.

## Kiểm tra đã có bằng chứng

### Logic, syntax và build

- Lần chạy cuối: **174/174 tests đạt, 0 fail/skip**, 779 ms. Gồm pure camera/director math, syntax, poster binding và source contracts; đây không phải 174 browser tests.
- **Production frontend build đạt**, Vite báo 6.51 giây, 964 modules. Không đổi dependency hoặc lockfile.
- Không nâng React/Fiber/Three/GSAP hoặc thay renderer backend. Installed Three 0.184 được ưu tiên so với ví dụ skill nhắm r186.

Các lệnh kiểm tra liên quan:

```powershell
node --test tests/access243.test.mjs tests/access243-support.test.mjs tests/access245.test.mjs tests/access245-camera.test.mjs tests/login181.test.mjs tests/refinement-23-2.test.mjs tests/account.test.mjs tests/support.test.mjs tests/header26-live.test.mjs
npm.cmd run build --workspace frontend
```

Log/bằng chứng local, được Git ignore: `test-results/access245/tests.log`, `build.log` và các ảnh cùng thư mục.

### Browser thật

- Đã kiểm tra desktop 1440, laptop 1366 và viewport mobile 390 trên ứng dụng đang chạy thật.
- GLB Ohlins đạt ready sau khi có draw thật; không dùng poster để chứng nhận runtime 3D.
- Đã quan sát camera Replay qua 14 khung ảnh thật. Minh chứng ghép chuyển động ở `test-results/access245/camera-replay.webp`; số khung này **không phải số đo FPS**.
- Focus freeze được đối chiếu bằng exact camera position và frame counter giữ nguyên qua các lần quan sát.
- Chuyển register quan sát được các ma trận transform của GSAP Flip trên form thật.
- Desktop 1440×900: một Canvas, chiều rộng nội dung bằng viewport; deck ở y652.5–841. Laptop 1366×768: nút submit cao52px, y592–644; form nằm trong viewport.
- Mobile 390×844: không mount Canvas nặng, input16px/cao52px, không tràn ngang. Poster GLB mới đã hiển thị đúng. Không coi viewport giả lập là điện thoại vật lý.
- Register mobile dùng giá trị fixture không khớp để đi qua validation local, không gửi đăng ký. Alert “Your passwords do not match.” nhận focus, nằm trong viewport tại y613.89–653.08. Guest không có Support launcher.
- Access help mở được; Escape đóng và trả focus về nút. Pause giữ nguyên pose và frame counter4 qua hai lần quan sát, Play mở lại các điều khiển.
- Ảnh cuối: `desktop-final.png`, `laptop-final.png`, `mobile-final.png`, `mobile-register-error.png`; ảnh góc khác: `detail-desktop.png`, `register-desktop.png`. Geometry/dataset được lưu tại `browser-evidence.json`, khung replay tại `replay-frames/frames.json` trong `test-results/access245/`.

### Giới hạn

Chưa benchmark FPS/GPU/memory dài hạn, chưa thử bàn phím trên điện thoại vật lý, chưa nghiệm thu hệ điều hành bật reduced motion bằng browser thật. Logic/source checks cho các gate không thay cho các phép đo đó. Không tuyên bố đã chạy lại toàn bộ commerce/API flow chỉ vì form được đổi layout.

Model upload thật có dung lượng 43,225,496 bytes (~41.22MiB); form không đợi scene tải. Không nới validator, remesh hoặc nén asset để che vấn đề tải. Poster là trạng thái preview riêng, không được gọi là live 3D. Scene timeout/error/Retry có source coverage; chưa ép lỗi GPU/network trên browser trong lượt nghiệm thu này.

### Nguồn poster

`ohlins-study-79d2b2bd.png` là screenshot native 500×480 của chính canvas đang render tại desktop1440×900, crop x680/y110. Không dùng AI, retouch hoặc sửa ảnh catalog/GLB gốc. Capture dùng camera Overview `[1.89343,0.35638,4.02189]`, target `[0,0,0]`, presentation mặc định.

Nguồn `/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb`, SHA-256 `79d2b2bdf8824a775e5cc8adffce313e2a687fb864fcef540c09eb084d536e98`. Metadata nằm trong `STUDY_POSTER245`; test kiểm tra bytes model hiện tại còn khớp. Runtime chỉ chọn poster này khi đúng product/model URL và chưa có Admin presentation. Có presentation mới hoặc model URL khác sẽ dùng ProductImage hiện có. Thay bytes dưới cùng URL phải chụp lại poster; hash check là lúc test, không tải43MiB trên mobile để kiểm hash.

## PC và laptop

Đây là frontend presentation trên working tree đã có nhiều sửa đổi/chưa tracked từ các bước trước. Review local edits và dependency baseline trước khi stage. Không dùng `git add .`, reset, force checkout hoặc chỉ copy một file CSS sang máy khác.

Trên máy nguồn, từ thư mục dự án:

```powershell
git status --short
git diff -- frontend/src/experience/access243/AccessSurface243.jsx tests/access243.test.mjs
```

Review module `frontend/src/experience/access245`, test và docs trong danh sách file ở trên. Stage có chọn lọc các file/hunk thực sự cần giữ và cả baseline nội bộ còn thiếu; kiểm tra `git diff --cached --stat`, chạy test/build rồi mới commit/push branch hiện tại `feat/story-shop-ultra-pc-20261026`. Không có thao tác Git ghi nào được tự chạy trong bước này.

Trên máy còn lại, xử lý/review local edits trước khi cập nhật cùng branch, rồi:

```powershell
git fetch origin
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
npm ci
```

Giữ `.env` và credentials ở cấu hình local, không đưa lên Git. Hai máy cần cùng store/Atlas config để dùng chung tài khoản. Không di chuyển/xóa GLB khi đồng bộ revision frontend này.

FE 5173 và API 5000 hiện đang chạy; dùng instance đó để xem `http://127.0.0.1:5173/login`, không khởi động trùng. Nếu máy còn lại chưa có server, mở hai terminal với `npm run dev --workspace backend` và `npm run dev --workspace frontend`. Giữ cấu hình môi trường local hiện có. Nếu tab còn layout cũ, tải lại trang; session có sẵn vẫn điều hướng theo baseline.
