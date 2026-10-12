# Step 13.2 — Server Cart Revalidation + Fresh Quote

## 1. Kết quả của bước này

Trang `/bag` gọi bước kiểm tra giỏ trước khi chuyển sang **Review your order**. Ở API mode, giá, trạng thái sản phẩm và độ tương thích của từng cặp sản phẩm–xe được đọc lại từ backend. Kết quả hợp lệ mới cho phép người dùng xác nhận phần mô phỏng và gửi yêu cầu tạo đơn.

Giỏ vẫn lưu các dòng `{ productId, vehicleId, quantity }`. Giá trong catalog đã tải về chỉ dùng làm ước tính trước khi kiểm tra. Khi server trả giá mới, phần review và request tạo đơn sử dụng giá mới đó; catalog cũ trong browser không được thay thế hoặc chặn tổng tiền đã kiểm tra.

Đây tiếp tục là dự án minh họa: dữ liệu tương thích là dữ liệu tổng hợp, đơn hàng là mô phỏng, không thu tiền và không giao hàng. Quote không giữ giá hoặc giữ hàng. Schema hiện tại chưa có số lượng tồn kho.

## 2. Các thành phần liên quan

Các đường dẫn dưới đây tính từ thư mục `DTH-3D-Commerce/`.

| File | Trách nhiệm |
| --- | --- |
| `shared/domain.mjs` | Quy tắc có sẵn về định dạng ID, giới hạn giỏ, gộp dòng và fitment |
| `shared/cartQuote.mjs` | `quoteCart(...)`, kết quả từng dòng và `cartQuoteFingerprint(...)` |
| `shared/cartQuoteResponse.mjs` | Kiểm tra response trước khi frontend công nhận quote |
| `backend/commerce/cart/routes.mjs` | Public endpoint kiểm tra giỏ, giới hạn tần suất và truy vấn catalog |
| `backend/commerce/app.mjs` | Middleware chung, lắp route và kiểm tra lần cuối khi tạo đơn |
| `backend/commerce/models.mjs` | Snapshot tên xe, giá và thông tin quote trong order |
| `frontend/src/shop/api.js` | Chọn adapter, lấy quote, gửi fresh total/fingerprint và bảo vệ CSRF theo phiên |
| `frontend/src/shop/flowSession.mjs` | Quote và order mô phỏng trong Flow mode |
| `frontend/src/shop/cart/cartState.mjs` | Bộ trạng thái giỏ đồng bộ và revision |
| `frontend/src/shop/cart/useCartState.js` | Cầu nối trạng thái giỏ với React |
| `frontend/src/shop/useStore.jsx` | Revision của catalog và danh tính; cung cấp snapshot hiện tại |
| `frontend/src/shop/cart/page/cartQuoteReview.mjs` | Request quote, kiểm tra response, loại bỏ response cũ và quản lý review/acknowledgement |
| `frontend/src/shop/cart/page/checkoutSession.mjs` | Submit guard, idempotency intent và xử lý kết quả tạo đơn |
| `frontend/src/shop/cart/page/useCartReview.js` | Tích hợp quote, chỉnh giỏ và checkout vào trang |
| `frontend/src/shop/cart/page/FullCartPage.jsx` | Nguồn quote, thời điểm kiểm tra, giá thay đổi và thao tác review |
| `frontend/src/shop/StoreApp.jsx`, `frontend/src/shop/account/AccountPage.jsx` | Receipt ưu tiên tên xe đã lưu cùng đơn |

## 3. Endpoint kiểm tra giỏ

```http
POST /api/shop/cart/quote
Content-Type: application/json
Origin: http://localhost:5173
```

Endpoint này không yêu cầu đăng nhập. Khách có thể xem kết quả kiểm tra trước khi đăng nhập để tạo đơn. Endpoint vẫn chịu middleware `Origin`, JSON và giới hạn body của ứng dụng; public không có nghĩa là bỏ các middleware đó.

Ví dụ request dùng ID có trong `shared/catalog.json`:

```json
{
  "items": [
    { "productId": "apex-suspension", "vehicleId": "street155-2022", "quantity": 1 },
    { "productId": "apex-suspension", "vehicleId": "street155-2023", "quantity": 2 }
  ]
}
```

