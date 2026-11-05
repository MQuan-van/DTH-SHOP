# Step 23.4A.2 — Interactive Mount Calibration

04/11/2026 · DTH-3D-Commerce · Yamaha NVX V2 + Ohlins TTX.

## Trạng thái

Đã triển khai workspace trong ứng dụng tại `/admin/mount-calibration`, dùng quyền Admin hiện có. Đây là công cụ authoring hình ảnh, không phải chứng nhận phụ tùng tương thích cơ khí hoặc replacement hoàn chỉnh. Draft nằm trong phiên workspace; export/import JSON, không ghi Atlas.

Blocker Admin đã được xử lý sau khi người dùng yêu cầu tạo tài khoản Admin chung và chỉ định tài khoản: đăng ký qua API hiện có, cấp quyền bằng công cụ operator sẵn có, đăng nhập Admin thành công qua UI thật. Không lưu mật khẩu trong source/tài liệu. Workspace đã được thử với GLB thật, kéo Move/Rotate/Scale, Undo/Redo, reset camera và export/import. Chưa có vị trí lắp do người dùng review hoặc chứng nhận cơ khí.

## Repository và route thật

- Application root: `E:/Greenwich/Final-Project_GRE/DTH-SHOP/DTH-3D-Commerce`.
- Git root: thư mục cha `DTH-SHOP`; branch `feat/story-shop-ultra-pc-20261026`; HEAD `c9cad73b8470e39b45967bf752f4f8b75aa440e6`.
- Có nhiều local edits và file untracked từ các bước trước. Đã giữ nguyên; chỉ thêm module/test/doc của bước này và mở rộng route/menu Admin. Backup `AdminLayout.jsx` trước patch ở `test-results/mount-calibration242/backups/`.
- Đã đọc AGENTS.md, README/tài liệu liên quan, audit cũ, các loader/normalization đang dùng và lockfile. Stack giữ React 19.2.8, Three 0.184.0, Fiber 9.8.1, drei 10.7.8, GSAP 3.15.0. Không cài/nâng dependency hoặc đổi WebGPU.

Luồng mới thực tế:

```text
/admin/*
  App.jsx → AdminApp → StoreProvider
    AdminLayout: MODE=api / authLoading / authError / user.role=admin
      PremiumAdminShell213
        /admin/mount-calibration → MountCalibration242.jsx
          CalibrationScene242.jsx → một R3F Canvas frameloop=demand
```

Gate chạy trước các route con. Không sửa auth/session hoặc tạo API mới. Code Admin inline cũ trong StoreApp không phải entry back-office hiện tại.

Đối chiếu các entry cũ để tránh sửa nhầm:

- Studio mặc định `/`: `HomePage → spatial25/StudioSpatial25 → studio25Preview/SpatialStage25`; không phải StudioAtelier22H2/Studio23. Các rollback Gallery24/precision/classic được giữ nguyên.
- Build `/shop?mode=build`: `DiscoveryPage → commerce23/BuildExperience23 → VehicleStage23 re-export → hotspots233/VehicleStage233 → createHotspotStage233`.
- Foundation `shared/mounting234.mjs` và `experience/mounting234/assembly234.mjs` giữ nguyên. Schema Euler v1 không bị âm thầm diễn giải thành quaternion v2.

## Audit asset hiện tại

Audit đọc-only bằng `auditGLBFile/auditGLBBytes` của công cụ đang có, kiểm tra GLB2 header/chunks/hierarchy/indexed bounds/hash. Public GET catalog/manifest và model endpoint, không sửa dữ liệu. Bằng chứng chi tiết: `test-results/mount-calibration242/asset-audit.md`.

**Khác biệt quan trọng với audit local cũ:** runtime manifest đang publish một V2 khác file local. Workspace có lựa chọn nguồn rõ ràng: Published NVX V2 slot hoặc Local NVX V2 GLB. Mặc định giữ published như luồng ứng dụng hiện có; URL `?source=local` mở đúng file V2 local đã audit. Không thay bằng V3, không ghi lại publication. Đổi nguồn tạo context/hash mới; không mang transform của asset cũ sang asset mới.

