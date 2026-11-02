# DTH Motion Atelier 23.2 — gói tái tạo có file thật

## Vì sao có bản này?
Link `DTH-Step23_2-Motion-Atelier-PC-Laptop.zip` ở câu trả lời trước trỏ tới file chưa tồn tại. Không phải lỗi trình duyệt hoặc máy của bạn. Gói này được dựng lại từ source Step 23.1 còn lưu và các điểm tích hợp Support/Login trên commit GitHub `2d3bfa022e2e5a1a1fa34925d7dd49c72db63552`. Không phải gói cũ đổi tên, và không phải bản khôi phục byte-for-byte của một ZIP 23.2 đã được kiểm chứng trước đó.

## Yêu cầu
Đã cài Step 23 Spatial Commerce, Studio 22H.2, Account 22A và Story 22S. React/GSAP đã có trong dự án. Không tự cài thêm dependency. Giữ nguyên GLB, database, API, giỏ hàng, giá và auth.

## Cài trên PC
1. Giải nén **toàn bộ** ZIP. Không chạy trực tiếp trong cửa sổ ZIP.
2. Lưu file trong editor; dừng Vite bằng Ctrl+C.
3. Chạy CHECK-PC.cmd. Chỉ tiếp tục khi có CHECK OK.
4. Chạy INSTALL-PC.cmd và chọn Y.
5. Chạy VERIFY-PC.cmd. Nó chạy các test và build thật trên máy bạn.
6. Mở CMD trong dự án rồi chạy `npm run dev --workspace frontend -- --force`.

Đường dẫn mặc định PC: `C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce`.
Laptop: dùng các file có hậu tố LAPTOP; đường dẫn mặc định `E:\Greenwich\Final-Project_GRE\DTH-SHOP\DTH-3D-Commerce`.
Có thể truyền đường dẫn khác làm đối số đầu cho CMD. Hoặc:

```bat
node "DTH-Step23_2-Motion-Atelier.mjs" --project "DUONG_DAN_DU_AN" --check
node "DTH-Step23_2-Motion-Atelier.mjs" --project "DUONG_DAN_DU_AN" --apply
```

Nếu STOP: không copy source đè để vượt qua. Installer giữ file có chỉnh sửa khác và cần đối chiếu thông báo.

## Nội dung
- Icon xe máy thay cho xe hơi ở Header; My DTH/avatar có trạng thái đăng nhập thật.
- Build: card rõ phân cấp; Add to build và Details cùng hàng/cùng chiều cao.
- Popup giữa màn hình xuất hiện sau khi shortlist xác nhận thêm/thay đúng sản phẩm trong cùng tài khoản/xe. Không tự đóng; có Continue building và Review build.
- Site footer chỉ bị ẩn trên `/shop?mode=build`; giữ summary và ghi chú demo.
- Admin Support đi thẳng Inbox; khách dùng ChatThread/API hiện có. Message starters chỉ điền nháp, không tự gửi.
- Login: ảnh lineup hiện có làm nền, form giữa màn hình; nền parallax nhẹ và input/button được chỉnh lại. Bỏ tượng 3D trang trí và các control Pause/Reset không cần thiết khỏi giao diện login. Không sửa submit/auth/session logic.
- Đây là thay đổi presentation; không thay NVX, không tạo hotspot mới, không lắp phụ tùng lên xe.

## Backup/hoàn tác
Backup nằm ngoài repo tại `%USERPROFILE%\DTH-Backups\refinement232\...`. INSTALL in lệnh hoàn tác chính xác:

```bat
node "DTH-Step23_2-Motion-Atelier.mjs" --restore "DUONG_DAN_BACKUP\manifest.json"
```

Hoàn tác kiểm tra hash và từ chối ghi đè sửa đổi mới hơn. Không xóa stash, không reset Git, không tự push.

## Nghiệm thu trên trình duyệt thật
- Header: icon xe máy; khách thấy Sign in, tài khoản có My DTH. Ctrl/nút giữa vẫn mở link bình thường.
- Build: thêm mẫu A → modal → Continue; thêm mẫu B cùng nhóm → modal ghi thay thế A; số lượng/tổng khớp shortlist thật.
- Modal: Tab không đi ra nền, Esc đóng, focus trả về nút trước đó; Review mở shortlist. Không giả là đã đặt đơn hoặc lưu server.
- Footer lớn không có ở Build nhưng còn ở Shop/Story; summary không bị ẩn.
- Support: admin một click tới Inbox; khách mở chat; thử gửi/nhận và retry trên backend thật. Không có online giả.
- Login: kiểm tra đăng nhập, đăng ký, lỗi kết nối, mật khẩu sai, không WebGL và reduced motion. Không chụp/ghi log mật khẩu.
- Kiểm tra 390px và desktop 1440px/1920px; không tràn ngang.

## Những gì chưa xác nhận
Không có full dependency tree, backend/MongoDB hoặc GLB thật trong môi trường dựng lại. Test logic/installer và cú pháp không thay thế build/runtime trên PC. Xem CONTINUATION-VALIDATION.md để biết bằng chứng thực tế, không dùng số test của các lần trả lời trước.
