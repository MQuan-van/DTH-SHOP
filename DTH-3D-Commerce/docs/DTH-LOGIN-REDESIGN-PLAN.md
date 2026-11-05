# DTH Login — kế hoạch thiết kế lại

> Presentation hiện tại là Blue Vault 24.6: sân khấu navy/candy-blue, phụ tùng Ohlins TTX thật, camera cận/toàn cảnh và thanh đăng nhập ngang của Access Studio. Xem `DTH-ACCESS246-BLUE-VAULT.md` cho trạng thái triển khai và giới hạn kiểm tra. Các phương án Machined Light/Blue Hour bên dưới được lưu để đối chiếu, không còn là art direction đang chạy.

Ngày lập: 2026-11-04. Revision 2 theo phản hồi cần nâng chất lượng thiết kế hơn nữa. Baseline đã được tích hợp và kiểm thử ngày 2026-11-05; xem `DTH-ACCESS243-IMPLEMENTATION.md` để biết chính xác phần đã làm và giới hạn nghiệm thu. Các mục dưới đây lưu lại ý định thiết kế, không tự chứng minh mọi tiêu chí đã được đo.

## Phạm vi người dùng yêu cầu

Tạm dừng Mount Calibration. Thiết kế lại màn đăng nhập với nền 3D/animation và gradient phản ứng theo chuột. Khách chưa đăng nhập không thấy nút chat Support. Giữ nguyên xác thực, tài khoản Admin, API và dữ liệu hiện có.

Yêu cầu mới thay thế lựa chọn nền ảnh cho Login trong hướng dẫn Refinement 23.2. Ảnh Story và các trang khác giữ nguyên.

## Hiện trạng đã đối chiếu source

- Màn login thực tế do `frontend/src/experience/access181/AccessBoundary181.jsx` và `AccessScreen181.jsx` điều khiển. `shop/account/AccountPage.jsx` không phải điểm duy nhất cần xem xét.
- `AccessScreen181` đang import `refinement232/AccessBackdrop232.jsx`: ảnh xe hiện có, dịch chuyển tối đa khoảng 12/9 px. Đây không phải nền 3D đang hoạt động.
- Giao diện chịu cả `access181.css`, `refinement232.css` và `shop/account/premium-account.css`. Bản mới cần một lớp style riêng, tránh tiếp tục chồng các override lên nhau.
- `access181/BrandScene.jsx`, `brandScene.webgl.mjs` và hình học logo cũ còn trong repo. Cần xem lại hình học và chất lượng thực tế trước khi tái sử dụng; sự tồn tại của file không chứng minh chất lượng render.
- `shop/useStore.jsx` mount SupportWidget toàn cục. `refinement232/Support232.jsx` vẫn hiển thị nút cho guest; guest chỉ thấy lời mời đăng nhập. Tạo conversation chỉ diễn ra khi mode là customer.
- `SupportProvider` chỉ mở stream khi API mode, đã có user và không còn kiểm tra session. Dòng “Your chat session ended” phát sinh từ sự kiện session-ended; ảnh chụp không chứng minh guest đã gửi được tin.
- Lockfile: React 19.2.8, Fiber 9.8.1, Three 0.184.0, GSAP 3.15.0. Không cần nâng phiên bản cho đề xuất này.

## Hướng thiết kế revision 2: DTH Machined Light

Phản biện phương án trước: nền navy + logo 3D bên trái + card pearl bên phải vẫn tạo cảm giác hai khối độc lập. Gradient và logo quay nhẹ chưa đủ tạo bản sắc riêng cho DTH. Revision này thay bố cục, cách dùng vật liệu và cách phản hồi theo trạng thái trước khi tăng hiệu ứng.

