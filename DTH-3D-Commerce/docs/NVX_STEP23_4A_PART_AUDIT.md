# NVX Step 23.4A.1 — Part Architecture Audit & Mounting Foundation

Ngày kiểm tra: **04/11/2026**, Asia/Saigon. Đây là bước audit hình học/mounting theo brief mới; không chạy lại Cloud Product Sync có cùng số bước trong lịch sử.

## 1. Executive technical summary

**Kết luận B — MERGED qua scene hierarchy cho NVX V2 hiện có.** Toàn bộ model chỉ có một node không tên → một mesh → một primitive tam giác → một material. Không có đơn vị geometry riêng để ẩn phuộc zin. Ẩn node/mesh/primitive duy nhất sẽ ẩn cả xe. V3 có cùng giới hạn.

Kết luận này không chứng minh mọi tam giác được hàn thành một connected component, không xác định tam giác nào là phuộc, và không xác nhận độ đúng cơ khí. Công cụ máy giữ `mechanicallyVerified:false`/`INDETERMINATE`; quyết định B trong báo cáo này nói về **khả năng tách qua hierarchy hiện tại**, dựa trên `single-primitive-whole-scene`.

Đã triển khai công cụ audit offline, schema mounting không có tọa độ giả, phép chuyển source/display space và controller gắn/tháo dành cho bước tiếp theo. Controller chưa nối vào route hoặc thay hành vi Shop/Studio. Không có hiệu chuẩn production hay thay phuộc thật được công bố.

GLB, material, Admin presentation, API/auth, giá/stock/cart và Atlas không được sửa. Không seed, migration, ghi MongoDB, sửa `.env`, đổi package/lock, branch, commit, push hoặc reset Git.

## 2. Repository và code đã kiểm tra

- Git root thực: `E:/Greenwich/Final-Project_GRE/DTH-SHOP`.
- Application root: `DTH-3D-Commerce/` bên trong Git root.
- Branch thực: `feat/story-shop-ultra-pc-20261026`.
- HEAD: `c9cad73` — merge PR #12, `feat/atlas-catalog-sync-20261102`.
- Có nhiều chỉnh sửa tracked/untracked từ các bước Gallery/Premium/Rim–Tire trước đó; được giữ nguyên. Tác vụ này chỉ thêm module/tool/test/doc và thêm hai suite vào verifier hiện có.
- Phiên bản lockfile: Three.js **0.184.0**, Fiber **9.8.1**, drei **10.7.8**, React **19.2.8**, Vite **6.4.3**. Không sao chép API r186/WebGPU từ ví dụ skill.

Đã đọc `AGENTS.md`, README, tài liệu NVX/Spatial23/Rim–Tire và các module:

| Nhóm | File kiểm tra |
| --- | --- |
| Viewer NVX cũ | `frontend/src/shop/discovery174/nvx3d/NVXBuildStudio.jsx`, `NVXStage.jsx`, `createNVXStage.mjs`, `nvx3d.logic.mjs`, `nvx3d.config.mjs` |
| Route đang hoạt động | `frontend/src/shop/discovery174/DiscoveryPage.jsx`, `frontend/src/experience/commerce23/BuildExperience23.jsx`, `VehicleStage23.jsx`, `Studio23.jsx`, `frontend/src/shop/home/HomePage.jsx` |
| Hotspot/camera hiện tại | `frontend/src/experience/hotspots233/VehicleStage233.jsx`, `createHotspotStage233.mjs`, `hotspots233.logic.mjs`, `frontend/src/experience/commerce23/spatial23.logic.mjs` |
| Product display | `frontend/src/experience/gallery24/StudioGallery24.jsx`, `frontend/src/experience/galleryDemo24/GalleryStage24.jsx`, `gallery-demo.logic.mjs`, `frontend/src/shop/product/3d/profileTransform.mjs`, `useProfiledModel.js`, presentation adapter 21 |
| Asset publication | `frontend/src/shop/discovery174/nvx3d/usePublishedNVXModels.mjs`, `frontend/src/shop/account22a/account22a.logic.mjs`, backend AI-asset manifest/published-file mapping |
| Domain/audit cũ | `shared/domain.mjs`, `shared/categories.mjs`, `shared/nvx.mjs`, `tools/audit-nvx23.mjs`, `frontend/src/experience/world/apexRig.mjs` |