Hai dòng trên là cùng một phụ tùng cho hai xe khác nhau. Chúng được kiểm tra và giữ riêng. Header vehicle không tham gia vào việc chọn xe thay cho các dòng này.

Route gọi `normalizeItems` trước khi truy vấn database. Các ID và quantity không hợp lệ bị từ chối ngay. Các dòng trùng cả `productId` lẫn `vehicleId` được gộp và sắp xếp theo quy tắc hiện có. Sau đó, backend chỉ đọc các product ID và vehicle ID có trong request. Truy vấn sản phẩm bao gồm bản ghi inactive để có thể trả lý do không còn bán.

Kết quả thành công có envelope `{ data: quote }`. HTTP 200 có thể chứa quote hợp lệ hoặc quote có dòng cần xử lý; `data.valid` mới cho biết giỏ có thể tiếp tục hay không.

### Các trường của quote

| Trường | Ý nghĩa |
| --- | --- |
| `version` | `1`, phiên bản contract |
| `source` | `api`, `flow` hoặc `preview` |
| `quotedAt` | Thời điểm tính quote, dạng ISO UTC; API lấy thời điểm phía server |
| `items` | Giỏ đã normalize; chỉ gồm danh tính dòng và quantity |
| `lines` | Kết quả của tất cả các dòng, kể cả dòng không hợp lệ |
| `valid` | Chỉ `true` khi mọi dòng có trạng thái `compatible` |
| `subtotal`, `total` | Số nguyên VND khi hợp lệ; cả hai là `null` nếu có bất kỳ dòng lỗi |
| `currency` | `VND` |
| `delivery` | `0` trong mô phỏng hiện tại |
| `paymentStatus` | `simulated` |
| `inventoryChecked` | Luôn `false` vì chưa có dữ liệu số lượng tồn kho |
| `fingerprint` | Biểu diễn ổn định của các thông tin vừa được kiểm tra |

Mỗi phần tử `lines` có `productId`, `vehicleId`, `quantity`, `name`, `vehicleLabel`, `unitPrice`, `lineTotal`, `status` và `issue`. Với dòng hợp lệ, `issue` là chuỗi rỗng. Với dòng lỗi, `issue` mô tả việc cần xử lý.

Theo giá của fixture ở bản này, request ví dụ trên cho kết quả:

| Sản phẩm | Xe của dòng | Quantity | Unit price | Line total |
| --- | --- | ---: | ---: | ---: |
| Apex Coilover | `street155-2022` | 1 | 2.800.000 VND | 2.800.000 VND |
| Apex Coilover | `street155-2023` | 2 | 2.800.000 VND | 5.600.000 VND |

Nếu database có cùng dữ liệu fixture và cả hai fitment hợp lệ, `subtotal` và `total` là `8400000`. Trong API mode, con số thực tế phụ thuộc dữ liệu database tại lần kiểm tra; không lấy con số minh họa trong tài liệu làm giá chuẩn.

### Giới hạn của request

- Từ 1 đến 20 dòng trước khi gộp.
- `productId` và `vehicleId` là chuỗi 1–80 ký tự thuộc `[a-z0-9-]`.
- Quantity phải là số nguyên từ 1 đến 10; không ép chuỗi `"2"` thành số.
- Sau khi gộp, tổng quantity của mỗi cặp sản phẩm–xe không vượt 10.
- Body JSON tối đa 32 KB theo middleware chung.
- Route quote dùng rate limiter hiện có: 60 request/phút/IP, bộ đếm trong memory của một process. Khi vượt giới hạn, trả 429 và `Retry-After`.

Frontend chỉ gửi các trường định danh và quantity. Nếu caller khác gửi thêm giá, tên, tổng tiền, active hoặc thông tin tồn kho, các trường đó không quyết định kết quả quote. Response dùng `Cache-Control: no-store`. Route không tạo session, đơn hàng, thanh toán hoặc reservation.

## 4. Phân biệt lỗi request và dòng không hợp lệ

### Request sai định dạng: HTTP 400

Ví dụ: thiếu `items`, giỏ rỗng, quá 20 dòng, quantity bằng 0, quantity thập phân, quantity là chuỗi, ID là object hoặc quantity sau khi gộp vượt 10. Những trường hợp này không tạo truy vấn Product/Vehicle.