Qua browser, local V2 hiển thị xe đầy đủ; published V2 hiển thị một reconstruction phía sau khác file gốc. Smoke Build V3 còn hiển thị model giống monoshock dưới nhãn V3 (`build-smoke.jpg`); đây là vấn đề nội dung publication hiện có, chưa sửa trong bước này. ID slot không được coi là bằng chứng nội dung/phiên bản xe đúng. Dùng `?source=local` cho hiệu chuẩn V2 gốc và kiểm tra model trực quan trước khi review.

| Asset | Bytes | SHA-256 | Triangles |
| --- | ---: | --- | ---: |
| Published V2 | 88,456,412 | `f005f3e8ed2e2878fca13f4e1b1e9a837037bfde445d39e771307a4d4f63a381` | 2,855,214 |
| Local V2 | 129,837,080 | `57040fe8e411c8f4338ddd2672d3842f0cfb01d863ba04bd02f252031e74cadc` | 4,110,220 |
| TTX catalog asset | 43,225,496 | `79d2b2bdf8824a775e5cc8adffce313e2a687fb864fcef540c09eb084d536e98` | 1,181,746 |

- Published V2: `/api/shop/ai-assets/models/v2.glb?rev=44a0b2a5-7e0a-44e6-bbb5-67fff6de755a`.
- Local V2: `frontend/public/models/nvx/nvx-v2.glb`.
- Catalog xác nhận product `ohlins`, category suspension, active, model `/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb`, `presentation3d=null` tại lúc audit.
- Cả ba asset là GLB2 thật, không phải LFS pointer; một scene root → một node không tên/identity → một mesh → một indexed triangle primitive → một material, ba JPEG nhúng; không external resources hoặc declared extension.
- Hash local V2 và TTX đã được tính lại sau khi triển khai, vẫn khớp bảng trên; source GLB không đổi.
- Published V2 source bounds: min `[-0.7664679885,-0.9517800212,-0.6227009892]`, max `[0.7757909894,0.9509429932,0.6165990233]`.
- TTX source bounds: min `[-0.4972119927,-0.8798480034,-0.9516440034]`, max `[0.4975009859,0.8794389963,0.9499239922]`.

Stock **MERGED theo hierarchy**: không thể ẩn riêng phuộc zin; hide node/mesh duy nhất sẽ ẩn toàn xe. Định danh chính xác tam giác phuộc và ý nghĩa cơ khí vẫn **INDETERMINATE**. Số mesh không được dùng để tự nhận diện anatomy. Không hide stock node nào trong workspace.

Ảnh render đã có `frontend/public/previews/gallery24/ohlins-ttx.png`, hash-bound với đúng TTX hiện tại, đã được mở kiểm tra; browser workspace sau đó render thật cùng kết quả: **hai phuộc trong một asset**. Scene dùng đúng một whole-asset instance, không nhân đôi cặp, không cắt mesh hoặc dùng negative scale tạo bên đối diện. Nhãn “pair” trong inspector chỉ hiện với hash đã audit; asset khác hiển thị whole-asset assembly.

## Coordinate frame

Lưu attachment trong `vehicle-source-root-v1`, ngay trước orientation/normalization xe. TTX dùng raw GLB gốc, không đưa model đã sphere-normalize của product viewer vào assembly.

```text
world / camera / display grid + display axes
  common vehicle display matrix N = Tnormalization × Suniform × Rvehicle
    raw vehicle GLB scene
    attachment: Tposition × Rquaternion × Suniform
      one raw TTX GLB scene (source pivot retained)
```

`N` được tính bằng `vehicleDisplayFrame234` từ bounds của xe sau orientation, giữ cố định khi phụ tùng di chuyển/scale. `s=4/max(orientedSize)`, translation `[-centerX*s,-minY*s,-centerZ*s]`. Published V2 hiện rotation `[0,0,0]`, `s=2.1022502854187475`, translation `[-0.00979964066,2.00087982120,0.00641392978]`.

Xe và phụ tùng chỉ qua cùng `N` một lần; profile không lưu world/camera transform. Position là scene units của source xe, không mm/cm. Rotation UI là XYZ degrees, profile là quaternion `[x,y,z,w]` normalized/canonical. Scale là một số dương hữu hạn, không kéo giãn từng trục. Pivot cố định `part-source-origin-v1` được ghi rõ, chưa có pivot authoring tùy ý.

