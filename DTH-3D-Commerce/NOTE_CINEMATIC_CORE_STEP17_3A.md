# DTH Step 17.3A — Cinematic Entry Core

Phạm vi: **Loader → Login 2.0 → Story → Home**. Không thay backend, database, cart, checkout, model GLB hoặc thông tin fitment.

## Luồng

- Chưa đăng nhập: `/` → loader → Login.
- Đăng nhập mặc định: Story một lần cho mỗi tài khoản trong tab hiện tại.
- Đăng nhập từ `/bag`, `/checkout`, `/shop` hoặc product: giữ nguyên ý định mua hàng.
- Story đã mở trong session: `/` → Home.

## Chạy

```bat
node --test "tests\cinematic173a.test.mjs"
node --test "tests\loader-cinematic.test.mjs"
npm run check
npm test
npm run build
```

API mode:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```

Backend và frontend:

```bat
npm run dev:api
npm run dev
```

Để xem lại loader trong Console trình duyệt:

```js
sessionStorage.removeItem('dth.ignition.seen.v1');
location.href = '/';
```

## Performance

Loader dùng CSS 3D transform/opacity, không video hoặc WebGL. Renderer Home/Story/Login/Product được hoãn cho tới sau intro và hai paint frame. Mobile giảm lớp depth phụ, reduced-motion dùng composition tĩnh.
