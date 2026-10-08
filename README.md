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

## Quản trị trang Báo giá

Khu vực quản trị chọn công trình **Highlight** được tách theo subdomain. Khi chạy local, mở `http://admin.localhost:3030/admin/login`. Trên môi trường production, trỏ DNS `admin.ten-mien-cua-ban` vào cùng deployment và thiết lập các biến môi trường sau (không commit mật khẩu vào source):

```bash
NODE_ENV=production
ADMIN_HOST=admin.ten-mien-cua-ban
ADMIN_USER=<tai-khoan-admin>
ADMIN_PASS=<mat-khau-manh>
JWT_SECRET=<chuoi-ngau-nhien-dai>
```

Trang `/admin/bao-gia` bắt buộc có phiên đăng nhập. Phiên được lưu bằng cookie HTTP-only, thời hạn 7 ngày; đăng xuất sẽ xoá phiên. Trong màn hình quản trị, bật **Highlight**, bật **Hiển thị** và đặt **Thứ tự** để đưa công trình lên trang Báo giá (tối đa 4 công trình mỗi category).