Luồng Build hiện tại là `DiscoveryPage → commerce23/BuildExperience23 → VehicleStage23 re-export → hotspots233/VehicleStage233 → createHotspotStage233`. Các file NVXBuildStudio/NVXStage là hạ tầng cũ, không phải entry mặc định của Build hiện nay. Studio `/` dùng Gallery24; `?studio=precision` giữ Studio23 dự phòng.

Hiện Inspect sản phẩm trong Build tháo vehicle stage và mở PartPreview riêng; chưa có co-rendered assembly. Hotspot chỉ là surface/camera annotation, không phải mount transform. Apex rig chỉ hỗ trợ đúng demo Apex với fingerprint riêng; không dùng connected-component classification hay các offset của nó cho NVX/TTX.

## 3. GLB thật tìm thấy

Tất cả đường dẫn dưới đây tính từ application root. Ba file là **GLB version 2 thật**, không phải Git LFS pointer. Header length đúng file, glTF asset version `2.0`, generator `pygltflib@v1.16.5`, JSON và BIN hợp lệ trong phạm vi parser offline.

| Asset | Đường dẫn | Bytes | POSITION vertices | Tam giác |
| --- | --- | ---: | ---: | ---: |
| NVX V2 | `frontend/public/models/nvx/nvx-v2.glb` | 129,837,080 | 2,250,977 | 4,110,220 |
| NVX V3 | `frontend/public/models/nvx/nvx-v3.glb` | 56,563,680 | 907,277 | 1,698,814 |
| TTX candidate | `frontend/public/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb` | 43,225,496 | 629,838 | 1,181,746 |

SHA-256 kiểm tra trước và sau triển khai trùng nhau:

```text
V2  57040fe8e411c8f4338ddd2672d3842f0cfb01d863ba04bd02f252031e74cadc
V3  ac4f05734647df3f514fdf6c5753e3f0087ca062ce414666513c5bf93898ca99
TTX 79d2b2bdf8824a775e5cc8adffce313e2a687fb864fcef540c09eb084d536e98
```

V1 không có trong local config (`file:null`), không lấy model V3 thay. Ba asset yêu cầu audit đều có, không cần LFS pull để đọc chúng. Nếu máy khác thiếu hoặc chỉ có pointer, chạy từ app root:

```bat
git lfs pull --include="DTH-3D-Commerce/frontend/public/models/nvx/*.glb,DTH-3D-Commerce/frontend/public/models/ai-products/0262d0bd-690d-439e-8132-8b07088abadb.glb"
```

Published manifest có quyền override model local trong app. File state mặc định `data/ai-assets/generated/.dth-ai-studio/state.json` không tồn tại tại lúc audit. Công cụ không đọc credentials hoặc thư mục tùy biến từ `.env`; vì vậy `publication.overridesVerified:false`. Không suy ra rằng Atlas/API đang dùng đúng local asset chỉ từ file config. Browser Flow lần này dùng fallback local khi manifest API tại cổng 5000 không kết nối được; không khởi động API để vượt giới hạn này.

Số 23 sản phẩm/3 xe trong brief là bằng chứng migration lịch sử do người dùng cung cấp, không được tái xác nhận từ Atlas trong audit này. ID preview `asset-ohlins-ttx` không phải SKU catalog được chứng thực.

## 4. Hierarchy, geometry và material

Cả ba asset có cấu trúc:

```text
scene 0
└─ node[0], name="", identity local/world matrix
   └─ mesh[0], name=""
      └─ primitive[0], mode=TRIANGLES, indexed
         └─ material[0], name="", OPAQUE, doubleSided=true
```

