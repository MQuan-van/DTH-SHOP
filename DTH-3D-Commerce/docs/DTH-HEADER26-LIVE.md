# Header 26 — đã áp dụng vào Studio chính

04/11/2026. URL: <http://127.0.0.1:5173/>.

Cập nhật tiếp: gallery Spatial25 đã gộp đầy đủ vào trang chính cùng header này. Xem `DTH-STUDIO-SPATIAL25-LIVE.md`; mô tả gallery còn ở demo bên dưới là trạng thái của giai đoạn chỉ tích hợp header.

## Phạm vi

Header đã duyệt trong preview được dùng trên Studio mặc định `/`. Shop, Build, Story, Account, Bag và các mode `?studio=classic` / `?studio=precision` giữ header cũ. Gallery/camera Spatial 25 vẫn là demo riêng; lần này chỉ tích hợp header.

Header dùng cùng component trình bày với demo, qua adapter của store thật:

- Xe và loading/error gate nhận trực tiếp từ Shell. Nút mở NVXPicker hiện có; không tự chọn xe hoặc lưu account default.
- My DTH dùng AccountAccess232 và trạng thái user hiện có. Chỉ thay avatar chữ thành icon trong header mới. Nhãn guest/authenticated, link `/account` và effect của Build được giữ nguyên.
- Bag là Router Link thật tới `/bag`. Chỉ click chính không modifier mới mở CartDrawer; Enter có cùng hành vi. Ctrl/Meta/Shift/Alt/middle-click giữ điều hướng native. Drawer nhận chính anchor để trả focus.
- Giữ `html[data-dth23]` và phép đo `--dth-one-header-height`; rebind observer khi đổi header. GSAP/menu legacy cleanup khi đổi mode chỉ bằng query string.
- CSS header có scope riêng, không mang class c23-header/p24-nav/dth-header để tránh các motion/style cũ tác động. Studio live có attribute riêng để bỏ min-width 320px của html/body/#root khi scrollbar làm vùng client nhỏ hơn 320px; scope này được gỡ khi rời Studio.

## File thêm/sửa trong lần tích hợp

Thêm:

- `frontend/src/experience/header26/StudioHeader26.jsx`: adapter nhận các callback/store props thật, Router links và account hiện có.
- `frontend/src/experience/header26/header26.logic.mjs`: cô lập route, nhãn xe và điều kiện mở drawer.
- `tests/header26-live.test.mjs`: 18 kiểm tra logic và wiring/lifecycle.
- Tài liệu này.

Sửa:

- `frontend/src/experience/commerce23/DTHNavigation23.jsx`: chọn header mới ở Studio mặc định; cập nhật dependency cleanup và đo chiều cao.
- `frontend/src/experience/refinement232/AccountAccess232.jsx`: thêm hai prop trình bày tùy chọn className/plainIcon; giá trị mặc định giữ giao diện cũ.
- `frontend/src/experience/studio25Preview/Header25.jsx`: hỗ trợ account/bag slots, Router link component, DOM ref và disabled của xe; demo vẫn dùng mặc định cũ.
- `frontend/src/experience/studio25Preview/header26.css`: account icon live và min-width fix có scope riêng.
- `docs/DTH-HEADER26-REFINEMENT.md`, `docs/DTH-STUDIO25-SPATIAL-PREVIEW.md`: cập nhật trạng thái áp dụng.

Backup trước sửa ở `test-results/header26-live/backups/`. Không reset/checkout hoặc ghi đè các file khác đang chỉnh. Không thay package/lock, credentials, GLB, auth API, sản phẩm hoặc MongoDB. Không chạy seed/migration/index initialization. Chưa commit/push.

## Kiểm chứng ngày 04/11/2026

| Nhóm | Kết quả |
| --- | --- |
| Header live | 18/18 đạt: route isolation, click/keyboard/modifier, nhãn xe/auth và wiring thật; có guard cleanup khi query-only mode switch. |
| Preview/data/camera hiện có | 25/25 đạt. |
| Toàn bộ regression được verify-premium24 liệt kê | 1691/1691 đạt, 0 skip. Local imports/structure OK. |
| Build frontend chính | Đạt, 7,43 giây trong lần cuối. |
| Build entry demo riêng | Đạt. Có cảnh báo chunk Three.js lớn như trước; không đổi dependency để giấu cảnh báo. |
| Browser thật có đăng nhập | Studio chính 5173, MONGODB/API mode. Người dùng đăng nhập trực tiếp, không bypass gate hoặc dùng session giả. |
| Chọn xe | NVXPicker thật: chọn và Use NVX V2, nhãn header đổi đúng; sau đó Clear selection để khôi phục trạng thái ban đầu chưa chọn xe. Không lưu My Garage/account default. |
| Giỏ hàng | Mở drawer thật bằng click và Enter, Escape đóng và trả focus về anchor; không thêm/xóa/sửa line. Bag ban đầu/cuối đều 0. |
| Account/routing | My DTH tới `/account`, header cũ hiện lại; quay Studio header mới và phép đo chiều cao được phục hồi. Mobile menu → Shop `?mode=shop` → home hoạt động. |
| Responsive | Desktop 1440px, mobile 390px/320px. 320px: vùng client 305px, scrollWidth 305px sau fix; các action nhỏ nhất 44px. |
| GLB/renderer | GLB TTX thật vẫn render trên Studio, không đổi engine/material/geometry. Header không có WebGL renderer. Không benchmark FPS/GPU/memory. |

Ảnh và log: `test-results/header26-live/`. Modifier click được kiểm tra bằng unit guard; chưa mở hàng loạt tab thật để kiểm tra từng modifier. Query-only lifecycle được kiểm tra bằng source contract và review, không gọi đó là browser acceptance của mode legacy. Không fault-inject lỗi API/WebGL hoặc thay native reduced-motion setting của hệ điều hành.

Khi sửa dependency arrays trong phiên Vite đang mở, React có ghi cảnh báo HMR về kích thước dependency array. Sau khi code hoàn tất đã reload trang chính, session vẫn được khôi phục; phép đo header và CSS variable đều 89px, không có error mới trong log của lần tải mới. Observer đo chiều cao có alive/isConnected guard và bỏ qua chiều cao 0 khi node cũ đang tháo.

## Chạy lại

```powershell
node --test tests/header26-live.test.mjs tests/studio25-header.test.mjs tests/studio25-preview.test.mjs tests/studio25-camera.test.mjs
node tools/verify-premium24.mjs
npm.cmd run build --workspace frontend -- --config vite.studio25-preview.config.mjs
```

## PC / laptop

Branch đã kiểm tra: `feat/story-shop-ultra-pc-20261026`. Repo còn nhiều local edits từ trước; không dùng git add . hoặc reset để gom thay đổi. Review/stage source, tests và dependency preview/header liên quan theo đường dẫn cụ thể, chạy các kiểm tra trên rồi commit.

PC sau khi commit các nhóm cần thiết:

```powershell
git push origin feat/story-shop-ultra-pc-20261026
```

Laptop: bảo toàn/commit local edits trước. Khi working tree sạch và đúng branch:

```powershell
git fetch origin
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
npm ci
```

Nếu Git báo divergent/local changes, dừng review merge thay vì reset. Không commit test-results/backups/.env. Các module Gallery24/categories/preview có thể vẫn chưa track từ các bước trước: không chỉ push hai file adapter rồi bỏ các dependency chưa commit. MongoDB và GLB upload cần quy trình đồng bộ riêng, không tự migration hoặc suy ra đã đồng bộ chỉ bằng Git pull.