Pearl là mặt nền toàn viewport. Một nghiên cứu vật liệu 3D lấy hình học từ logo DTH hiện có tạo các cạnh xéo, mặt satin và bóng navy. Góc máy macro làm rõ chiều dày/cạnh vát; hình khối được crop ra rìa để tạo chiều sâu. Dải phản xạ candy-blue đi trên bề mặt kim loại, còn gradient ice-blue xuất hiện trong vùng ánh sáng. Đây là hình khối thương hiệu, không giả thành phụ tùng đang bán.

Một khoảng trống yên được bảo vệ cho form. Desktop đặt trục form khoảng 58% chiều rộng viewport, rộng 400–420 px; visual được bố trí quanh khoảng trống này thay vì chia trang thành hai panel. Form đặt trực tiếp trên nền pearl, không có card, shadow hoặc khung chữ nhật bao quanh. Camera cố định, vật thể không đi qua vùng chữ/nút. Logo DTH nhỏ ở đầu trang giữ nhận diện khi visual macro bị crop.

Tiêu đề form đơn giản “Sign in.”, khoảng 40–48 px desktop và 32–36 px mobile; label 14 px, input 16 px. Căn trái nhất quán. Không cần slogan lớn, badge kỹ thuật hoặc câu mô tả 3D cạnh form. Nút, input và link có hệ khoảng cách chặt chẽ, góc nhỏ 2–4 px, một nút Sign in là hành động chính. Giữ disclosure demo cần thiết bằng một dòng ngắn.

Palette:

| Vai trò | Màu |
| --- | --- |
| Bóng sâu / cạnh khối | `#081E2D` |
| Chữ navy | `#102C3D` |
| Toàn nền pearl / vùng form | `#F2F6F7` |
| Candy blue | `#287CFF` |
| Ánh sáng ice | `#A8DFFF` |
| Chữ phụ trên pearl | `#516B7B` |

Chữ: dùng Manrope và fallback hiện có. Label 14 px, nội dung/input 16 px; không thêm font bên ngoài mới.

```text
Desktop
┌─────────────────────────────────────────────────────────┐
│ DTH                                      Access help    │
│                                                         │
│    Khối hợp kim DTH                    Sign in.          │
│    crop lớn, cạnh xéo                                    │
│    có phản xạ candy-blue               Email             │
│                                        Password   Show  │
│               ánh sáng dịu             [ Sign in      ] │
│                                        Create account   │
│       Nền pearl liền, không chia hai panel               │
│ Pause motion                    Demo disclosure ngắn    │
└─────────────────────────────────────────────────────────┘

Mobile: logo và một lát vật liệu ở mép trang; form nằm ngay
trong luồng nội dung. Không đặt hero lớn trước form. Mặt nền
vẫn đọc rõ khi bàn phím mở hoặc khi dùng giảm chuyển động.
```

## Chuyển động theo trạng thái

| Tình huống | Phản hồi dự kiến |
| --- | --- |
| Vào trang | Một lượt ánh sáng lướt qua cạnh khoảng 650–800 ms; form dùng được ngay |
| Rê chuột trong vùng visual | Vị trí nguồn sáng phản ứng trước, độ nghiêng khối tối đa khoảng 3 độ; camera giữ cố định |
| Chuột rời visual | Trở về pose nghỉ bằng easing có giới hạn; không giật theo vị trí con trỏ mới |
| Chuột qua form / focus input | Dừng nghiêng khối, giảm ánh sáng chuyển động; form và input giữ nguyên vị trí |
| Login sang đăng ký | Giữ trục căn và email; thay vùng form 160–200 ms, cho nội dung cao thêm trong luồng trang; mật khẩu xử lý theo handler hiện có |
| Submit | Nền đứng yên; nút giữ nguyên kích thước, hiện loading theo request thật |
| Sai thông tin / lỗi kết nối | Phản hồi ngay trong form; màu lỗi cục bộ, không rung toàn trang hoặc đổi toàn scene đỏ |
| Xác thực thành công | Điều hướng theo response thật ngay; chuyển opacity ngắn nếu route cho phép, tuyệt đối không đợi animation xong |
| Reduced motion / Pause | Giữ composition tĩnh đã được thiết kế; form đầy đủ chức năng |