JSON không parse được cũng trả 400. Middleware chung trả 403 nếu Origin không được chấp nhận, 415 nếu POST không dùng JSON, và 413 nếu body quá lớn. Lỗi đọc database đi qua error handler của API; không trả một quote local thay thế.

### Dữ liệu nghiệp vụ không còn hợp lệ: HTTP 200 với `valid: false`

| `lines[].status` | Điều kiện | Tiền trên dòng |
| --- | --- | --- |
| `compatible` | Sản phẩm còn bán, giá hợp lệ và khớp xe đã chọn | Có `unitPrice` và `lineTotal` |
| `unavailable` | Không tìm thấy sản phẩm hoặc `active === false` | Cả hai là `null` |
| `price-unavailable` | Giá không hợp lệ hoặc currency được khai báo khác VND | Cả hai là `null` |
| `unknown` | Xe không có trong catalog hoặc không có dữ liệu fitment của sản phẩm | Vẫn trả giá hiện tại nếu giá hợp lệ |
| `incompatible` | Có dữ liệu fitment nhưng không khớp xe của dòng | Vẫn trả giá hiện tại nếu giá hợp lệ |

Tất cả các dòng còn lại vẫn xuất hiện trong response. Nếu một dòng lỗi và một dòng hợp lệ, tổng giỏ vẫn là `null`; frontend không dùng tổng riêng của các dòng tốt như tổng có thể xác nhận.

Ví dụ, `vehicleId: "vehicle-no-longer-listed"` đúng định dạng nhưng không có trong catalog là lỗi nghiệp vụ `unknown`. `vehicleId: { "$ne": "" }` là request sai định dạng và bị từ chối trước truy vấn.

## 5. Tiền tệ, trạng thái bán và tồn kho

Số tiền dùng số nguyên VND. Theo quy tắc quote hiện có, đơn giá hợp lệ nằm trong khoảng 0 đến 1.000.000.000; mỗi line total là `unitPrice × quantity`. Không dùng phép làm tròn để chấp nhận giá thập phân. Quy tắc nhập sản phẩm trong admin vẫn yêu cầu giá dương; quote giữ tương thích với domain hiện có cho bản ghi giá 0.

Bản ghi legacy chưa có `currency` kế thừa VND theo mặc định của schema. Nếu bản ghi ghi rõ một currency khác `VND`, quote trả `price-unavailable`; không gắn nhãn VND cho một số tiền thuộc currency khác.

`active` chỉ cho biết sản phẩm có còn được bán trong catalog. Giới hạn 10 sản phẩm/xe là giới hạn của mô phỏng. Cả hai không thay thế một hệ thống kiểm kho. Vì Product schema chưa có trường số lượng tồn, response luôn ghi `inventoryChecked: false`; không trừ hàng và không hứa giữ hàng sau khi review.

## 6. API, Flow và Preview

| Mode | Nguồn quote | Nơi xử lý order | Nhãn trên giao diện |
| --- | --- | --- | --- |
| `api` | Backend đọc Product/Vehicle từ MongoDB | Backend kiểm tra và lưu đơn mô phỏng sau khi đăng nhập | `Server checked` |
| `flow` | `createFlowSession` đọc catalog fixture hiện tại | Order trong state của adapter, lưu session storage của tab nếu khả dụng | `Flow catalog checked` |
| `preview` | Catalog JSON được bundle trong frontend | Kết quả mô phỏng local; không gửi order lên server | `Preview catalog checked` |

`requestCartQuote` kiểm tra source trả về phải trùng mode đang chạy. API mode không chuyển sang Flow hoặc Preview khi request thất bại. Flow/Preview không được hiển thị như đã xác minh bằng database.

Ở `/bag`, lỗi nghiệp vụ trong catalog browser cũ không chặn việc xin quote mới. Giỏ phải không rỗng, normalize được và không ở trạng thái tải catalog/lỗi tải catalog/đang gửi order; sau đó authoritative quote quyết định trạng thái từng dòng. Điều này cho phép kiểm tra lại một sản phẩm mà browser vẫn cho rằng không khả dụng nhưng nguồn dữ liệu mới đã sửa.

