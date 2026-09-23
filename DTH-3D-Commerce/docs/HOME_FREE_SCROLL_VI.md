# Home — cuộn trang tự do, sân khấu rộng hơn

Tiếp tục nhánh `feat/experience-studio`, trên nền `2ba6bc7`. Không đổi database,
model GLB, màu vật liệu, dependencies hay thông tin sản phẩm.

## Hành vi mặc định

- Home là một hero ở luồng trang bình thường; không giữ sticky qua nhiều màn hình.
- Cuộn chuột chỉ cuộn trang. Không đổi chương/camera hoặc mức tách theo con lăn.
- Trong Inspect, con lăn cũng cuộn trang. Dùng nút + / − để zoom và kéo để xoay.
- Cảm ứng trong Home chừa thao tác vuốt dọc và pinch cho trình duyệt; không phải
  bộ thao tác 3D mobile hoàn chỉnh. Product Detail và Admin giữ zoom riêng như trước.
- Các nút Form / Surface / Assembly / Your build chuyển cảnh ngay tại chỗ,
  dùng các keyframe đã lưu. Có thể chọn ngược lại mà không cuộn trang.
- Model vẫn tự xoay 360° khi tải xong; Motion off, giảm chuyển động, ngoài màn hình,
  tab ẩn và Support giữ nguyên các điều kiện tạm dừng.
- Bệ dưới model rộng hơn 40% theo X, sâu hơn 12% theo Z trên desktop. Vòng sau giữ
  nguyên. Hero desktop thêm 100px, có giới hạn CSS; compact dùng kích thước riêng.

## Các chỗ điều chỉnh

`frontend/src/experience/motion/motion.config.mjs` → `HOME_SHOWROOM`:

- `scrollLinked: false`: mặc định cuộn bình thường. Chỉ bật lại khi thực sự muốn
  thử câu chuyện scroll cũ; không dùng để chữa lỗi kích thước.
- `wheelZoom: false`: giữ con lăn cho trang. Nút zoom vẫn hoạt động.
- `extraHeightPx: 100`: phần tăng chiều cao hero desktop.
- `pedestalScale: [1.4, 1, 1.12]`: chiều rộng / chiều cao / chiều sâu bệ.
- `compactPedestalScale`: bệ nhỏ hơn cho viewport hẹp.

Đây là cấu hình giao diện Home trong source, không phải một schema MongoDB mới.
Admin vẫn chỉnh và xuất bản camera/keyframe/copy. `Scroll length` và `Scroll response
lag` trong Admin được giữ để tương thích cấu hình cũ, nhưng không điều khiển chiều
cao hay thao tác cuộn của Home mặc định mới. Không cần xuất bản lại để bật free scroll.

## Cập nhật tại máy

Lưu thay đổi local trước, rồi ở Git root:

```bat
git status -sb
git fetch origin
git switch feat/experience-studio
git pull --ff-only origin feat/experience-studio
```

Chạy npm tại `DTH-3D-Commerce`, không phải Git root:

```bat
npm ci
npm run check && npm run test:experience && npm run build
npm run dev
```

Dừng Vite cũ trước khi mở lại. Giữ backend/MongoDB đang chạy nếu dùng API mode;
không mở thêm backend trùng port. Thử Home không DB bằng `npm run dev:flow` thay
cho `npm run dev`. Không seed lại, đổi .env, reset --hard hoặc merge PR tự động.

## Nghiệm thu

Mở Home, không bấm Inspect: model tự xoay. Đặt chuột lên model và cuộn: hero đi
lên cùng trang, không giữ tại chỗ hoặc tự tách sản phẩm. Vào Inspect rồi cuộn lại:
trang vẫn đi xuống, camera không zoom. Nút + / −, kéo chuột, Explode và Reset vẫn dùng
được. Bấm chương để đổi góc/assembly, sau đó đi Shop → Home và mở/đóng Support.

Bộ kiểm thử cũ vẫn giữ; bài cinematic và experience đã chuyển từ kỳ vọng sticky
sang kỳ vọng chapter-click theo yêu cầu mới. `home_freescroll.py` kiểm tra bằng
wheel/drag thật, camera render, hình học bệ, route re-entry và nhiều viewport.
CI dùng Chromium/software WebGL và DB riêng. Không xem kết quả đó là chứng nhận
hiệu năng GPU hoặc toàn bộ thiết bị. `VITE_EXPERIENCE_TESTS` chỉ dùng ở build test.
