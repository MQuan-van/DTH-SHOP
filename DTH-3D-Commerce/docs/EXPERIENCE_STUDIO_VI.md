# Experience Studio 01 — Cinematic Home có thể vận hành

Nhánh `feat/experience-studio` được tạo từ Cinematic Home `d309d7a`, kế thừa main `5327502` đã có Admin/Support. Không merge/deploy tự động, không truy cập MongoDB trên máy người dùng. Dự án vẫn React/Vite, R3F/Three.js và Express/MongoDB. Không cần một bộ cài ngoài.

## Phần mới

- Home dùng một Canvas cho bốn chương, scroll gốc, camera có ownership Story / Inspect / Returning. Vào Inspect giữ góc đang nhìn. Preset camera có thể bị thao tác kéo của người dùng ngắt; Reset trả camera/model/separation về trạng thái chuẩn.
- Front / Side / Rear / Top, điều khiển hướng ánh sáng, part focus (spring, reservoir, upper mount) và nhãn gắn vào phần hình học tương ứng của Apex. Part focus là giảm độ sáng phần khác, KHÔNG phải X-ray.
- Khả năng assembly vẫn chỉ dành cho GLB Apex đúng dấu hiệu hình học. Model thay thế được căn giữa trong wrapper và không bị áp rig Apex. Các model khác hỗ trợ xoay/zoom; không tạo bộ phận bên trong giả.
- `Admin → Experience`: chọn hero product/preset, chỉnh motion/light/rings/user sensitivity, xem cùng renderer, chọn tám keyframe, kéo góc rồi Capture, chỉnh copy, Save draft / Publish / History / Restore.
- Preview của Admin dùng cùng renderer/camera sampler, nhưng bố cục và viewport Admin không phải bản sao đầy đủ Home. Copy proof chỉ xem chữ; cần mở Home kiểm tra bố cục sau publish.
- Renderer clone material/geometry đúng phạm vi và tạo/hủy rig trong lifecycle (bao gồm React StrictMode). Source GLB, Viewer3D và cấu hình các trang bán hàng khác không bị sửa.

## Giới hạn thẩm mỹ và phạm vi

Không thay model demo low-poly bằng asset photoreal có UV/textures. Đây là bước motion/control/publication, không tuyên bố ảnh sản phẩm chuẩn hãng. Camera macro không tạo thêm chi tiết hình học chưa tồn tại. Chưa có rig editor cho model bất kỳ, placement hotspot tùy ý, X-ray, AR, đồng điều khiển 3D qua chat, global Canvas xuyên route, hay upload GLB từ trang Admin. Part labels hiện là ba anchor Apex cố định, không phải nội dung kỹ thuật hãng.

## 1. Lấy code an toàn (CMD)

Lưu thay đổi local trước. Dừng Vite/backend khi đổi branch, MongoDB có thể giữ nguyên. Không dùng reset --hard, git clean hay đổi remote.

```bat
cd /d "E:\Greenwich\Final-Project_GRE"
git status -sb
git remote -v
git fetch origin
git switch feat/experience-studio
git pull --ff-only origin feat/experience-studio
```

Nếu chưa có local branch và Git không tự tạo: `git switch --track origin/feat/experience-studio`. Nếu diverged/conflict thì dừng, giữ thay đổi và kiểm tra log. Trên máy khác dùng đúng đường dẫn Git root hiện tại.

Tại application root, KHÔNG phải Git root hoặc thư mục backend:

```bat
cd DTH-3D-Commerce
npm ci
npm run check
npm run test:experience
npm run build:flow
npm run dev:flow
```

GSAP đã có trong lockfile. Bản này không thêm thư viện npm mới so với nhánh cinematic-home. PowerShell bị chặn npm.ps1 có thể dùng `npm.cmd`. `.env.local` là cấu hình riêng từng máy, không được push/pull theo repo.

## 2. Xem Home trước, chưa cần DB

`dev:flow` dùng cấu hình bundled. Chưa có thao tác lưu/publish Admin ở Flow mode; không giả quyền admin hoặc giả lưu MongoDB thành công.

Home: cuộn xuống/lên, chọn chương, Inspect → xoay/zoom, Explode, chọn Spring/Reservoir/Upper mount, đổi góc và ánh sáng. Thử Reset, thoát story liên tục, mở Support/vehicle dialog. Cảnh sau dialog không được nhận nhầm thao tác. Motion off/Reduced motion bỏ đoạn scroll dài. Compact vẫn dùng được, chưa là cinematic riêng cho điện thoại.

## 3. Admin chỉnh trải nghiệm

Admin thật dùng API mode và tài khoản có role admin hiện có. Không tạo tài khoản/mật khẩu admin mặc định.

Mở `/admin/experience`.

