# DTH Access 24.6 — Blue Vault

Ngày: 2026-11-05. Entry vẫn qua AccessBoundary181 và AccessSurface245 tại `/login` cùng các đường dẫn được access gate bảo vệ.

Trạng thái: đã tích hợp và kiểm tra trên ứng dụng local. Logic, build, browser và các giới hạn chưa đo được ghi riêng bên dưới.

## Art direction đang chạy

Blue Vault giữ cấu trúc product studio và thanh đăng nhập ngang của 24.5, thay vùng nền pearl bằng navy/candy-blue. TTX vàng nguyên gốc là điểm nhấn ấm; chữ, camera controls, help và credential deck có màu tương phản phù hợp với nền tối.

Có hai lớp không gian với vai trò riêng:

- DOM atmosphere tạo dải sáng/haze ngoại vi, reading veil yên ở vùng tên sản phẩm và floor fade. Pointer chỉ đổi transform/opacity hữu hạn, không cập nhật React state mỗi frame.
- `StudioArchitecture246` tạo năm rail/slab và một đường thấp mờ trong cùng Canvas của sản phẩm. Đây là kiến trúc ánh sáng trang trí phía sau asset, không phải bộ phận xe hoặc khẳng định fitment. Mặt sàn lớn từng tạo ô chữ nhật cứng đã được bỏ khỏi scene.

Một Canvas và một camera owner. Không thêm renderer hoặc vòng requestAnimationFrame riêng. Camera cận/toàn cảnh, Detail/Overview/Replay và Flip của form tiếp tục dùng director245. Không sửa geometry/material/texture GLB; chỉ thêm tài nguyên stage có owner và lifecycle riêng.

## Motion và input gates

Atmosphere nhận semantic director state cùng pointer, không nhận email/password. Input focus, help mở, busy, Pause, tab ẩn, reduced motion, save-data và compact đều chặn motion phù hợp. Tween quickTo đang chạy được pause ngay khi chặn; focus/Pause giữ transform hiện tại, không revert về gốc.

Đã sửa trường hợp chuyển reduced/compact về desktop làm quickTo phát lại offset cũ. `resetLightPointer246` dùng `xTo(0, 0, false)`/`yTo(0, 0, false)` rồi pause, reset cả cached start. Regression test chạy với GSAP đang cài; đây là kiểm thử hành vi thư viện, không phải benchmark browser.

Context GSAP được scope và cleanup khi unmount; pointer/director subscriptions được tháo. CSS không animate background/blur/layout từng frame. Mobile dùng poster tĩnh, không mount Canvas. Form vẫn dùng native scroll, input 16px, labels/autocomplete và luồng xác thực hiện có.

## Phạm vi file

Mới:

- `frontend/src/experience/access246/AccessAtmosphere246.jsx`
- `frontend/src/experience/access246/atmosphere246.logic.mjs`
- `frontend/src/experience/access246/access246.css`
- `frontend/src/experience/access246/StudioArchitecture246.jsx`
- `frontend/src/experience/access246/poster246.logic.mjs`
- `frontend/public/branding/access246/ohlins-vault-79d2b2bd.jpg`
- `tests/access246.test.mjs`
- `docs/DTH-ACCESS246-BLUE-VAULT.md`

Tích hợp/cập nhật:

- `frontend/src/experience/access245/AccessSurface245.jsx`: atmosphere, dark theme và help/input gating; chọn poster mới.
- `frontend/src/experience/access245/AccessStage245.jsx`: stage architecture trong Canvas hiện có.
- `docs/DTH-ACCESS245-STUDIO.md`, `docs/DTH-LOGIN-REDESIGN-PLAN.md`: trỏ tới art direction đang chạy.

Backup trước sửa nằm trong `test-results/access246/backups/`: `AccessSurface245.before246.jsx`, `AccessStage245.before246.jsx`, `director245.before246.logic.mjs`. Giữ nguyên poster/module cũ. Không tự động reset Git, stage, commit hoặc push; working tree trước bước này đã có nhiều local edits và file chưa tracked.

## Hợp đồng và dữ liệu

Hash `AccessScreen181.jsx` và Support232 không đổi trong revision này. AccessBoundary, validation, submit lock, serial/live/identity guards, callback xác thực và role/return URL vẫn như baseline. Support vẫn ẩn cho guest. Không thêm recovery/social-login API hoặc giả nhân viên trực tuyến.

Không sửa backend, MongoDB, API payload, catalog/giá/stock, cart/checkout, GLB gốc hoặc Admin presentation. Không seed/migration, không tạo tài khoản, gửi chat hoặc ghi dữ liệu thật để kiểm thử giao diện. Các request đọc catalog/model hiện có vẫn do ứng dụng thực hiện.

## Kiểm thử và build

Log hiện có:

- **179/179 tests đạt**, 0 fail/skip, gồm 174 baseline và 5 test246 mới.
- **Production frontend build đạt**, Vite báo **8.21 giây**.
- Không nâng dependency. Các checks gồm pure policy/pose, installed-GSAP regression, JSX/source contracts và metadata poster. Không gọi 179 tests này là browser tests.

Bộ lệnh liên quan:

```powershell
node --test tests/access243.test.mjs tests/access243-support.test.mjs tests/access245.test.mjs tests/access245-camera.test.mjs tests/access246.test.mjs tests/login181.test.mjs tests/refinement-23-2.test.mjs tests/account.test.mjs tests/support.test.mjs tests/header26-live.test.mjs
npm.cmd run build --workspace frontend
```

