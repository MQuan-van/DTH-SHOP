# DTH Access 24.3 — Machined Light

> Bản presentation này đã được thay bằng Blue Hour 24.4. Xem `DTH-ACCESS244-BLUE-HOUR.md` cho trạng thái đang chạy; báo cáo bên dưới lưu bằng chứng của baseline cũ. Auth và Support guards vẫn được giữ.

Ngày nghiệm thu: 2026-11-05. Branch hiện có: `feat/story-shop-ultra-pc-20261026`.

## Thay đổi đã áp dụng

Trang đăng nhập thật qua AccessBoundary181 dùng presentation mới: nền pearl liền, chữ navy, nút xanh, hình khối logo DTH 3D và ánh sáng candy-blue phản ứng theo chuột. Form không nằm trong một card riêng. Giữ cả đăng ký, kiểm tra phiên, cấu hình preview và lỗi kết nối. Không thêm route đăng nhập hoặc endpoint mới.

Desktop dùng hình học logo hiện có (956 triangles), vật liệu satin/kim loại và cạnh navy trong một R3F Canvas. Camera cố định; góc phản ứng tổng cộng tối đa 3 độ. Một lượt ánh sáng đầu vào khoảng .78 giây; pointer làm scene thức dậy rồi nghỉ sau khi hội tụ. Không có vòng quay liên tục. CSS aura theo chuột có owner GSAP riêng.

Màn hình <=860 px, reduced motion hoặc Save Data dùng poster tĩnh có chiều sâu và gradient nhẹ; không mount Canvas hoặc tải chunk scene mới. Form không chờ WebGL. Suspense và visual-only error boundary bảo vệ khi chunk lỗi; scene có fallback và watchdog riêng. Lỗi visual không được sở hữu xác thực.

Ở desktop, form thực tế nằm khoảng 67–70% chiều rộng viewport sau khi cân lại với footprint logo. Đây là điều chỉnh so với ý tưởng 58% trong plan; đã kiểm tra bố cục thật ở 1440 và 1366 px. Chưa có nghiên cứu người dùng để gọi đây là phiên bản tối ưu cuối cùng.

Form bổ sung Caps Lock hint, reset trạng thái Show/Hide khi đổi login/register, tiêu đề tab theo mode và cách diễn đạt session-ended phù hợp với màn đăng nhập. Giữ native validation, autocomplete, paste và input name/type. Không thêm password recovery/social login/Remember me khi chưa có API.

Support chỉ hiện cho phiên API đã xác thực xong. Guest, auth-loading/error, preview/flow và login không có launcher/composer. Customer phải chủ động mở chat; open state và thread ràng buộc theo user, role, identity epoch và pathname. Đổi tài khoản/phiên/trang không tái dùng open state hoặc kết quả đến muộn. Giữ nguyên ChatThread, payload API và Inbox Admin.

## File thay đổi

Điểm tích hợp hiện có:

- `frontend/src/experience/access181/AccessScreen181.jsx`
- `frontend/src/experience/refinement232/Support232.jsx`

Module mới:

- `frontend/src/experience/access243/AccessSurface243.jsx`
- `frontend/src/experience/access243/access243.css`
- `frontend/src/experience/access243/access243.logic.mjs`
- `frontend/src/experience/access243/useAccessPolicy243.js`
- `frontend/src/experience/access243/MachinedScene243.jsx`
- `frontend/src/experience/access243/scene243.logic.mjs`
- `frontend/src/experience/access243/support243.logic.mjs`

Kiểm thử/tài liệu:

- `tests/access243.test.mjs`
- `tests/access243-scene.test.mjs`
- `tests/access243-support.test.mjs`
- `docs/DTH-LOGIN-REDESIGN-PLAN.md`
- `docs/DTH-ACCESS243-IMPLEMENTATION.md`

Backup trước khi sửa, được Git ignore:

- `test-results/access243/backups/AccessScreen181.before243.jsx`
- `test-results/access243/backups/support/Support232.jsx`

