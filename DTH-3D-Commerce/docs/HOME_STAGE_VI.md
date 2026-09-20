# Home Stage — hướng dẫn cấu trúc và tùy chỉnh

## 1. Đường đi của giao diện

`StoreApp.jsx → index route → HomePage.jsx → HOME_CONFIG.sections → từng Section`.
`Shell`, `StoreProvider`, dialog chọn xe, state giỏ hàng, API và backend tiếp tục dùng bản trước.

```text
frontend/src/shop/
├── StoreApp.jsx                         # Router + các trang thương mại hiện tại
├── components/
│   ├── StoreIcon.jsx                    # Icon cũ, tách ra để tái sử dụng
│   └── ProductCard.jsx                  # Card cũ, dùng cho Home lẫn Shop
└── home/
    ├── HomePage.jsx                     # Ghép section, bật/tắt chuyển động toàn Home
    ├── home.config.mjs                  # Chỗ chỉnh nội dung, thứ tự và tham số
    ├── home.tokens.css                  # Màu, font phụ, style Header chỉ ở Home
    ├── components/SectionShell.jsx      # Section wrapper + animation hiện một lần
    ├── hooks/useStudioMotion.js         # Lifecycle, reduced motion, visibility, reveal
    └── sections/
        ├── Hero/
        │   ├── HeroSection.jsx          # Chữ, nhãn, chọn sản phẩm, nút điều khiển
        │   ├── HeroScene.jsx            # Canvas, model, camera, ánh sáng, OrbitControls
        │   └── HeroSection.module.css   # Bố cục sân khấu và các breakpoint
        ├── Workflow/                   # Ba bước mua hàng
        ├── Categories/                 # Link danh mục
        ├── Featured/                   # Sản phẩm nổi bật
        └── Fitment/                    # Xe đã chọn + số sản phẩm phù hợp
```

## 2. Cấu hình thường chỉnh

Mở `frontend/src/shop/home/home.config.mjs`.

| Muốn thay | Cấu hình |
|---|---|
| Tiêu đề hai phần | `hero.headline` |
| Dòng mô tả | `hero.description` |
| Nhãn nút chính | `hero.inspectLabel`, `hero.productLinkLabel` |
| Sản phẩm xuất hiện trên sân khấu | `hero.exhibits[].productId` — ID phải có trong catalog |
| Chữ lớn phía sau | `hero.exhibits[].backdrop` |
| Nội dung nhãn | `hero.exhibits[].geometry`, `.note` |
| Góc xoay ban đầu | `hero.exhibits[].rotation: [x, y, z]`, đơn vị radian |
| Kích thước hiển thị đã chuẩn hóa | `hero.exhibits[].modelSize` — không phải kích thước thực tế |
| Vị trí camera | `hero.scene.camera: [x, y, z]` |
| Góc rộng camera | `hero.scene.fov`, đơn vị độ |
| Tốc độ tự xoay | `hero.scene.autoRotateSpeed`, radian/giây; `0` để không xoay |
| Độ nổi nhẹ | `hero.scene.floatAmplitude`; `0` để không nổi |
| Tốc độ nổi | `hero.scene.floatSpeed` |
| Thời gian mô hình vào góc trưng bày | `hero.scene.entranceMs` |
| Thời gian text xuất hiện | `motion.entranceMs` |
| Độ trễ nối tiếp giữa các khối | `motion.staggerMs` |
| Thời gian vòng nền quay | `motion.ambientRingSeconds` |
| Animation section khi cuộn đến | `motion.revealMs`, `motion.revealDistancePx` |
| Tắt animation mặc định | `motion.enabled: false` |
| Ẩn nhãn Form/Finish | `hero.annotations: false` |
| Bật/tắt/đổi thứ tự section | `sections`, thuộc tính `enabled` và thứ tự mảng |
| Số sản phẩm nổi bật | `featured.count` |
| Màu chủ đạo | `--home-accent` trong `home.tokens.css` |

Ví dụ giảm chuyển động:

```js
// Trong hero.scene:
autoRotateSpeed: 0.07,
floatAmplitude: 0.018,
entranceMs: 1800,
```

Ví dụ đổi thứ tự:

```js
sections: [
  { id: 'hero', enabled: true },
  { id: 'fitment', enabled: true },
  { id: 'categories', enabled: true },
  { id: 'featured', enabled: true },
  { id: 'workflow', enabled: false },
],
```

Chỉ dùng các ID section đã đăng ký. Để thêm section mới, tạo component và thêm vào `SECTION_COMPONENTS` trong `HomePage.jsx`.
Một cấu hình đã trỏ tới sản phẩm không còn có trong API sẽ được bỏ qua; nếu tất cả ID mất thì dùng sản phẩm active đầu tiên, không tạo link tới ID giả.