Default position zero / quaternion identity / scale one chỉ là điểm bắt đầu **uncalibrated**, có thể chồng lên xe, không phải tọa độ lắp. Dùng Ghost vehicle hoặc Focus part để bắt đầu hiệu chuẩn. Không suy ra tỷ lệ vật lý từ bounding box/normalization. Các view Whole vehicle/Reset camera chỉ fit xe; Focus part fit attachment, không thay transform.

## Profile schema và phiên chỉnh sửa

Schema v2 có: vehicleId/productId/slotId, exact vehicle/product binding (URL, SHA-256, orientation/category), coordinateFrame/scene units, display space + normalization/orientation revisions, attachment position/quaternion/uniform scale, partInstance whole-asset/count1/source pivot, stock classification/hash-scoped node refs, calibrationStatus/review/notes và physicalCompatibility=`not-assessed`.

- Trạng thái `uncalibrated → draft → reviewed`; review chỉ là hình ảnh. Cần note người vận hành nhập, chỉnh transform sẽ trở về Draft.
- Stock refs là glTF node index + vehicle hash, không runtime UUID. Node phải tồn tại đúng một lần trong context. Asset merged hiện có refs rỗng; không import claim separable/node0 để ẩn cả xe.
- Import kiểm tra toàn bộ key/schema/ID/URL/hash/revision/frame/node refs/quaternion/scale trước apply. Unknown fields/script/arbitrary URL/NaN/Infinity/scale âm bị từ chối. Sai profile giữ nguyên draft.
- File import tối đa 128 KiB; kết quả đọc async bị bỏ nếu workspace/owner/context đã đổi. Numeric field cũng remount theo actual binding để không đưa text đang nhập ở asset cũ sang asset mới.
- Focus/blur ô số không tạo sửa đổi, không làm tròn tọa độ có độ chính xác cao. Escape hủy text chưa commit.
- History tối đa 60 bước, detached snapshots; begin/preview*/commit cho một lần kéo, cancel hoàn tác gesture. Import, reset và numeric edit có Undo. Không localStorage, Saved Builds hoặc publish.

## Sử dụng

1. Chạy API/frontend như hiện có, đăng nhập Admin, mở `/admin/mount-calibration?source=local` để dùng V2 gốc hoặc menu Mount calibration rồi chọn Vehicle model source. PC/laptop dùng cùng Atlas sẽ dùng chung tài khoản; chưa xác minh trực tiếp môi trường PC trong phiên này.
2. Đợi kiểm tra URL/bytes/hash và hai GLB được chuẩn bị. Asset/network/WebGL lỗi có thông báo và Retry; catalog/manifest lỗi có Reload.
3. Chọn Move / Rotate / Scale. Kéo gizmo hoặc dùng Position/Rotation/Uniform scale. Khi kéo, Orbit bị khóa; kết thúc/hủy/blur/ẩn tab khôi phục camera đúng trạng thái.
4. Orbit/zoom ngoài gizmo, dùng Whole vehicle/Left/Right/Rear/Focus part/Reset camera. Reset camera không sửa attachment; Reset attachment có Undo.
5. Show TTX, Ghost vehicle, Display grid/axes là tùy chọn hiển thị. Ghost dùng material clone owned, không sửa material GLB gốc.
6. Export JSON trước khi rời workspace. Import chỉ áp sau validate. Review note + Mark visually reviewed chỉ khi người vận hành đã tự kiểm tra vị trí hiển thị; không được dùng làm xác nhận lắp ngoài đời.

W/E/R đổi mode, F focus part, Home overview, Ctrl/Cmd+Z Undo và Shift+Z/Y Redo, Escape hủy drag. Phím tắt chỉ hoạt động khi focus trong workspace, không nhập input/textarea/select/contenteditable. Desktop có inspector bên phải; mobile panel thu gọn, input 16px và có điều khiển số thay thế thao tác drag.

## Ownership và lifecycle

Một R3F Canvas demand, một camera owner; không renderer/RAF thứ hai. Mode/input/ghost không reload asset hoặc tạo renderer mới. Retry là thao tác tạo lại renderer có chủ ý sau lỗi. Không autoplay camera khi hiệu chuẩn; reduced motion dùng cùng view tức thời.

Loader scoped giữ đúng policy: vehicle ≤128 MiB; product AI ≤64 MiB, decoded≤256 MiB, vertices≤2M, triangles≤1.5M. Không thay giới hạn global. Chặn external buffers/images, arbitrary paths và redirects; bounded stream/timeouts, nhận diện LFS pointer và 404. Hash lấy từ bytes thực, không dùng tên file thay hash.