- Gradient dùng các lớp dựng sẵn, chuyển động bằng transform/opacity; tránh repaint gradient toàn màn hình mỗi pointer event. Không React setState từng frame.
- Một owner cho từng thuộc tính. GSAP sở hữu motion DOM trong scope; R3F sở hữu renderer và cập nhật scene. Không lấy renderer cũ và mới chạy song song.
- Scene chỉ nhận các trạng thái chung như focus/busy, không nhận email, mật khẩu, độ dài mật khẩu hoặc nội dung form.
- Hidden tab, route exit và chính sách thiết bị dừng render work. Pointer input không chặn wheel/touch scroll. Nền có poster thay thế khi WebGL lỗi và không chặn auth khi tải chậm.
- Tận dụng hình học logo nhẹ; không tải GLB xe/phuộc dung lượng lớn vào login. Chỉ nâng vật liệu/ánh sáng trong scene thương hiệu mới, giữ GLB thương mại nguyên trạng.

## UX được làm kỹ hơn

- Password manager, autofill và paste hoạt động bình thường. Test cả kiểu nền browser tự điền; input không lệch màu đến mức trông như một giao diện khác.
- Show/Hide có hit target tối thiểu 44 px và nhãn đọc được bằng screen reader. Tab order đi qua form theo thứ tự thị giác.
- Phân biệt phiên hết hạn, thông tin không hợp lệ và mất kết nối bằng thông báo đúng ngữ cảnh. Không suy đoán lỗi backend để đưa hướng dẫn sai.
- Giữ email khi lỗi hoặc chuyển mode. Lỗi xuất hiện gần vị trí cần sửa; focus được đưa đến phản hồi phù hợp. Khoảng cách form chịu được lỗi dài mà không chồng nút.
- Chỉ giữ focus đang nhập khi resize/bàn phím mở. Không tự focus làm bật bàn phím mobile khi vừa vào trang.
- Đăng ký sử dụng cùng hệ bố cục; form dài hơn được cuộn tự nhiên, không ép vào một khung chiều cao cố định.
- Submit lock và state request giữ nguyên. Không thêm Google/Apple login, Remember me hoặc Forgot password khi chưa có hợp đồng API tương ứng.
- Guest không có launcher chat. Trợ giúp đăng nhập là nội dung gọn, đóng/mở được, không mở conversation hoặc ngụ ý có nhân viên trực tuyến.

## Logic Support cần chỉnh

| Trạng thái | Giao diện | Hoạt động chat |
| --- | --- | --- |
| Đang kiểm tra session | Không có chat launcher | Không khởi tạo conversation |
| Guest / trang login | Không có chat launcher | Không mở/gửi chat |
| Customer đã đăng nhập | Support như chức năng hiện tại | Conversation và ChatThread hiện có |
| Admin đã đăng nhập | Inbox theo hành vi hiện tại | Inbox hiện có |
| Đăng xuất/session hết hạn | Đóng panel, xóa tham chiếu thread của phiên cũ | Dọn subscription/stream theo guard hiện có |

“Access help” là hướng dẫn tĩnh mở được bằng bàn phím, không phải chat, không giả nhân viên trực tuyến. Giữ thông báo session thật, nhưng trình bày dễ hiểu trong ngữ cảnh đăng nhập. Không bổ sung nút khôi phục mật khẩu nếu chưa có API hỗ trợ.

## Thứ tự thực hiện