- Một mesh, một primitive và một material cho mỗi file; không có stock-suspension group, material group hoặc nhãn semantic riêng.
- Có POSITION/NORMAL/UV và ba JPEG nhúng; không tải texture ra ngoài khi audit.
- Không có skin, animation, compression extension hay metadata semantic giúp xác nhận bộ phận ở các file này.
- Đã quét toàn bộ indices: không có index vượt POSITION; mọi POSITION đều được tham chiếu. Bounds tính từ vertex được tham chiếu khớp accessor min/max cho ba asset này.
- Các tên node/mesh candidate suspension là **0**. Với asset khác có tên `shock`/`ttx`, utility chỉ ghi name match là bằng chứng yếu, không tự phân loại bộ phận.

JSON đầy đủ: [NVX_STEP23_4A_ASSET_AUDIT.json](NVX_STEP23_4A_ASSET_AUDIT.json). Kết quả này là audit tĩnh có giới hạn, không phải chứng chỉ glTF conformance hoặc nhận dạng tam giác theo giải phẫu.

## 5. Tọa độ và normalization

**Đo từ bytes, chưa xác minh là kích thước vật lý:**

| Asset | Source dimensions X/Y/Z | Scale viewer `4/largest` | Display dimensions X/Y/Z |
| --- | --- | ---: | --- |
| V2 | 1.898458 / 1.121589 / 0.728197 | 2.1069731285 | 4 / 2.363158 / 1.534291 |
| V3 | 1.902032 / 1.109189 / 0.737210 | 2.1030140201 | 4 / 2.332640 / 1.550363 |
| TTX | 0.994713 / 1.759287 / 1.901568 | Không dùng làm mounting scale | Không coi công thức viewer là hiệu chuẩn sản phẩm |

Theo [glTF specification của Khronos](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), convention là hệ thuận tay phải, Y hướng lên và đơn vị chiều dài mét. Convention của định dạng không chứng minh asset được dựng đúng tỷ lệ thực. Chưa có đo đạc kiểm chuẩn hoặc khoảng cách tâm lỗ bắt phuộc; không đổi các giá trị trên thành mm trong dữ liệu mounting.

Viewer hiện tại áp dụng orientation XYZ rồi lấy AABB, sau đó:

```text
s = 4 / max(orientedSize)
t = [-center.x*s, -min.y*s, -center.z*s]
N_vehicle = T(t) * S(s) * R_XYZ(orientation)
```

V2 hiện `rotation=[0,0,0]`, `t=[0.00268639697, 1.17965843287, 0.02088748680]`. Đây là translation để center/ground model, không phải tọa độ mount. Utility phân biệt bounds của vertex được index dùng với AABB framing của Three.js; hai cách có thể khác ở asset xoay hoặc chứa vertex không dùng.

Mounting mới lưu `vehicle-source-root-v1`: frame identity trước orientation/normalization và trước transform tác giả của raw glTF scene. Hotspot cũ lưu `normalized-stage-4-v1`. Có phép chuyển thuận/nghịch được kiểm thử; không copy trực tiếp điểm hotspot làm mount hoặc coi surface normal là trục lỗ bắt phuộc.

Product Gallery có normalization khác (sphere radius 1.35 và Admin presentation). Không gắn root đã qua Gallery normalization vào vehicle-normalized root. Chain dự kiến:

```text
vehicleDisplay * mountInVehicleSource * productMountLocal * originalProductScene
```

Base vehicle bounds/normalization được giữ cố định khi thêm sản phẩm; không fit lại cả assembly rồi làm xe co giãn theo phụ tùng.

## 6. Phát hiện riêng về Ohlins TTX

File TTX là một mesh/primitive nguyên khối. Ảnh render có sẵn `frontend/public/previews/gallery24/ohlins-ttx.png`, được manifest gắn với đúng SHA ở trên, cho thấy **hai phuộc trong cùng asset**. Đây là quan sát từ ảnh render đã có, không phải một lần render TTX mới trong audit này.

Vì vậy binding ban đầu chỉ hỗ trợ `assetScope:'whole-asset'` tại slot assembly `suspension-rear`. Không nhân đôi toàn bộ cặp tại hai mount trái/phải, không tự cắt một phuộc khỏi mesh. Trục dài nhất của AABB TTX là Z; điều đó không chứng minh trục liên kết cơ khí của từng phuộc. SKU bán lẻ là chiếc/cặp, điểm bắt trên/dưới, tâm-trục, độ dài hành trình, clearance và tỷ lệ thực đều chưa xác minh.