Không reset Git, không đổi branch, không commit/push. Không sửa Mount Calibration, source GLB, presentation Admin, backend, API payload xác thực, catalog/giá/stock/cart/checkout hay dữ liệu sản phẩm. Không seed/migration. Nghiệm thu có đăng nhập/đăng xuất tài khoản Admin có sẵn, tức sử dụng cơ chế tạo/thu hồi phiên bình thường; không tạo tài khoản mới, đổi role hoặc gửi tin nhắn.

## Logic và build

Lệnh đã chạy sau thay đổi cuối:

```powershell
node --test tests/access243.test.mjs tests/access243-scene.test.mjs tests/access243-support.test.mjs tests/login181.test.mjs tests/refinement-23-2.test.mjs tests/account.test.mjs tests/support.test.mjs tests/header26-live.test.mjs
npm.cmd run build --workspace frontend
```

- **167/167 tests đạt, 0 skip, 0 fail.** Có pure math/policy, guard Support, syntax JSX và source-contract assertions; không gọi chúng là browser tests.
- **Production build đạt**, Vite báo **6.84 giây**.
- Scene lazy chunk khoảng 350.90 kB / 114.87 kB gzip; các chunk Three/Fiber dùng từ dependency hiện có. Không nâng package. Phiên bản thực tế: React19.2.8, Fiber9.8.1, Three0.184.0, GSAP3.15.0.
- Auth submit và switchMode được đối chiếu với backup: validation, request lock, live/serial/identity-epoch checks và verified callback giữ nguyên. AccessBoundary181 và điều hướng theo role/return URL không bị sửa.

Log: `test-results/access243/tests.log`, `test-results/access243/build.log`.

## Kiểm tra trình duyệt thật

Trên ứng dụng tại `http://127.0.0.1:5173/login`, API hiện có ở 5000; không mở server trùng:

- Desktop1440×900: scene `ready`, một Canvas, document client/scroll width1440/1440, guest Support0. Mesh đã thực sự draw trước khi ready.
- Laptop1366×768: toàn bộ login form và disclosure trong viewport; submit54px; document cao768, không tràn ngang.
- Cửa sổ mặc định887×918: một scene, form389.67px, không tràn ngang.
- Mobile390×844: Canvas0, input16px, client/scroll width390/390, Support0. Đã lưu ảnh với ô nhập trống.
- Mobile360×640: client/scroll width345/345 khi có scrollbar; login submit nằm trong viewport. Register dài831px cuộn tự nhiên; Ctrl+End đưa submit vào vùng nhìn thấy.
- Show/Hide dùng dữ liệu UI giả; chuyển mode xóa password/confirm và giữ email quan sát trên màn hình. Đăng ký mismatch hiện lỗi trước request; không tạo tài khoản thử thật.
- Access help mở/đóng; Escape trả focus về nút trợ giúp.
- Pointer trên vùng visual làm counter tăng rồi scene ngủ. Pause đặt running=false, sleeping=true; counter332 giữ nguyên qua lần quan sát sau. Đây là bằng chứng dừng render, **không phải số đo FPS**.
- Đăng nhập Admin có sẵn qua form mới thành công, tới `/admin`; sau đó login scene0, Canvas0 ở Admin. Đã đăng xuất và để lại tab login với các ô trống để xem thiết kế.
- Không thấy lỗi console mới trong lần tải cuối; có cảnh báo dependency `THREE.Clock` deprecated từ bundle Three/Fiber. Không lọc console hoặc nâng dependency để che cảnh báo.

Ảnh/bằng chứng local, được Git ignore:

- `test-results/access243/desktop-final.png`
- `test-results/access243/mobile-final.png`
- `test-results/access243/browser-evidence.json`

Giới hạn chưa chứng minh:

