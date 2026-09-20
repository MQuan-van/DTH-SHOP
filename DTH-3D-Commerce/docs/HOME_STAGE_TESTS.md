# Home Stage 1 — báo cáo kiểm tra

## Cơ sở và môi trường

Source lấy từ DTH-3D-Commerce-Standalone.zip đã cung cấp trong cuộc trò chuyện, không phải từ một repository GitHub mới chưa được cung cấp.
Môi trường: Linux, Node.js 22.16.0, npm 10.9.2, Chromium qua Playwright. Không có node_modules của ứng dụng.

## Đã thực hiện

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `npm run check` | Pass | Cấu trúc và import local, không cài thư viện |
| `npm test` của baseline | 61/61 pass | Các test Node cũ; không chứng minh React/WebGL hoạt động |
| `node --test tests/home-stage.test.mjs` | 8/8 pass | Chọn exhibit/fallback, cấu hình section/camera, assets local |
| Bộ test updater | 11/11 pass | Dry-run, apply, idempotence, restore, từ chối xung đột/symlink/bundle hỏng; thử Unicode/space trên Linux, không phải Windows thật |
| TypeScript transpileModule parse | 18 JS/JSX/MJS, không diagnostic cú pháp | Không typecheck thư viện và không phải Vite build |
| PostCSS parse | 8 stylesheet, không lỗi parser | Không chứng nhận accessibility hoặc mọi trình duyệt |
| Layout CSS tĩnh bằng Chromium | 1440×1000, 1024×850, 768×1024, 390×844, 320×780; không overflow ngang, assets ảnh hiện | Dùng markup lấy từ JSX với hook/router stub và ảnh render từ GLB; không chạy React, API hoặc WebGL |
| So sánh file baseline | Backend, shared, API, StoreProvider, Viewer3D và package files không đổi | StoreApp thay riêng Home, tái sử dụng card/icon và thêm Studio link |

## Không được coi là đã pass

`npm run build` đã thử và dừng với `vite: not found`. Registry npm không phân giải được hostname trong môi trường này, vì vậy không thể cài dependencies để chạy build.

Chưa kiểm thử React lifecycle thực, R3F render/camera/controls, tốc độ frame trên GPU, browser navigation thật, fallback context loss thực, tích hợp MongoDB, chức năng đăng nhập/checkout hoặc triển khai online.
Không có kết quả FPS, Lighthouse, UAT hay SUS nào được suy ra từ bản cập nhật.

## Ảnh bố cục

`layout-desktop.png` và `layout-mobile.png` là ảnh **bố cục tĩnh ở trạng thái ảnh đang tải**. Model trong ảnh là raster từ GLB hiện có, không phải screenshot ứng dụng React đã build. Chỉ dùng để kiểm tra khoảng cách, thứ tự nội dung và breakpoint.

## Kiểm tra tiếp trên máy người dùng

Chạy `npm run build` với bộ dependencies đang chạy được của bạn. Nếu build pass, thử các trường hợp trong `docs/HOME_STAGE_VI.md` của project, đặc biệt đổi qua lại sản phẩm đã cached, Image → View 3D, Inspect → Escape, và giữ state xe/giỏ hàng sau điều hướng.