## 7. Quyết định khả năng thay phuộc

| Mức đánh giá | Kết luận | Căn cứ / giới hạn |
| --- | --- | --- |
| Thay bằng cách ẩn node/mesh/primitive riêng trên V2 | **B — MERGED; bị chặn** | Đơn vị render duy nhất chứa toàn xe; không có selector phuộc riêng |
| Phân vùng đúng tam giác phuộc / welded connectivity | **C — INDETERMINATE** | Chưa nhận dạng/duyệt phân vùng anatomy; không chạy remesh hoặc geometric splitting |
| Overlay nguyên asset TTX | Có thể làm authoring preview sau hiệu chuẩn | Không đồng nghĩa đã tháo phuộc zin hoặc có fit vật lý |
| Thay thật đáng tin cậy | Chưa sẵn sàng | Cần asset xe phân đoạn được kiểm chứng và bộ bằng chứng mount/scale |

Controller từ chối hide toàn bộ mesh xe, root xe, node ngoài scene và cả trường hợp “một mesh xe hiển thị + một helper mesh đang ẩn”. Tính baseline visibility từ trạng thái trước attachment để việc replace→replace không làm sai chốt chặn này.

## 8. Mounting architecture đã xây

`shared/mounting234.mjs` cung cấp:

- Registry vocabulary cho suspension, **rims và tires riêng**, brakes, exhausts, mirrors. Slot chỉ là tên hỗ trợ authoring, không khẳng định vị trí đó tồn tại trên mọi NVX.
- `createVehicleAssembly234`: binding xe và danh sách mounts rỗng.
- `createMountDraft234`: binding xe/sản phẩm, category-to-slot mapping, `mountFrame:null`, `partTransform:null`, `calibrationStatus:'unverified'`.
- Binding theo ID, exact asset URL/revision, SHA-256 và orientation xe; sai model/version/hash/URL/rotation làm calibration không dùng được.
- Position/rotation XYZ radians/uniform visual scale được kiểm tra hữu hạn; không scale âm/nonuniform để ép fit. Giá trị số chỉ được lưu khi tác giả tạo draft; chưa review không được tự mang trạng thái reviewed.
- Review cần người kiểm tra, tham chiếu bằng chứng và timestamp. Không có trạng thái chung “complete” gom các khái niệm khác nhau.
- Demo catalog compatibility lấy từ kết quả hiện có, visual calibration là unverified/draft/reviewed, physical compatibility luôn `not-assessed` trong schema bước này. Visual review không được tự cấp chứng nhận vật lý.
- Stock isolation là indeterminate/merged/separable. Chỉ separable có evidence và allowlist node indices mới đủ điều kiện xin chế độ replacement.

`frontend/src/experience/mounting234/assembly234.mjs` là adapter cho renderer hiện có ở bước sau:

- Hàm source/display matrix dùng đúng công thức hiện tại và có inverse; chặn ma trận singular/nonfinite, tọa độ overflow và frame đã bị normalization thêm lần nữa.
- Controller nhận frame identity, binding xe và loader raw-product **độc quyền sở hữu**. Không tạo renderer, camera, RAF, loader network hoặc global scene cache.
- Overlay giữ nguyên stock. Replacement còn kiểm tra allowlist qua resolver glTF node associations, tỷ lệ bao phủ mesh hiển thị và quan hệ ancestor/descendant; không tìm node bằng substring tên.
- Group mount/local-part sở hữu transform mới; original product transforms, geometry và materials không bị viết lại.
- Abort/epoch loại kết quả cũ khi đổi sản phẩm/xe; late parse do loader độc quyền sở hữu được dispose một lần. Không steal/dispose scene đã có parent, scene xe hoặc alias của attachment đang dùng.
- Remove/reset/dispose khôi phục visibility cũ, tách attachment và gọi disposer của asset do loader cấp; không dispose borrowed vehicle/camera/renderer. Loader tương lai phải parse asset mới, không clone scene dùng chung geometry/material rồi gọi là exclusive.