Decoded GLTF thuộc riêng workspace; ghost clones được restore/dispose trước khi dispose scene gốc; resource dispose idempotent; kết quả tải cũ/unmount bị bỏ và giải phóng. Cleanup controls/gizmo/listeners/observer/environment, khóa input khi dialog/tab hidden/offscreen. Không dispose resource mượn từ Studio/Build.

## File tạo/sửa

Thêm:

- `shared/mount-calibration242.mjs`.
- `frontend/src/experience/mountCalibration242/MountCalibration242.jsx`.
- `frontend/src/experience/mountCalibration242/calibration-ui242.logic.mjs`.
- `frontend/src/experience/mountCalibration242/mount-calibration242.css`.
- `frontend/src/experience/mountCalibration242/CalibrationScene242.jsx`.
- `frontend/src/experience/mountCalibration242/scene242.logic.mjs`.
- `tests/mount-calibration242.test.mjs`, `tests/mount-calibration242-scene.test.mjs`, `tests/mount-calibration242-ui.test.mjs`.
- Báo cáo này.

Sửa duy nhất file integration cũ `frontend/src/shop/admin/AdminLayout.jsx`: lazy route và menu item dưới gate hiện có. Không sửa Studio/Build/commerce/auth/backend, GLB hoặc package/lock. Sau yêu cầu tạo Admin mới của người dùng, đã tạo đúng một tài khoản thật và cấp Admin, cùng các thao tác session đăng ký/đăng nhập/thu hồi cần thiết. Không seed/migration hoặc sửa catalog/order/garage/publication trên Atlas. Không commit/push/reset/stash/switch branch.

## Kiểm chứng đã chạy

| Nhóm | Kết quả |
| --- | --- |
| Profile/schema/history tests | 32 tests mới, đạt; có mismatch ID/hash/revision, atomic import, sparse/NaN/scale/quaternion, full export/import, Undo/Redo/reset/gesture, no mutation. |
| Scene helper tests | 10 tests, đạt; dùng geometry/GLB fixture cho path/limits/LFS/404/cancel/ghost/one-common-frame/uniform scale/camera bounds. Không phải browser acceptance với NVX thật. |
| UI logic tests | 7 tests, đạt; published override/explicit local selection/no arbitrary URL, current real SKU selection contract, numeric no-op precision, Euler↔quaternion và shortcuts. |
| Kết hợp mounting234 cũ | 90/90 đạt, 0 skip (gồm 41 case foundation cũ). |
| Regression source + production build | `node tools/verify-premium24.mjs`: 1691/1691 đạt, build đạt 6,29s. Sau source choice và CSS mobile cuối, production build đạt **6,82s**; log final tại `test-results/mount-calibration242/build.log`. |
| Real bytes, không render | Scoped preflight của local V2 129 MB và TTX 43 MB đạt; public published V2 bytes/hash/bounds được audit mới. |
| Review source | Frontend/UI–UX/web-interface và Three/R3F/resource/lifecycle review; đã sửa sparse vectors, untouched numeric rounding, stale import và focus-whole-vehicle. Không coi việc đọc skill là chạy script hoặc đo FPS. |
| Browser quyền Admin | Gate từ chối customer đúng; sau yêu cầu mới, tài khoản Admin thật được tạo/cấp quyền và đăng nhập thành công, dashboard đọc 23 sản phẩm. Không tạo tài khoản fixture. |
| Browser GLB/gizmo | Hai GLB thật cùng scene; thử kéo Move (X≈0,414568), Rotate (Z≈−44,233151°), uniform scale (≈1,499775). Xe không quay theo lúc kéo. Một Undo của drag Move trở về identity và Undo disabled, Redo khôi phục. Đây là pose thử, không phải mounting profile được review. |
| Browser camera/profile | Rear → Reset camera giữ nguyên các field transform. Numeric scale 0,3 sync scene; Ghost vehicle hiển thị clone trong khi TTX giữ vật liệu gốc. Reset attachment về identity/uncalibrated. |
| Browser import/export | Export đúng schema2/URL/hash thực; sai vehicle hash bị từ chối, draft giữ nguyên; reset rồi import hợp lệ khôi phục. Export sau roundtrip và focus/blur ô số khớp **nguyên văn JSON** trước đó, giữ full precision. |
| Browser lifecycle/nguồn/mobile | Thoát sang Studio ready với một Canvas; Build render nguồn V3 đã publish nhưng nội dung sai semantic như ghi chú trên; mở lại workspace vẫn một Canvas. Chọn local V2 render được xe gốc cùng TTX; export local xác nhận đúng SHA `57040...` và part `79d2...`, whole-asset/count1. Mobile390px không tràn ngang (`clientWidth=scrollWidth=375`), inspector ban đầu thu gọn và có thể mở; computed font input/select đã đạt 16px sau override CSS scoped. |