## 7. Fingerprint và lần kiểm tra cuối khi tạo đơn

`cartQuoteFingerprint(quote)` tạo canonical JSON từ các dòng đã sắp xếp, gồm product ID, vehicle ID, quantity, tên sản phẩm, tên xe, đơn giá, thành tiền, trạng thái và các trường tổng tiền/tiền tệ. `source`, `quotedAt` và câu giải thích `issue` không tham gia fingerprint.

Fingerprint dùng để phát hiện các thông tin người dùng vừa xem bị thay đổi. Nó không phải hash bí mật, chữ ký, access token hay bằng chứng được cấp quyền. Server không tin một fingerprint do client gửi rồi bỏ kiểm tra catalog.

Ví dụ, giá dòng A tăng 20.000 VND và giá dòng B giảm 20.000 VND có thể làm tổng giỏ giữ nguyên. So sánh `expectedTotal` không phát hiện trường hợp này, nhưng fingerprint của từng dòng thay đổi. Tên xe hoặc tên sản phẩm đổi cũng làm fingerprint đổi. Chỉ timestamp đổi thì không.

UI mới gửi tới `POST /api/shop/orders`:

- `items`: giỏ đã normalize.
- `idempotencyKey`: khóa của ý định đặt cùng giỏ trong cùng account/mode.
- `demoAcknowledged: true`: sau khi người dùng xác nhận phần mô phỏng.
- `expectedTotal`: tổng của quote đã xem.
- `expectedQuoteFingerprint`: fingerprint của quote đã xem.

Đối với một yêu cầu tạo đơn mới, backend tiếp tục yêu cầu session và CSRF, rồi đọc lại catalog. Dòng không hợp lệ, tổng thay đổi hoặc fingerprint không còn khớp sẽ chặn tạo đơn; frontend vô hiệu hóa review và yêu cầu kiểm tra lại. New adapter không tính lại tổng từ catalog browser cũ trước khi gửi yêu cầu này.

`expectedQuoteFingerprint` là trường tùy chọn ở backend để tương thích client cũ; client không gửi trường đó vẫn chịu kiểm tra catalog và `expectedTotal`. Trang `/bag` mới luôn gửi fingerprint.

### Idempotency và retry

Backend tìm order có cùng user và `idempotencyKey` trước khi kiểm tra lại catalog. Nếu order đã tồn tại và giỏ normalize khớp request hash, backend trả receipt của order đó. Vì vậy, retry sau một response bị mất không tạo order mới hoặc đổi snapshot của order đã lưu, kể cả catalog đã thay đổi sau lần tạo thành công.

Cùng key nhưng payload giỏ khác bị từ chối. Flow adapter giữ quy tắc replay tương ứng trong state local. Frontend giữ intent khi request thất bại hoặc timeout; chỉ kết thúc intent sau khi xử lý thành công. Đây là bảo vệ việc gửi lặp trong luồng mô phỏng, không phải cơ chế khóa giá hay giao dịch tồn kho.

### Snapshot của order và receipt

Order lưu `name`, `vehicleLabel`, quantity, unit price và line total của từng dòng; cấp order có `quotedAt` và `quoteFingerprint`. `quotedAt` ở order là thời điểm server kiểm tra lần cuối lúc tạo đơn, có thể khác thời điểm của quote ban đầu.

Receipt ưu tiên `line.vehicleLabel` đã lưu. Order cũ chưa có field này vẫn fallback về tên xe trong catalog hoặc vehicle ID. Đổi tên xe trong catalog sau này vì vậy không làm thay đổi label của các order mới đã lưu snapshot.

## 8. Chặn response cũ và ràng buộc acknowledgement

Quote không chỉ gắn với chuỗi product ID. Context của review bao gồm account/identity, revision của giỏ, nội dung giỏ, revision và dữ liệu catalog, cùng trạng thái tải/lỗi catalog. Mỗi lần xin quote còn có thứ tự request riêng.

`createCartState` cập nhật revision đồng bộ, trước React render. Nếu giỏ đổi A → B → A trong cùng chu kỳ render, revision vẫn đổi dù payload cuối giống payload ban đầu. `getBagSnapshot`, `getIdentityEpoch` và `getCatalogEpoch` cho controller đọc trạng thái mới nhất khi promise hoàn thành.