Adapter này **chưa được import vào route production**. Bằng chứng runtime hiện tại chỉ áp dụng viewer cũ đang chạy; bằng chứng attachment là unit tests với Three.js objects tổng hợp, không phải TTX đã được lắp.

## 9. File tạo/sửa và công cụ chạy lại

Tạo mới:

1. `tools/lib/glb-part-audit.mjs`
2. `tools/audit-nvx-parts.mjs`
3. `shared/mounting234.mjs`
4. `frontend/src/experience/mounting234/assembly234.mjs`
5. `tests/nvx-part-audit.test.mjs`
6. `tests/nvx-mounting234.test.mjs`
7. `docs/NVX_STEP23_4A_ASSET_AUDIT.json`
8. `docs/NVX_STEP23_4A_PART_AUDIT.md`

Sửa `tools/verify-premium24.mjs`: chỉ thêm hai suite mới vào allowlist hiện có. Không sửa engine, UI, backend hoặc schema MongoDB.

```bat
node tools/audit-nvx-parts.mjs
node tools/audit-nvx-parts.mjs --output test-results/nvx-part-audit/my-new-report.json
node tools/audit-nvx-parts.mjs --asset frontend/public/models/my-model.glb
```

Đường dẫn tính từ app root, chạy được trên Windows. Output phải là file JSON mới dưới `test-results/nvx-part-audit/`; không overwrite, không theo symlink/junction để đọc asset ngoài project hoặc ghi report sang chỗ khác. Không fetch external texture/buffer. Utility có giới hạn bytes, JSON, chunks, graph depth, accessors và lượt quét vertex/index; compressed/sparse/morph/skin/instancing không được gắn nhãn measured-complete khi chưa evaluate.

## 10. Kiểm thử đã thực thi

| Lệnh / bằng chứng | Kết quả |
| --- | --- |
| `node --test tests/nvx-part-audit.test.mjs` | **45/45** pass, không skip; header/chunk/LFS/missing, ranges, indices, transforms, hierarchy và work-budget/path guards |
| `node --test tests/nvx-mounting234.test.mjs` | **41/41** pass, không skip; trạng thái chưa review, asset identity, conversion, ownership/cancellation, visibility/whole-vehicle guard |
| `node tools/audit-nvx-parts.mjs --output test-results/nvx-part-audit/report-20261104-root.json` | Ba file audited; hash khớp kiểm tra ban đầu; report được sao vào docs |
| `node tools/verify-premium24.mjs` | **1.691/1.691** pass; source/import check pass; production build được ghi ở dòng nghiệm thu bên dưới |

**Build nghiệm thu:** `npm run build --workspace frontend` qua verifier đạt; Vite báo **built in 24.94s**. Không có runtime renderer/route import mới trong bundle từ mounting adapter chưa tích hợp.

Log: `test-results/nvx-part-audit/full-verification-final.log`. Các lần kiểm thử đầu có phát hiện lỗi trong code mới, đã sửa và chạy lại; chỉ lượt cuối thành công được dùng cho kết quả nghiệm thu.

Browser thật dùng app hiện có ở cổng tạm **5181, Flow/no database**, fixture login công khai. NVX V2 ready → V3 ready → đổi nhanh V2/V3/V2 → V2 ready. Quan sát một Canvas và ảnh model tương ứng; browser console không có error trong phiên test. Manifest API cổng 5000 trả lỗi kết nối ở Vite proxy, nên không dùng phiên này làm bằng chứng published API/Atlas; fallback local đúng contract có sẵn.

Ảnh và DOM observations: `test-results/nvx-part-audit/browser/v2-ready.png`, `v3-ready.png`, `v2-after-rapid-switch.png`, `observations.json`. Không có thay đổi layout trong bước này nên không thực hiện lại audit UI mobile. Không đo GPU memory/FPS hoặc stress test dài; một Canvas không chứng minh không rò VRAM. Ownership tests kiểm tra disposer/visibility/late result bằng fixture CPU. Chưa có calibration thật để test attachment GLB trên xe.

Server tạm đã dừng sau kiểm tra; không giữ cổng 5173/5000 của người dùng.

## 11. Blockers và rủi ro còn lại