Lệnh chạy lại từ application root:

```powershell
node --test tests/mount-calibration242.test.mjs tests/mount-calibration242-scene.test.mjs tests/mount-calibration242-ui.test.mjs tests/nvx-mounting234.test.mjs
node tools/verify-premium24.mjs
npm run build --workspace frontend
```

Log/backup/evidence: `test-results/mount-calibration242/`, không commit. Không có FPS/GPU benchmark; build PASS không xác nhận fit hoặc độ chính xác tọa độ lắp.

Quyền Admin được cấp bằng `backend/commerce/admin/grant.mjs` sau yêu cầu rõ ràng của người dùng. Script đổi role và **thu hồi các session của chính tài khoản đó**, sau đó đăng nhập lại đã thành công. Tài khoản chung nằm trong Atlas; không copy credential vào Git hoặc tạo lại ở máy kia. Các JSON profile trong test-results chỉ là bằng chứng kiểm thử, không được đăng ký làm calibrated/reviewed.

Chưa benchmark FPS/GPU/heap, chưa fault-inject context loss/slow-load/API failure qua browser hoặc hủy giữa một gesture đang giữ pointer. Các phần đó có source/helper/history checks, không được coi là runtime acceptance. Chưa kiểm chứng PC vật lý; viewport mobile dùng trên trình duyệt laptop. Không tự bấm Mark visually reviewed cho pose thử.

Ảnh/JSON thật: `desktop-initial.jpg` (published), `desktop-local-draft.jpg` (local V2, pose thử scale0,3/Draft), `local-vehicle-original.jpg` (tắt TTX để kiểm tra xe gốc), `build-smoke.jpg`, `profile-export.json`, `profile-roundtrip.json`, `profile-local.json`. Hai JSON published trước/sau roundtrip khớp nguyên văn. Tất cả thuộc test-results, không registry hoặc MongoDB. Reset attachment về Uncalibrated sau nghiệm thu và trả viewport về mặc định trước khi bàn giao.

## Giới hạn và điều kiện Step 23.4B

- Current stock vẫn nguyên trong xe; chưa replacement hoặc auto Add to Build, chưa animation tháo/lắp.
- TTX vẫn cả cặp một mesh; chưa thể scale/đặt hai bên độc lập mà không có asset tách đã được duyệt. Không tự cắt geometry.
- Chưa có vị trí lắp được người dùng hiệu chuẩn và review; default identity vẫn uncalibrated. Không đăng ký tọa độ ví dụ làm calibrated.
- Chưa có số đo thực, tâm/trục lỗ bắt, chiều dài, hành trình, clearance hoặc fitment cơ khí. Reviewed chỉ là hình ảnh.
- Trước 23.4B: nghiệm thu workspace với đúng hai hash, người vận hành export profile đã kiểm tra hình ảnh, có stock geometry/selector được tách và xác nhận đúng bộ phận, quy ước scale/pivot/mount evidence rõ ràng, và kiểm tra runtime/cancellation/performance trên thiết bị mục tiêu. Không dùng node0 của xe merged làm selector replacement.

## PC/laptop

Review/stage các source/test/doc cụ thể của bước này cùng các dependency foundation chưa track từ bước trước; không `git add .` mù quáng, không commit `.env`, test-results hoặc backup. Sau review/test/commit trên máy hiện tại, push branch `feat/story-shop-ultra-pc-20261026`. Máy kia bảo toàn local edits, đúng branch và working tree sạch rồi `git fetch origin` / `git pull --ff-only origin feat/story-shop-ultra-pc-20261026`, sau đó `git lfs pull` nếu thiếu GLB. Không reset/force khi divergent. JSON calibration là file export riêng, chưa được sync vào Atlas hoặc repository tự động.