1. Dựng composition tĩnh ở kích thước desktop/laptop/mobile trước. Kiểm tra góc máy macro, khoảng trống cho form, cạnh vật liệu và độ đọc chữ khi không có motion. Nếu vẫn giống card đặt trên background, sửa composition trước.
2. Tạo demo tương tác riêng trong app, có trạng thái idle/focus/login/register/loading/error để xem thử bằng dữ liệu mô phỏng được ghi rõ. Kiểm tra chuột, motion pause và reduced motion; demo không gửi credentials hoặc giả xác thực thành công.
3. Tích hợp presentation mới vào access screen đang chạy; giữ nguyên submit handler, validation, request lock, identity epoch, return URL và phân quyền điều hướng.
4. Chỉnh điều kiện hiển thị Support cho guest/auth-loading, giữ ChatThread và API nguyên trạng.
5. Kiểm thử thực tế, chỉnh bố cục và chuyển động theo ảnh chụp desktop/laptop/mobile; lưu bằng chứng và báo cáo file thay đổi.

Tạo module riêng dưới `frontend/src/experience/access243/` là hướng triển khai đề xuất. Thay đổi tích hợp tối thiểu ở AccessScreen181 và Support232; CSS mới chỉ áp dụng cho access screen. Bản cũ giữ khả năng rollback, không xóa các chỉnh sửa chưa commit.

## Điều kiện nghiệm thu

- Khi tắt toàn bộ animation, ảnh tĩnh vẫn có chiều sâu và bố cục cân bằng. Hình khối thương hiệu phải đọc được chất liệu ở overview và macro; không cần hiệu ứng để che hình học yếu.
- Ở 1366×768, form login đầy đủ nằm trong vùng nhìn thấy với chiều cao trình duyệt đã đo. Form đăng ký và lỗi dài được cuộn; mobile mở bàn phím vẫn tiếp cận được nút submit.
- Chỉ có một điểm nhấn chính là bề mặt hợp kim/ánh sáng. Form có phân cấp rõ; không thêm orbit rings, particle field, badge trang trí hoặc nhiều nguồn sáng đuổi theo chuột.
- Login, đăng ký, password show/hide, autofill/paste, Enter submit và lỗi API vẫn hoạt động. Không tạo tài khoản thật chỉ để thử giao diện.
- Customer/Admin đi đúng trang sau khi đăng nhập; return URL và guard session giữ nguyên. Kiểm tra response đến muộn sau đổi identity/route.
- Guest không có launcher/composer và không phát sinh chat conversation/events request. Đăng xuất khi chat mở không làm lộ nội dung tài khoản trước.
- Keyboard focus rõ, label đầy đủ, tương phản đạt yêu cầu, touch target ít nhất 44 px, input mobile ít nhất 16 px. Bàn phím mobile không che submit.
- Kiểm tra 1440×900, 1366×768, 390×844, 360 px và zoom 200%. Không tràn ngang; đăng ký/lỗi dài vẫn cuộn được.
- Một Canvas khi login, dọn renderer khi rời trang; không ảnh hưởng renderer Studio/Build. Thử WebGL không khả dụng và giảm chuyển động.
- Đo frame time khi rê chuột và gõ; mục tiêu khoảng 60 fps trên máy kiểm tra, báo số đo và điều kiện thực tế. Build thành công không được dùng thay bằng chứng FPS/render.
- Chạy các test access/auth/support liên quan và production build frontend sau tích hợp. Tách logic tests, browser checks, visual review và hiệu năng trong báo cáo.

## Guidance và giới hạn ở bước kế hoạch

Đã đọc hướng dẫn frontend-design, UI/UX Pro Max, Web Interface Guidelines, Emil design engineering, GSAP React/performance, animation-performance và guidance Three.js/3DViz phù hợp. Đã đối chiếu Web Interface Guidelines từ nguồn chính thức.

Script tra cứu UI/UX Pro Max chưa chạy được: python/python3 trỏ tới WindowsApps không truy cập được, py không có trong PATH. Quyết định thiết kế ở đây dựa trên brief, source và hướng dẫn đã đọc; không phải kết quả search dataset hay một audit browser đã hoàn tất. Không cài môi trường mới cho bước lập kế hoạch.

Ở thời điểm lập kế hoạch ban đầu chưa sửa code chức năng hoặc chạy build/test. Trạng thái triển khai mới nhất được ghi riêng trong `DTH-ACCESS243-IMPLEMENTATION.md`.