1. Xe V2/V3 nguyên khối: không có stock suspension isolation đáng tin cậy.
2. TTX nguyên cặp, chưa có mount centres/axis/scale và SKU-unit evidence; không gắn được từng bên riêng qua hierarchy.
3. Asset nguồn không có bằng chứng đo thực, alignment, clearance, travel hay fitment cơ khí.
4. Published override và mapping SKU Atlas hiện hành chưa được xác minh trong audit offline. Mỗi lần export calibration cần chụp đúng identity của model thực đang load, không dùng hash local để nhận một URL published khác.
5. V2 khoảng 123.8 MiB và 4.11 triệu tam giác; V2 + TTX khoảng 5.29 triệu tam giác trước các pass render. Đây là số lượng geometry, không phải benchmark FPS. Cần benchmark loader/GPU trên PC/laptop trước quyết định tối ưu, không tự remesh/compress.
6. Controller chưa tích hợp runtime: loader phải cung cấp hash được kiểm chứng, raw scene độc quyền, node associations và bộ mesh picking/occlusion riêng cho attachment. `current.meshes` của engine hiện tại chỉ chứa xe, không tự bao gồm bộ phận mới.

## 12. Trình tự chính xác cho Step 23.4A.2

**23.4A.2.0 — Asset Preparation & Mount Evidence** là việc cần làm đầu tiên: có model NVX V2 được tác giả tách stock rear-suspension thành node/mesh riêng, giữ file gốc và xuất file mới; đồng thời xác nhận TTX là cặp hay từng chiếc, lấy source/mount-centre/axis và số đo kiểm chứng. Chạy lại audit, review selector riêng và bind hash mới. Nếu chưa có asset như vậy, chế độ replacement phải tiếp tục bị chặn.

Sau đó triển khai calibration local trong **chính vehicle stage hiện tại**, dưới Admin + cờ editor có sẵn/mới, không tạo renderer thứ hai:

1. Chọn đúng xe và sản phẩm; capture URL/revision/hash/rotation thực tế, giữ nguyên các guard phiên/vehicle hiện có.
2. Load raw product vào identity source frame của xe với disposer/epoch riêng. Giữ stock trong draft overlay và hiển thị rõ chế độ authoring.
3. Chỉnh Position X/Y/Z, Rotation X/Y/Z radians và uniform Scale trong scratch draft; khi nhìn hotspot thì đổi source/display bằng matrix rõ ràng.
4. Dùng camera/orbit/zoom hiện có và input/modal/reduced-motion gates. Không thêm loop camera hay rescale base vehicle sau khi gắn part.
5. Review mount centres, axes, alignment, clearance từ nhiều góc; export draft không đồng nghĩa reviewed. Với nguyên cặp TTX, kiểm tra cả cặp như một assembly.
6. Chỉ cho stock/aftermarket toggle có ẩn stock khi model phân đoạn và node allowlist đã review; giữ chốt chống ẩn cả xe tại runtime.
7. Export JSON bằng schema/validator mới, giữ bằng chứng reviewer/hash; importer kiểm tra identity hiện tại trước preview. Không lưu Atlas ở bước local-authoring này.
8. Reset/remove/switch phải hủy việc đang tải, restore visibility và giải phóng đúng tài nguyên. Test abort khi parse, đổi xe nhanh, dialog/input gates, hidden tab, route exit và context loss.
9. Benchmark real V2 + TTX, GPU memory/FPS trên PC/laptop; sau đó mới đề xuất tối ưu có sự đồng ý riêng.

Sync PC–laptop: review `git status`, `git diff` và cả module untracked Gallery/Premium từ phiên trước trước khi stage; chỉ commit/push khi người dùng thực hiện/chấp thuận. Trên laptop có worktree sạch/các sửa đổi đã lưu, dùng `git pull --ff-only origin feat/story-shop-ultra-pc-20261026`, LFS pull nếu thiếu model rồi chạy verifier. Git không chuyển dữ liệu Atlas; bước này không cần database migration hoặc dependency install.

Hướng dẫn skill Three.js/3DViz được đọc để định hướng transform, ownership và bằng chứng; không tuyên bố đã chạy các script skill hoặc có chứng nhận vật lý.