Các hành vi được bảo vệ:

- Đổi quantity, đổi xe, thêm hoặc xóa dòng làm review/acknowledgement trước đó mất hiệu lực.
- Catalog refresh hoặc thay account làm quote cũ mất hiệu lực.
- Request cũ hoàn thành sau request mới không được ghi đè kết quả mới.
- Rời trang hoặc dispose controller khiến callback cũ bị bỏ qua.
- Giỏ bị làm rỗng trong khi đợi quote không thể đi tiếp bằng quote trước đó.
- Lỗi network, response sai contract hoặc timeout giữ giỏ để người dùng thử lại.
- Acknowledgement gắn với đúng generation và fingerprint đã hiển thị; quote mới cần xác nhận lại.
- Checkout khóa submit lặp; response order không xóa một giỏ đã đổi revision/payload trong thời gian chờ, và không xử lý như thành công cho account đã thay đổi.

Frontend kiểm tra contract của response trước khi áp dụng: đúng mode, version, timestamp, các dòng đúng request, không thiếu/trùng dòng, arithmetic đúng, valid/totals nhất quán và fingerprint khớp. Những kiểm tra này bổ sung cho việc kiểm tra trên server, không biến frontend thành nguồn quyết định giá.

### Sửa race giữa CSRF và auth response

`StoreProvider` bảo vệ cập nhật user bằng identity epoch. API adapter còn có `authGeneration` riêng cho CSRF. Một `/auth/me` cũ hoàn thành sau login không được xóa hoặc thay CSRF của phiên mới, dù React đã bỏ qua user snapshot cũ.

Login/register, logout và xóa account thay đổi generation; chỉ response thuộc generation hiện tại được cập nhật token. Cách này xử lý trường hợp request session cũ vẫn đang chạy sau cleanup, gồm tình huống StrictMode trong development. Nếu không có guard ở API layer, UI có thể hiện account mới nhưng request checkout gửi CSRF trống/cũ và bị server trả 403.

## 9. Kiểm tra đã thực hiện

Chạy nhóm kiểm tra của bước này từ root app:

```sh
npm run test:cart-quote
```

Nhóm này gồm 263 test/subtest, đã pass ở lần kiểm tra của bản triển khai:

| Nhóm | Files | Số test/subtest |
| --- | --- | ---: |
| Shared quote, HTTP quote route và order recheck | `tests/cart-quote.test.mjs`, `tests/cart-quote.route.test.mjs`, `tests/cart-quote.order.test.mjs` | 78 |
| Adapter, response contract, mode và auth/CSRF race | `tests/cart-quote-adapters.test.mjs` | 30 |
| Quote/review/checkout controller mới | `tests/cart-review.test.mjs` | 29 |
| Regression của cart drawer và full cart có sẵn | `tests/cart-drawer.test.mjs`, `tests/full-cart.test.mjs` | 126 |
| **Tổng** | Script `test:cart-quote` | **263** |

Các ca trọng tâm gồm: cùng sản phẩm cho hai xe, gộp duplicate đúng giới hạn, input sai không truy vấn DB, không tin giá client, giữ dòng lỗi, số nguyên VND, giá thay đổi bù trừ, tên xe thay đổi, replay order, guest quote không tạo session/order, middleware Origin/JSON/body size, rate limit, response lệch source/thiếu dòng, catalog cũ không chặn fresh quote, A → B → A, response đảo thứ tự, retry, unmount và stale auth response.

Các HTTP test mở Express server thật và gửi HTTP request thật. Product/Vehicle/Session/Order operations dùng model doubles trong memory; test order còn dùng Mongoose schema thật để kiểm tra việc giữ/cast các snapshot mới. **Bộ kiểm tra này chưa chạy với MongoDB thật.** Kết quả pass không chứng minh persistence qua restart, cấu hình Mongo của máy triển khai hoặc hoạt động full stack trên một database thật.

Script `npm test` mặc định của dự án vẫn là nhóm baseline riêng. Khi kiểm tra Step 13.2, cần chạy `npm run test:cart-quote` để bao gồm các file mới; không dùng kết quả của `npm test` một mình để kết luận bước này đã được kiểm tra.