## 3. Nguyên tắc animation và tương tác

- Nội dung DOM hiện bình thường nếu trình duyệt không hỗ trợ Element.animate.
- `useEntrance` tạo animation riêng trong Hero; cleanup hủy animation khi chuyển trang.
- Các section bên dưới tự reveal một lần bằng IntersectionObserver. Không có timeline dài phụ thuộc vị trí của section khác.
- Chế độ Showroom: vòng nền quay nhẹ + model xoay/nổi; Canvas bỏ qua pointer/wheel để trang cuộn bình thường.
- Chế độ Inspect: model ngừng tự chuyển động, camera chỉ do OrbitControls và nút bàn phím điều khiển. Escape để thoát.
- Dừng chuyển động khi section nằm ngoài vùng nhìn hoặc tab ở nền; render theo nhu cầu khi không cần tự chuyển động.
- Reduced motion được đọc ngay lúc khởi tạo và theo dõi thay đổi. Nút Play không vượt qua lựa chọn này.
- Reset đặt lại góc trưng bày và camera; nếu Motion vẫn bật thì chuyển động tự chạy sẽ tiếp tục.
- Wireframe chỉ sửa **bản sao vật liệu của Hero**, không sửa GLB hoặc vật liệu cached của viewer sản phẩm.
- Chỉ một model trên sân khấu; card bên dưới dùng ảnh, không tạo hàng loạt Canvas.
- Ánh sáng studio tạo bằng RoomEnvironment trong Three.js, không lấy HDRI từ CDN.

Nút Pause chỉ tác động tới Home. Chuyển động hover của nút và card không phải một chế độ trình diễn liên tục.
Các nhãn Form/Finish là nhãn biên tập quanh sân khấu; chưa phải hotspot đo đạc hoặc hệ thống chú thích gắn vào từng tọa độ mesh.

## 4. Dữ liệu và tài sản

Mô hình 3D vẫn là 3 GLB đã có trong `frontend/public/models/dth-demo/`.
Ảnh fallback mới ở `frontend/public/previews/home-stage/` là raster RGBA tạo từ chính GLB minh họa đó, không thêm model sản phẩm mới và không chứng nhận fitment. Chúng chỉ dùng khi đang tải hoặc chọn Image.
Ánh sáng của ảnh và WebGL có thể khác.

Không thay đổi dữ liệu sản phẩm, giá, route detail, logic chọn xe, giỏ hàng, trạng thái đăng nhập hay chế độ thanh toán mô phỏng.
Không có AR, thanh toán thật, AI fitment, thông số hiệu năng hoặc thông số kích thước thực được thêm vào.

## 5. Các bước kiểm tra trên app thực tế

Chạy từ root: `npm run check`, `node --test tests/home-stage.test.mjs`, `npm test`, `npm run build`, rồi `npm run dev`.
Không xem các test cấu hình là thay thế cho functional testing hay UAT.

- Tải lần đầu và reload: mô hình hiện, trạng thái chuyển từ PREPARING sang LIVE 3D.
- Đổi cả 3 sản phẩm, rồi quay về sản phẩm trước đã cached: không kẹt ở loading; nút View product đúng.
- Đổi sản phẩm trong lúc mô hình chưa tải xong: sản phẩm cuối được chọn phải khớp model/name/price/link.
- Motion On/Off; reduced motion; rời Home rồi quay lại; tab background.
- Inspect / Exit / Escape / Reset / Wireframe / Image → View 3D.
- Lăn chuột trên sân khấu mặc định không chặn scroll trang. Inspect mới cho zoom.
- Bàn phím Tab vào controls; các nút xoay/zoom làm việc khi Inspect.
- Thử viewport 390, 768, 1024, 1440; kiểm tra zoom trình duyệt 200%.
- Không có WebGL / sai đường dẫn GLB: ảnh tĩnh và thông tin sản phẩm vẫn dùng được.
- Dialog chọn xe và việc giữ xe/bag khi đi Home → Shop → Product → Bag → Home.
- Ở API mode: catalog từ MongoDB vẫn được dùng, không âm thầm thay bằng preview.

## 6. Tài liệu kỹ thuật tham khảo

- Web Animations API / Element.animate: https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
- Reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- Three.js: https://threejs.org/docs/

Đợt này chưa triển khai đoạn cuộn giữ màn hình “Inside the Part”, hiệu ứng exploded view hoặc bảng cấu hình kéo-thả của admin. Những phần đó dành cho vòng duyệt tiếp theo.
