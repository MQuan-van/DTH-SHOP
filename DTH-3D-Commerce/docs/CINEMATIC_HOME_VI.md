# DTH Cinematic Home — Motion Foundation 01

## Phạm vi

Nhánh `feat/cinematic-home`, dựa trên main `feature/3d-store` tại `5327502` (Admin/Support đã merge). Đây là trải nghiệm Home mới, không viết lại Auth, Shop, Quick View, Product Detail, Admin, Support hoặc backend. Không thay database/seed. Không có file cài bên ngoài; các component nằm trong source ứng dụng.

Bốn chương: Form → Surface → Assembly → Your build. Desktop đủ rộng/cao dùng scroll trang gốc điều khiển camera, xoay, dịch chuyển và tách/lắp GLB. Các vòng sau/dưới được dựng trong Three.js. Nút Skip to parts/Explore the parts không buộc xem hết story. Inspect tách quyền điều khiển cho OrbitControls; có zoom/rotate/reset, wireframe, thanh Explode. Các chương dùng chung một Canvas trong Home, chưa phải persistent Canvas xuyên toàn bộ route.

Model Apex gốc được chia theo màu, không có xương/nút semantic. `apexRig.mjs` nhóm lại đúng các thành phần hình học sẵn có thành chín nhóm. Kiểm tra URL, số đỉnh/chỉ mục, fingerprint vị trí và transform trước khi tách. Không thêm piston bên trong, không mô phỏng cơ học hay tuyên bố CAD thật. Dịch chuyển chỉ để minh họa; không hướng dẫn tháo lắp. Normal bề mặt được xử lý lại ở bản clone của Home để giữ cạnh cứng và làm mượt chỗ cong; màu lime được hiệu chỉnh một lần nếu khớp bảng màu demo cũ. File GLB gốc và Viewer3D không bị sửa. Asset tùy chỉnh không nhận rig Apex, chỉ xem ở trạng thái nguyên cụm.

Giới hạn thẩm mỹ: đây vẫn là hình học demo low-poly, chưa phải asset sản phẩm photoreal được dựng UV/texture chi tiết. Camera/motion không thay thế bước nâng chất lượng asset sau này.

## Chạy trên máy của bạn

Dừng Vite và backend trước khi đổi nhánh/cài dependencies. MongoDB có thể giữ nguyên.

CMD ở Git root:

```bat
cd /d "E:\Greenwich\Final-Project_GRE"
git status -sb
git fetch origin
git switch feat/cinematic-home
git pull --ff-only origin feat/cinematic-home
```

Chỉ đổi nhánh khi đã lưu/commit chọn lọc thay đổi local. Nếu Git báo diverged/conflict, dừng và xem status/log; không dùng reset --hard, git clean, force push hoặc đổi remote. Nếu branch chưa có local và Git không tự tạo: `git switch --track origin/feat/cinematic-home`.

CMD ở application root (khác Git root):

```bat
cd DTH-3D-Commerce
npm ci
npm run check
npm run test:cinematic
npm run build:flow
npm run dev:flow
```

GSAP 3.15.0 đã được pin trong frontend/package.json + lockfile. Không cài một bản gsap khác, không dùng --force/--legacy-peer-deps. PowerShell có thể dùng npm.cmd. Không chạy npm ở repo root hoặc chạy dev:api bên trong backend.

`dev:flow` để xem Home và thử flow UI không cần API/MongoDB. Không thử chat thật hoặc admin bằng mode này. Giữ `frontend/.env.local` riêng từng máy; không push env.

Để dùng dữ liệu/API đang có, dừng Flow, đặt `frontend/.env.local`:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Giữ MongoDB đang chạy, terminal ở application root chạy `npm run dev:api`; terminal khác cùng application root chạy `npm run dev`. Không seed lại catalog đã có. Banner mode chỉ là cấu hình frontend, không phải kết quả ping database.

## Thử giao diện

1. Mở Home trên desktop. Cuộn chậm xuống và lên: model, camera và chương phải chạy hai chiều; sân khấu còn trong viewport.
2. Chọn từng chương bằng nút dưới cùng hoặc bỏ qua bằng Skip to parts.
3. Inspect: xoay kéo, zoom, dùng nút bàn phím, thanh Explode, Wireframe, Reset. Return to story phải trả quyền camera cho scroll.
4. Find my fit mở đúng vehicle selector hiện có. View product/collection/category phải tới đúng route.
5. Motion off hoặc prefers-reduced-motion bỏ đoạn scroll dài. Compact chuyển sang chọn chương thủ công, không ép cinematic desktop lên màn hình nhỏ.
6. Eco quality giới hạn DPR 1. Auto quality có heuristic hạ DPR nếu các frame đang chuyển cảnh chậm. Đây không phải cam kết FPS.
7. GLB lỗi/không WebGL vẫn có ảnh và đường dẫn mua hàng; thử lại bằng Retry 3D khi có thể.
8. Đi Shop rồi trở lại Home: không có Canvas hoặc ScrollTrigger lặp, CSS của Home phải được dọn.

## Vị trí điều chỉnh

- `frontend/src/experience/motion/motion.config.mjs`: bật/tắt Home mới, câu chữ, nhịp scroll, camera keyframes, DPR.
- `motion/story.mjs`: sampler thuần + signal, không gọi React setState mỗi frame.
- `motion/useScrollDirector.js`: GSAP/ScrollTrigger + cleanup, không chặn wheel/scroll gốc.
- `world/CinematicScene.jsx`: camera, ánh sáng, vòng sân khấu, render theo nhu cầu.
- `world/apexRig.mjs`: nhóm hình học Apex; PART_OFFSETS chỉnh khoảng tách, không phải thông số cơ khí.
- `home/CinematicHome.jsx` và `.module.css`: bố cục, CTA, collection, CSS scope.

`storyScreens` tăng nghĩa là cần cuộn xa hơn. `scrubSeconds` tăng nghĩa là chuyển cảnh có độ trễ lớn hơn. `pointerRadians` là biên độ nghiêng nhẹ. Không dùng chúng để chỉnh tốc độ auto-rotate của Product Detail.

Khôi phục showroom cũ: đổi `CINEMATIC_CONFIG.enabled` thành `false`; HomePage sẽ dùng LegacyHomePage cùng cấu hình cũ. Không xóa branch hoặc reset để thử.

## Kiểm thử và giới hạn

`npm run test:cinematic` đọc GLB thật, kiểm tra19 tình huống về timeline, rig, giữ nguyên geometry/cache, hiệu chỉnh màu và asset thay thế. Các test nền Account/Admin/Home/Shop vẫn giữ nguyên. Workflow Cinematic Home build cả API và Flow; trình duyệt chạy với Flow không kết nối database. Nó kiểm tra vị trí sticky thực, thao tác3D, fallback và compact; không dùng screenshot mock thay cho app.

Workflow cuối chỉ có contents:read và checkout không lưu credentials. Bước chuẩn bị GSAP trước đó chỉ commit hai manifest trên nhánh này. Không có deploy/merge tự động.

Chưa bao gồm Spatial Shop, Product Lab/X-ray, global WebGL route transitions, sound, photoreal asset replacement, kiểm toán accessibility/security toàn phần, Safari/Firefox, điện thoại vật lý hoặc benchmark FPS/Core Web Vitals. Kiểm thử CI không truy cập MongoDB local của người dùng.
