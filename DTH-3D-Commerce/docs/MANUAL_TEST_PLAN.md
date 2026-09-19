# Kiểm thử thủ công — ghi kết quả thật, không điền sẵn Pass

Ghi cho mỗi case: commit SHA, ngày chạy, thiết bị/browser, bước thực hiện, kết quả mong đợi, kết quả thực tế, Pass/Fail/Blocked, ảnh/log và issue liên quan. Các case chưa chạy ở trạng thái Not run.

| ID | Case | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| S01 | npm install ở root mới | Cài đủ frontend/backend; root lockfile thật được tạo | Not run |
| S02 | npm run build | Build thành công; sửa mọi error; đánh giá warning | Not run |
| P01 | Mở homepage preview | 20 sản phẩm demo; có banner LOCAL PREVIEW | Not run |
| P02 | Chọn Demo Moto/Street 155/2022 | Chỉ hiện sản phẩm có mapping đúng; có trạng thái xe | Not run |
| P03 | Lọc xe không tương thích | Không khẳng định fits; không thêm sai fit vào bag | Not run |
| P04 | Mở GLB, rotate/zoom/reset | Tương tác thực; không chỉ ảnh xoay; nút bàn phím dùng được | Not run |
| P05 | Image mode / asset lỗi / WebGL không hỗ trợ | Có fallback rõ ràng; thông tin sản phẩm vẫn dùng được | Not run |
| P06 | Thêm nhiều sản phẩm, đổi quantity/xóa | Tổng tiền/quantity chính xác; giới hạn hợp lệ | Not run |
| P07 | Tải lại preview | Bag còn nếu storage cho phép; không báo đơn đã lưu server | Not run |
| P08 | Checkout preview | Có nhãn simulated; không hỏi thông tin thẻ; không giả auth | Not run |
| A01 | Seed database riêng | 20 products/8 vehicles; không sửa database gốc | Not run |
| A02 | Register/login/logout API mode | Session thật; state cập nhật; không lộ password/token | Not run |
| A03 | API không chạy hoặc MongoDB lỗi | Hiện lỗi; không tự fallback thành công | Not run |
| A04 | Checkout API, refresh account | Order tồn tại ở MongoDB và tài khoản đúng | Not run |
| A05 | Gửi giá/fitment giả từ client | Server dùng dữ liệu database và từ chối mismatch | Not run |
| A06 | Gửi lặp cùng idempotency key | Không tạo đơn trùng; payload khác bị từ chối | Not run |
| A07 | Customer gọi admin API | Bị từ chối kể cả gọi API trực tiếp | Not run |
| A08 | Admin JSON update/inactivate | Thay đổi persist; item inactive không mua mới | Not run |
| A09 | User A truy cập đơn của user B | Không được lộ dữ liệu user B | Not run |
| A10 | Delete account bằng password xác nhận | Vô hiệu hóa session, xóa demo data theo flow | Not run |
| U01 | Mobile/keyboard/reduced motion | Bố cục không tràn; thao tác chính dùng được; giảm motion | Not run |
| U02 | Thiết bị tầm trung/network hạn chế | Ghi thời gian load/frame behavior thực, chưa đặt số giả | Not run |
| G01 | git status trước commit | Không stage .env/node_modules/dữ liệu cá nhân | Not run |
| G02 | Clone repo mới sang thư mục sạch | npm ci từ lockfile; test/build/dev tái lập được | Not run |

UAT và SUS thực hiện riêng theo proposal; không lấy bảng này thay cho nghiên cứu người dùng.