- Chưa benchmark FPS, GPU hoặc bộ nhớ dài hạn. Không cam kết60fps trên mọi máy.
- Mobile là viewport trình duyệt desktop, chưa kiểm tra bàn phím trên điện thoại thật.
- Reduced motion/WebGL failure được kiểm tra bằng logic/source guards; chưa cưỡng bức các điều kiện này trong browser.
- Phím zoom ở browser kiểm thử không đổi viewport/DPR quan sát được; **chưa xác nhận zoom200%**.
- API network timing không được browser bridge cung cấp; guest launcher0 được đo trong DOM, điều kiện không gọi chat được kiểm tra ở logic/source. Không tuyên bố đã audit packet-level network.
- Không gửi chat thực hoặc nghiệm thu lại toàn bộ customer commerce flow. Không chạy các script account cũ có tạo/xóa tài khoản thật.

## Guidance đã áp dụng

Đã đọc frontend-design, UI/UX Pro Max, Web Interface Guidelines, Emil, GSAP React/timeline/performance, animation-performance, Three/R3F/loaders/materials/performance/lighting và3DViz phù hợp. Đã dùng phản biện độc lập, kiểm thử math/guards và ảnh render thật để sửa vật liệu/framing. Không gọi việc đọc SKILL.md là đã chạy audit script. Tra cứu Python của UI/UX skill không chạy được vì Python launcher WindowsApps bị chặn; không cài môi trường mới.

Nguồn checklist UI: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## Push/pull giữa PC và laptop

Working tree trước bước này đã có nhiều chỉnh sửa và file chưa tracked từ các bước trước. Module mới phụ thuộc baseline đó; chỉ copy thư mục access243 sang laptop có thể thiếu dependency nội bộ. Cần review và commit cả những phần baseline liên quan mà bạn muốn giữ. Không dùng `git add .`, reset hoặc force checkout để xử lý nhanh.

Trên máy đang có bản đầy đủ, từ thư mục dự án:

```powershell
git status --short
git diff -- frontend/src/experience/access181/AccessScreen181.jsx frontend/src/experience/refinement232/Support232.jsx
git add -- frontend/src/experience/access243 tests/access243.test.mjs tests/access243-scene.test.mjs tests/access243-support.test.mjs docs/DTH-ACCESS243-IMPLEMENTATION.md docs/DTH-LOGIN-REDESIGN-PLAN.md
git add -p -- frontend/src/experience/access181/AccessScreen181.jsx frontend/src/experience/refinement232/Support232.jsx
git diff --cached --stat
```

Hai file tích hợp đã có local edits trước bước này. Review hunk được stage và baseline/dependency chưa commit; không coi danh sách lệnh trên là một commit độc lập đã chắc chắn đủ. Sau khi đã stage đúng các thay đổi cần giữ và chạy build/test:

```powershell
git commit -m "Refine DTH access with Machined Light and authenticated support"
git push origin feat/story-shop-ultra-pc-20261026
```

Trên máy còn lại: kiểm tra `git status --short` trước. Nếu có local edits, commit/review chúng trước khi pull; không tự bỏ đi. Khi working tree phù hợp để cập nhật cùng branch:

```powershell
git fetch origin
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
npm ci
```

`.env` và credential không đi qua Git. Hai máy dùng cùng Atlas/store config mới dùng chung tài khoản; giữ secret trong cấu hình local. GLB hiện có phải giữ nguyên.

Nếu chưa có server chạy, mở hai terminal ở thư mục dự án:

```powershell
# Terminal 1
npm run dev --workspace backend
# Terminal 2
npm run dev --workspace frontend
```

Nếu cổng5000/5173 đã có đúng instance dự án chạy thì sử dụng instance đó; không khởi động thêm. Xem giao diện tại `http://127.0.0.1:5173/login`; nếu đã đăng nhập ứng dụng sẽ điều hướng theo session như trước.

Rollback presentation cần so sánh hai backup với source hiện tại và áp patch nhỏ có review. Giữ module cũ nguyên vẹn không đồng nghĩa được phép chép đè toàn bộ file hoặc bỏ local edits mới.
