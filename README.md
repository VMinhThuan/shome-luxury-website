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
- **`/admin/images`**: Quản lý hình ảnh trang chủ
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
- Khi chưa đăng nhập, truy cập `/admin/images` hoặc `/admin/bao-gia` sẽ được máy chủ tự động chuyển hướng về `/admin/login`.
- Đăng nhập thành công sẽ tự động chuyển hướng đến `/admin/images`.
- Phiên làm việc được quản trị bằng HTTP-only cookie (`shome_admin_session`) có thời hạn 7 ngày.
- Toàn bộ API chỉnh sửa, tải lên và xóa ảnh (`/api/admin/*`, `/api/upload`) được bảo vệ nghiêm ngặt bằng JWT xác thực và phân quyền phía server.

