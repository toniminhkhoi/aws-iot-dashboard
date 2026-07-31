# AWS IoT Dashboard — Frontend (React + Vite + Tailwind CSS)

[English](README.md)

Giao diện giám sát và điều khiển thiết bị IoT thời gian thực trên nền tảng AWS Cloud. Tích hợp cơ chế theo dõi nguồn dữ liệu (Granular Source Tracking) và tự động phục hồi kết nối (Fail-Proof Engine).

---

## 1. Yêu cầu hệ thống
- Node.js (phiên bản 18.x hoặc 20.x trở lên)
- npm hoặc yarn

## 2. Cài đặt từ đầu (Fresh Install)

Mở terminal tại thư mục gốc của dự án (`aws-iot-dashboard`), sau đó thực hiện các bước:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt toàn bộ các thư viện cần thiết
npm install
```

## 3. Cấu hình backend

Trong môi trường development, các request bắt đầu bằng `/api` được Vite chuyển
tiếp đến backend được cấu hình trong `vite.config.ts`:

```ts
proxy: {
  '/api': {
    target: 'http://<BACKEND_HOST>:8000',
    changeOrigin: true,
    secure: false,
  },
},
```

Thay `<BACKEND_HOST>` bằng địa chỉ backend local hoặc DNS name của backend ALB.
Không commit thông tin xác thực hoặc secret vào source frontend.

## 4. Chạy development

```bash
npm run dev
```

Mở `http://localhost:5173`.

## 5. Kiểm tra và build production

```bash
npm run lint
npm run build
npm run preview
```

Output production được tạo trong thư mục `dist/`.

## 6. Triển khai lên S3 và CloudFront

Upload bản build production lên frontend S3 bucket ở chế độ private rồi xóa
cache CloudFront:

```powershell
aws s3 sync dist "s3://<FRONTEND_BUCKET>" --delete
aws cloudfront create-invalidation `
  --distribution-id "<CLOUDFRONT_DISTRIBUTION_ID>" `
  --paths "/*"
```

Dùng S3 bucket làm default origin của CloudFront thông qua Origin Access
Control. Dùng Application Load Balancer làm origin thứ hai và chuyển `/api/*`
đến origin này, tắt cache và cho phép các HTTP method cần thiết. Gắn WAF web
ACL vào CloudFront distribution.

## 7. Các script

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy Vite development server |
| `npm run build` | Type-check và build production |
| `npm run lint` | Chạy Oxlint |
| `npm run preview` | Xem thử production build |