Log local, được Git ignore: `test-results/access246/tests.log` và `test-results/access246/build.log`.

## Bằng chứng browser thật

- Desktop 1440: scene navy, original GLB thực sự draw, một Canvas, stage rail/slab và haze có vai trò riêng. Không dùng poster để chứng nhận live 3D.
- Pointer: đã quan sát glow matrix với offset x37.4591/y−10.7119 và camera endpoint đổi.
- Khi focus input, glow matrix giữ offset 41.7123/−11.9281; camera position `[1.94556, 0.37307, 3.99541]` và frame counter 407 giữ nguyên qua lần quan sát sau. Đây là bằng chứng freeze, không phải FPS.
- Mobile 390×844: Canvas0, hiển thị poster Blue Vault mới. Mismatch bằng dữ liệu giả nhận focus ở alert; rect y613.89–653.08 trong viewport 844px. Validation dừng trước request tạo tài khoản.
- Laptop 1366×768: một Canvas; submit cao52px, y592–644; client/scroll width1366/1366, không tràn ngang. Desktop 1440×900 có một Canvas và trạng thái Original3D sau draw thật.
- Access help đóng bằng Escape, trả focus về nút trợ giúp.
- Replay có14 native frames trong khoảng28–2207ms: camera từ `[0.61959, 0.67177, 2.94229]` tới `[1.89343, 0.35638, 4.02189]`; aperture matrix chuyển từ rotation khoảng−0.067566 tới identity. Ảnh động WebP bàn giao có8 coalesced pages, 960×600. Đây là minh chứng chuyển cảnh, không phải số đo FPS.
- Pause giữ glow offset `[9.6931, -3.364]`, camera `[1.94577, 0.37677, 3.99496]` và frame counter237 không đổi qua hai lần đọc. Các số này là lượt pause riêng với lượt focus ở trên.

Ảnh và bằng chứng cuối tại `test-results/access246/`: `desktop-final.jpg`, `laptop-final.jpg`, `mobile-final.jpg`, `camera-replay.webp`, `browser-evidence.json`. Ảnh mobile/error/register cùng test/build logs cũng được giữ trong thư mục này; toàn bộ là local evidence được Git ignore.

Chưa benchmark FPS/GPU/memory dài hạn, chưa thử bàn phím điện thoại vật lý hoặc hệ điều hành reduced-motion trong browser thật. Source/pure checks cho các gate không thay những phép thử đó. Không tuyên bố đã chạy lại toàn bộ commerce flow.

## Poster dark và provenance

`/branding/access246/ohlins-vault-79d2b2bd.jpg` là **JPEG native 500×480** chụp từ chính render Overview Blue Vault thật tại viewport 1440, region x680/y110. Không dùng AI, retouch hay cutout; phần feather ở mép là CSS presentation, không sửa nội dung ảnh catalog/GLB. Test kiểm tra format JPEG và kích thước thật.

Nguồn là `/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb`, SHA-256 `79d2b2bdf8824a775e5cc8adffce313e2a687fb864fcef540c09eb084d536e98`. `STUDY_POSTER246` kế thừa binding245 và thêm theme `blue-vault-246`; runtime chỉ chọn khi đúng product/model URL và chưa có Admin presentation. Model/presentation thay đổi dùng fallback ProductImage và cần chụp lại poster. Thay bytes dưới cùng URL hoặc thay ánh sáng scene cũng cần chụp lại; không tải model 43 MB trên mobile chỉ để kiểm hash.

Tệp poster245 cũ được giữ nguyên; không suy ra format từ phần mở rộng của tệp đó. Dark surface không dùng multiply trên poster, tránh làm vàng/đen của sản phẩm bị chìm vào nền navy hoặc lộ một ô trắng của ảnh cũ.

## PC và laptop

Tiếp tục dùng hướng dẫn dirty-tree/baseline ở `DTH-ACCESS245-STUDIO.md`. Review thêm module246, asset poster, hai file tích hợp245, test và docs trong danh sách trên. Không dùng `git add .` hoặc chỉ copy CSS; revision này phụ thuộc baseline Access Studio đang có trong working tree.

Trên máy nguồn, review bằng `git status --short` và diff, stage có chọn lọc những file/hunk cần giữ cùng dependency baseline, chạy test/build rồi mới commit/push branch hiện tại `feat/story-shop-ultra-pc-20261026`. Không có thao tác Git ghi nào được tự chạy trong bước này.

Trên máy còn lại, xử lý/review local edits trước khi cập nhật cùng branch:

```powershell
git fetch origin
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
npm ci
```

Giữ `.env`/credentials local và cùng store/Atlas config nếu cần dùng chung tài khoản; không đưa secret lên Git. Không xóa/di chuyển GLB khi đồng bộ frontend.

FE 5173 và API 5000 hiện đã chạy; dùng instance hiện có để xem `http://127.0.0.1:5173/login`, không mở server trùng. Nếu máy còn lại chưa chạy, dùng hai terminal với `npm run dev --workspace backend` và `npm run dev --workspace frontend`. Giữ cấu hình môi trường local hiện có; tải lại tab nếu còn art direction cũ.

Kết quả cuối vẫn là 179/179 tests và build 8.21 giây. Hash auth handler, Support232 và source GLB được đối chiếu không đổi. Không suy rộng các bằng chứng này thành nghiệm thu FPS, bàn phím điện thoại thật hoặc hệ điều hành reduced-motion chưa được thử.