1. Scene: chọn sản phẩm và preset. Chỉ chọn GLB tự chứa trong `/models/`, chưa hỗ trợ external buffers/images hoặc file trên 16 MiB cho khâu publish này.
2. Chọn một trong tám keyframe. Bấm Inspect / drag, xoay/zoom rồi Capture. Có thể nhập tọa độ trong Camera; khoảng cách/giá trị/path không hợp lệ bị chặn.
3. Điều chỉnh scroll length khác với scroll lag. Return transition là thời gian điều phối trả quyền camera; không phải tốc độ tự quay Product Detail. Maximum separation giới hạn biên độ tách, không là kích thước cơ khí.
4. Play story hoặc kéo timeline để xem. Reduced motion chỉ cho chọn timeline, không tự Play.
5. Copy: sửa label/heading/note. Dùng câu ngắn, không thêm specs không có bằng chứng.
6. Save draft: chỉ lưu bản nháp. Publish Home (xác nhận lần nữa) mới thay bản khách đọc ở lượt tải Home kế tiếp. Trang đang mở không tự đổi góc giữa lúc khách thao tác.
7. History → Restore: tạo publication mới từ bản cũ và thay draft hiện tại; không sửa lịch sử đơn.

Cấu hình trong sessionStorage hỗ trợ phục hồi bản nháp hợp lệ trong cùng tab trong 24 giờ khi browser cho phép. Đây không phải lưu DB. Browser Back không bị hijack; bản draft chưa lưu có thể phục hồi khi trở lại. Trước rời bằng link và đóng tab có cảnh báo. Nếu base revision khác server, Save trả 409; không ghi đè âm thầm.

## 4. Kết nối dữ liệu sau cùng

Dùng database hiện có; không seed lại catalog để dùng Experience.

`backend/.env`: giữ cấu hình đang chạy, URI mặc định:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/dth_3d_commerce
PORT=5000
HOST=127.0.0.1
NODE_ENV=development
```

`frontend/.env.local` (không phải `.env.example`):

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Dừng Flow. MongoDB đang chạy; terminal ở `DTH-3D-Commerce` chạy `npm run dev:api`. Terminal khác cùng thư mục chạy `npm run dev`. Chỉ một API :5000, một Vite :5173; đừng khởi động trùng. Dùng tài khoản admin đã cấp bằng `admin:grant` ở milestone trước.

Collection `store_experiences`, document `_id: "home"`, được tạo ở lần Save draft đầu tiên. Nó chứa revision, draft, published và tối đa 20 bản publication. Public API chỉ trả publication hợp lệ; không trả draft/history/user credentials. Nếu sản phẩm bị ẩn hoặc model thay đổi so với hash lúc xuất bản, Home dùng cấu hình an toàn, không tái áp rig sai.

Lưu → xem Compass document nhưng Home chưa đổi; Publish → F5 Home phải thấy phiên bản mới; Save bản khác → public vẫn bản cũ; Publish rồi Restore → mở Home kiểm tra. Restart API và F5: publication vẫn còn trong MongoDB. Tắt checkbox Cinematic Home rồi Save/Publish để trở lại Home cũ mà không xóa code.

## Schema và cấu trúc

- `shared/experience.mjs`: defaults, presets, dữ liệu schema 1, giới hạn camera/motion, validator dùng chung.
- `frontend/src/experience/motion/`: sampler, signal không setState mỗi frame, scroll cleanup.
- `world/CinematicScene.jsx`: renderer dùng chung, lifecycle geometry/material, camera ownership.
- `world/apexRig.mjs`: capability và part grouping cho GLB Apex có fingerprint khớp.
- `home/usePublishedExperience.js`: đọc publication (chỉ API mode), timeout và bundled fallback.
- `admin/ExperienceStudio.jsx`: editor, preview, draft/recovery/publish/history.
- `backend/commerce/experience/routes.mjs`: quyền admin, CSRF/Origin qua middleware hiện có, asset binding, atomic compare-and-swap trên một document. Không đòi MongoDB replica set/transactions.

Chỉ cho phép dữ liệu trong schema; không nhập JavaScript/shader/external GLB vào Admin. Publish/Restore không có hiệu lực nếu expectedRevision cũ. Binding dùng hash GLB và product path; không bảo đảm hình học là thông số hãng hay đã kiểm toán asset độc hại toàn diện.

## Kiểm thử

`npm run test:experience`: schema/camera lifecycle helpers và GLB rig gốc. Integration chỉ chạy trên URI local có đúng tên `dth_experience_test`. KHÔNG đổi TEST_MONGO_URI thành DB ứng dụng: tests có cleanup.

`tests/browser/experience_studio.py` sử dụng hai phiên cookie, API/MongoDB thật và renderer đã build; `VITE_EXPERIENCE_TESTS=true` bật readback góc camera/pose thực để đo không teleport. Không bật biến này khi build cho người dùng. Các assertion screenshot/mock không thay thế kiểm thử server.

Chưa có chứng nhận 60 FPS, Core Web Vitals, Safari/Firefox, điện thoại vật lý, hay production accessibility/security. Cần đánh giá asset photoreal và performance budget bằng thiết bị thật ở phase tiếp theo.
