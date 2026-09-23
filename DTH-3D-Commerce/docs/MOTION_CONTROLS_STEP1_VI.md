# Motion Foundation — bước nhỏ 01: điều khiển 3D dùng chung

Bản sửa này tiếp tục `feat/experience-studio` từ `8feca9b`. Không tạo lại Home,
không thay GLB, database schema, Auth, Checkout hoặc realtime chat. Không merge
vào `feature/3d-store` tự động.

## Thay đổi

- Bấm xoay/zoom nhiều lần liên tiếp được cộng dồn; không bị gom thành một lần.
- Chọn một góc mới thay thế góc đang chuyển. Kéo chuột hủy chuyển động theo góc
  có sẵn ngay, không tự kéo camera trở lại sau khi người dùng thả chuột.
- Mở hộp thoại/Support hoặc ngừng hoạt động của scene hủy lệnh camera đang chờ.
- Góc Top được giới hạn theo OrbitControls, tránh một đích camera không bao giờ
  tới được và vòng render liên tục không cần thiết.
- Home và Admin dùng chung inspectionCommands.mjs, không có hai cách tính camera.
- Admin có Front / Side / Rear / Top khi Inspect; Reset cũng tắt Wireframe.
- Capture camera lưu góc, tư thế và mức tách đã render, không lấy mức tách mục tiêu
  khi slider đang chuyển động. Các mảng của snapshot được sao chép độc lập.
- Khi vào Inspect giữa chuyển động Assembly, giữ mức tách đang hiển thị.
- Preview story trong Admin tạm dừng khi tab ẩn hoặc hộp Publish/Restore đang mở.
- Chuyển `mode` và `inspecting` không thể để lại hai trạng thái mâu thuẫn.

## Chạy thử Home trước, không cần MongoDB

Tại Git root, chỉ khi đã lưu các thay đổi local:

```bat
git status -sb
git fetch origin
git switch feat/experience-studio
git pull --ff-only origin feat/experience-studio
```

Tại thư mục ứng dụng (không phải Git root):

```bat
cd /d "E:\Greenwich\Final-Project_GRE\DTH-3D-Commerce"
npm ci
npm run check
npm run test:experience
npm run build:flow
npm run dev:flow
```

Không tạo nhánh cinematic mới, không reset --hard, không đổi origin và không seed
lại database vì bản sửa này. Dừng Vite cũ trước khi mở một Vite khác trên cùng port.

## Thao tác nghiệm thu

Home: Inspect → bấm Rotate right 4 lần nhanh → Zoom in 3 lần → Rear → kéo chuột
ngay → mở/đóng Support → Explode + Wireframe + đổi ánh sáng → Reset → Return to story.
Kiểm tra camera không nhảy, không tự chuyển tiếp sau khi kéo, và Reset đưa tất cả
điều khiển về mặc định. Story vẫn có Skip to parts; compact/reduced-motion vẫn dùng
được mà không bị ép xem toàn bộ cinematic.

Admin: giữ MongoDB/API cấu hình đã có, chạy `npm run dev:api` và `npm run dev` ở
hai terminal tại thư mục ứng dụng. Mở `/admin/experience` bằng tài khoản admin,
chọn Inspect / drag, thử các góc mới, Wireframe → Reset, kéo và Capture this angle.
Save draft không đổi Home công khai; Publish vẫn là một thao tác xác nhận riêng.

## Kiểm thử và phạm vi

`npm run test:experience` bao gồm 18 test mới cho hàng lệnh điều khiển, giới hạn,
capture và quyền sở hữu camera, cùng toàn bộ test timeline/rig/experience có sẵn.
`tests/browser/motion_controls.py` kiểm tra trình duyệt thật ở Flow, không DB.
`tests/browser/experience_studio.py` tiếp tục kiểm tra lưu/xuất bản/khôi phục với
API/MongoDB riêng và bổ sung thao tác góc xem/reset của Admin.

CI sử dụng `VITE_EXPERIENCE_TESTS=true` chỉ để quan sát trạng thái đã render.
Không bật biến này trong bản dùng cho khách. Test tích hợp chỉ được chạy trên
DB kiểm thử có guard, không chạy trên `dth_3d_commerce` đang dùng.

Kiểm tra CI theo đúng commit mới; không dùng kết quả của commit cũ để kết luận.
Đây chưa phải nâng cấp asset photoreal, công cụ rig/hotspot tổng quát, X-ray,
AR, chuyển cảnh WebGL xuyên route, hoặc kiểm toán performance/security.

Bước tiếp theo sau khi duyệt điều khiển: nâng chất lượng asset và ánh sáng cho
một hero product, chốt góc tĩnh, rồi tinh chỉnh bốn chương Home. Công cụ rig/
hotspot cho nhiều sản phẩm được làm sau, không gộp vào lần sửa này.
