# shome-luxury-website

Website giới thiệu xưởng sản xuất, thiết kế & thi công nội thất gỗ công nghiệp cao cấp **Shome Luxury**.

## Tính năng chính & Giao diện:
- Giao diện cao cấp, chuẩn Responsive (Mobile & Desktop).
- Slider tương tác 3 Slide hình ảnh xưởng sản xuất thực tế.
- Tích hợp 3 nút liên hệ nhanh (**Gọi ngay**, **Chat Zalo**, **Messenger**) với hiệu ứng chuyển động mượt mà.
- Nút nổi Speed-Dial **(+)** liên hệ nhanh.
- Tối ưu hóa tốc độ tải trang (Gzip compression, Browser Caching, Resource Preloading, Async Decoding).

## Hướng dẫn chạy máy cục bộ (Local):
```bash
npm install
npm run dev
```
Truy cập: `http://localhost:3030`

## Quản trị CMS Admin (Báo giá & Hình ảnh)

Website public và CMS Admin sử dụng chung domain Vercel (không cần subdomain hay `ADMIN_HOST`).
- **`/`**: Website public
- **`/admin/login`**: Trang đăng nhập quản trị
- **`/admin`**: Route tương thích, tự chuyển thẳng tới `/admin/images`
- **`/admin/images`**: Quản lý hình ảnh trang chủ
- **`/admin/thiet-ke-cong-trinh`**: Quản lý công trình thiết kế
- **`/admin/thi-cong-cong-trinh`**: Quản lý công trình thi công
- **`/admin/bao-gia`**: Quản trị nội dung & Highlight công trình Báo giá

### Cấu hình biến môi trường trên Vercel:
```bash
NODE_ENV=production
MONGODB_URI=<chuoi-ket-noi-mongodb>
JWT_SECRET=<chuoi-ngau-nhien-dai>
ADMIN_USER=<tai-khoan-admin>
ADMIN_PASS=<mat-khau-manh>
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```
*Lưu ý: Không cần cấu hình `ADMIN_HOST` hay `ADMIN_COOKIE_DOMAIN` khi dùng chung domain.*

### Cơ chế bảo mật:
- Khi chưa đăng nhập, truy cập `/admin` hoặc bất kỳ module `/admin/*` nào sẽ được máy chủ tự động chuyển hướng về `/admin/login`.
- Đăng nhập thành công sẽ tự động chuyển hướng thẳng đến `/admin/images`.
- Phiên làm việc được quản trị bằng HTTP-only cookie (`shome_admin_session`) có thời hạn 7 ngày.
- Toàn bộ API chỉnh sửa, tải lên và xóa ảnh (`/api/admin/*`, `/api/upload`) được bảo vệ nghiêm ngặt bằng JWT xác thực và phân quyền phía server.

### CI/CD production trên VPS

Workflow `.github/workflows/deploy-production.yml` chạy test khi push lên `main`, sau đó dùng SSH để cập nhật đúng working tree aaPanel hiện có trên VPS. Workflow không clone thêm project, không ghi đè `.env.local`/`.htaccess`, không thay đổi Nginx/SSL/database/uploads, và restart thông qua aaPanel Node.js Project `shomeluxury_node`.

Cần cấu hình một lần trong GitHub repository secrets:

- `VPS_DEPLOY_ENABLED` (`false` để preflight, chỉ chuyển sang `true` sau khi đã xác nhận cấu hình)
- `VPS_HOST`, `VPS_PORT` (tuỳ chọn, mặc định `22`), `VPS_USER` (`root` theo VPS hiện tại)
- `VPS_SSH_PRIVATE_KEY`, `VPS_SSH_KNOWN_HOSTS`
- `VPS_AAPANEL_API_URL`, `VPS_AAPANEL_API_KEY` (bắt buộc khi deploy thật)
- `VPS_APP_DIR` (tuỳ chọn, mặc định `/www/wwwroot/shomeluxury-node`)
- Tuỳ chọn: `VPS_HEALTHCHECK_URL`, `VPS_ADMIN_HEALTHCHECK_URL`, `VPS_API_HEALTHCHECK_URL`

VPS cần có sẵn Git remote `origin`, branch `main`, user `www` sở hữu working tree và quyền SSH root để gọi API aaPanel. Khi push lên `main`, workflow chạy test, VPS pull code mới, chạy `npm ci --omit=dev` nếu dependency thay đổi, chạy `npm run build` để kiểm tra backend EJS và frontend CSS/JS, sau đó aaPanel restart project `shomeluxury_node`. Vì frontend là CSS/JS tĩnh được Express phục vụ cùng backend, không cần tách hai lệnh build riêng. Workflow kiểm tra frontend/admin/API và tự rollback source plus dependency về commit trước nếu cập nhật hoặc health check thất bại. Chế độ `dry-run` chỉ kiểm tra owner, branch, remote, PID, parent/child process và listener port 3030; không pull, không chạy npm và không restart.

## Facebook Feed Preview

The footer Facebook card reads Page posts only through the backend endpoint
`GET /api/facebook/posts`. Configure the Meta credentials in the deployment
environment (never in frontend code):

```env
FACEBOOK_PAGE_ID=1266727566524961
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_GRAPH_API_VERSION=v21.0
FACEBOOK_CACHE_TTL_MS=900000
```

The backend validates that the token belongs to the configured Page, requests
`/{page-id}/published_posts`, and keeps the latest successful response in a
15-minute in-memory cache. If Meta is unavailable, the endpoint returns the
last cached posts when available; otherwise the card keeps its Fanpage
identity and external Facebook links without fake posts.
