# AWS IoT Monitoring and Control Dashboard

Hệ thống giám sát và điều khiển thiết bị IoT sử dụng FastAPI, React, PostgreSQL, YOLO UNO và các dịch vụ AWS.

[English](README.md)

---

## 1. Tổng quan

Project xây dựng một hệ thống giám sát và điều khiển IoT hoàn chỉnh từ thiết bị phần cứng đến giao diện người dùng.

Thiết bị **YOLO UNO** thu thập nhiệt độ, độ ẩm và cường độ ánh sáng, sau đó gửi
telemetry qua HTTP đến Application Load Balancer (ALB). ALB phân phối request
đến các FastAPI backend instance trong Auto Scaling group hoạt động trên hai
Availability Zone. Backend lưu telemetry và command trong Amazon RDS for
PostgreSQL Multi-AZ.

Bản build production của React + Vite được lưu trên Amazon S3 và phân phối qua
Amazon CloudFront, có AWS WAF bảo vệ. CloudFront phục vụ dashboard tĩnh từ S3
và chuyển các request `/api/*` đến backend ALB. Hardware cũng định kỳ lấy
command đang chờ từ ALB, thực thi và gửi ACK xác nhận. Amazon CloudWatch thu
thập log backend và metric hạ tầng.

### Chức năng chính

- Thu thập nhiệt độ, độ ẩm và cường độ ánh sáng.
- Lưu telemetry vào PostgreSQL trên Amazon RDS.
- Hiển thị telemetry mới nhất và dữ liệu lịch sử.
- Điều khiển quạt, đèn và rèm từ xa.
- Quản lý trạng thái command từ `Pending` sang `Executed`.
- Hardware gửi ACK sau khi thực hiện command.
- Phân phối frontend tĩnh trên toàn cầu bằng S3, CloudFront và AWS WAF.
- Phân phối lưu lượng API qua Application Load Balancer.
- Tự động scale và thay thế backend instance bằng Auto Scaling group và backend AMI.
- Sử dụng RDS PostgreSQL Multi-AZ với đồng bộ dữ liệu và tự động failover.
- Mã hóa các tài nguyên lưu trữ được hỗ trợ bằng AWS managed KMS key.
- Lưu backup RDS trong 7 ngày.
- Theo dõi log backend và metric hạ tầng bằng Amazon CloudWatch.

---

## 2. Architecture

<p align="center">
  <img
    src="diagrams/aws-iot-dashboard-architecture.png"
    alt="AWS IoT Monitoring and Control Dashboard Architecture"
    width="100%"
  />
</p>

Hệ thống được triển khai tại AWS Region Singapore (`ap-southeast-1`):

1. Web user kết nối qua HTTPS, đi qua AWS WAF đến CloudFront.
2. Default behavior của CloudFront phục vụ bản build tĩnh React + Vite từ
   frontend S3 bucket.
3. CloudFront chuyển các request `/api/*` đến IoT backend ALB.
4. YOLO UNO giao tiếp trực tiếp với cùng ALB qua HTTP.
5. ALB thực hiện health check và tiếp nhận lưu lượng ứng dụng.
6. Target group chuyển tiếp HTTP trên port `8000` đến các FastAPI instance
   thuộc Auto Scaling group trong public subnet tại `ap-southeast-1a` và
   `ap-southeast-1c`.
7. Backend instance kết nối đến RDS endpoint qua TCP `5432`.
8. Amazon RDS for PostgreSQL chạy primary database trong private subnet tại
   `ap-southeast-1c` và standby database tại `ap-southeast-1b`.
9. RDS đồng bộ dữ liệu sang standby và hỗ trợ tự động failover.

Backend instance được tạo từ backend AMI và sử dụng EBS volume. IAM role cấp
quyền cho workload, CloudWatch nhận log và metric, AWS managed KMS key bảo vệ
các tài nguyên được mã hóa, và backup database được lưu trong 7 ngày.


### Dịch vụ AWS

- Amazon S3
- Amazon CloudFront
- AWS WAF
- Elastic Load Balancing — Application Load Balancer
- Amazon EC2 Auto Scaling
- Amazon EC2 và Amazon Machine Images
- Amazon EBS
- Amazon RDS for PostgreSQL Multi-AZ
- Amazon VPC, public/private subnet và Security Group
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch
- AWS Key Management Service (AWS KMS)
- RDS automated backup


---

## 3. Phân công thành viên

| Thành viên | Phụ trách |
|---|---|
| **Phạm Lê Minh Khôi** | Hạ tầng AWS, triển khai EC2, RDS, CloudWatch, Security Groups, DevOps và phần cứng YOLO UNO |
| **Thượng Đình Hưng** | Frontend React + Vite, giao diện dashboard, tích hợp tổng thể hệ thống, debug và quay video demo project |
| **Ngô Minh Thuận** | Backend FastAPI, API endpoint, tích hợp database và xử lý command |
| **Lê Bảo Khánh** | Documentation, proposal, blog, worklog theo tuần và báo cáo event |

---

## 4. Công nghệ sử dụng

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- PostgreSQL
- systemd

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS

### Hardware

- YOLO UNO / ESP32-S3
- PlatformIO
- Arduino framework
- Cảm biến nhiệt độ và độ ẩm DHT20
- Cảm biến ánh sáng analog
- Module quạt
- Module đèn LED Grove
- Servo motor
- Màn hình LCD1602 I2C

### AWS

- Amazon S3
- Amazon CloudFront
- AWS WAF
- Application Load Balancer
- Amazon EC2 Auto Scaling
- Amazon EC2
- Amazon Machine Images
- Amazon EBS
- Amazon RDS for PostgreSQL Multi-AZ
- Amazon VPC
- Security Groups
- AWS IAM Role
- Amazon CloudWatch
- AWS KMS
- RDS automated backup

---

## 5. Cấu trúc repository và vị trí nộp bài

Project sử dụng hai repository:

1. Một **repository báo cáo Hugo riêng** được dùng để nộp báo cáo thực tập.
   Nội dung workshop này nằm trong `content/5-Workshop/`.
2. **`aws-iot-dashboard`** là repository source hiện tại, chứa toàn bộ backend,
   frontend và firmware YOLO UNO.

### Repository nộp báo cáo

```text
submission-report/
├── .github/
│   └── workflows/                 # Triển khai GitHub Pages
├── archetypes/                    # Template nội dung Hugo
├── content/
│   ├── 1-Worklog/
│   ├── 2-Proposal/
│   ├── 3-BlogsTranslated/
│   ├── 4-EventParticipated/
│   ├── 5-Workshop/                # Workshop AWS IoT Dashboard này
│   ├── 6-Self-evaluation/
│   ├── 7-Feedback/
│   ├── _index.md
│   └── _index.vi.md
├── layouts/                       # Layout Hugo tùy chỉnh
├── static/                        # Hình ảnh và tài nguyên tĩnh
├── themes/
│   └── hugo-theme-learn/
├── config.toml
└── README.md
```

### Repository source của workshop

```text
aws-iot-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/                  # Route health, telemetry và device command
│   │   ├── database/             # PostgreSQL session và khởi tạo database
│   │   ├── models/               # SQLAlchemy model
│   │   ├── schemas/              # Pydantic request và response schema
│   │   ├── services/             # Nghiệp vụ telemetry và command
│   │   └── setting.py            # Cấu hình môi trường backend
│   ├── main.py                   # Điểm khởi chạy FastAPI
│   ├── simulator.py              # Chương trình mô phỏng thiết bị
│   ├── requirements.txt
│   ├── README.md
│   └── README.vi.md
├── frontend/
│   ├── public/                   # Tài nguyên tĩnh
│   ├── src/
│   │   ├── assets/               # Hình ảnh dashboard
│   │   ├── services/             # API và ánh xạ dữ liệu IoT
│   │   ├── App.tsx               # Dashboard chính
│   │   └── main.tsx              # Điểm khởi chạy React
│   ├── package.json
│   ├── vite.config.ts
│   ├── README.md
│   └── README.vi.md
├── hardware/
│   ├── boards/
│   │   └── yolo_uno.json         # Định nghĩa board PlatformIO tùy chỉnh
│   ├── include/
│   │   ├── secrets.example.h
│   │   └── secrets.h             # Chỉ lưu local, Git bỏ qua
│   ├── src/
│   │   └── main.cpp              # Firmware YOLO UNO
│   ├── platformio.ini
│   ├── README.md
│   └── README.vi.md
├── diagrams/
│   └── aws-iot-dashboard-architecture.png
├── .gitignore
├── README.md
└── README.vi.md
```

---

## 6. API endpoint

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Root endpoint |
| `GET` | `/api/health` | Kiểm tra trạng thái backend |
| `POST` | `/api/telemetry` | Nhận telemetry từ YOLO UNO |
| `GET` | `/api/devices/{device_id}/latest` | Lấy telemetry mới nhất |
| `GET` | `/api/devices/{device_id}/history` | Lấy lịch sử telemetry |
| `POST` | `/api/devices/{device_id}/commands` | Tạo command mới |
| `GET` | `/api/devices/{device_id}/commands/latest` | Lấy command Pending mới nhất |
| `POST` | `/api/devices/{device_id}/commands/{command_id}/ack` | Xác nhận command đã được thực thi |

Command hỗ trợ:

```text
MODE_AUTO
MODE_MANUAL
FAN_ON
FAN_OFF
LIGHT_ON
LIGHT_OFF
CURTAIN_OPEN
CURTAIN_CLOSE
```

---

## 7. Ví dụ telemetry

```json
{
  "deviceId": "room_01",
  "temperature": 30.5,
  "humidity": 72.0,
  "lightIntensity": 1050,
  "fan": false,
  "light": true,
  "curtain": false
}
```

---

## 8. Hướng dẫn setup ban đầu

### 8.1 Clone repository

Chạy trên Windows PowerShell:

```powershell
git clone <GITHUB_REPOSITORY_URL>
cd aws-iot-dashboard
```

### 8.2 Setup backend trên Windows

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
Invoke-WebRequest `
  -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" `
  -OutFile "global-bundle.pem"
```

Cập nhật `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard?sslmode=verify-full&sslrootcert=global-bundle.pem
```

Lấy endpoint tại mục **Connectivity & security** của RDS, không thêm `https://`
hoặc port. Phải URL-encode mật khẩu database trước khi đưa vào `DATABASE_URL`.
Để kết nối từ máy local, RDS cũng phải truy cập được từ máy đó thông qua Security
Group phù hợp, VPN hoặc tunnel.

Chạy backend local:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 8.3 Setup frontend trên Windows

```powershell
cd aws-iot-dashboard\frontend
npm install
npm run dev
```

Để triển khai production, build frontend, upload thư mục `dist/` lên frontend
S3 bucket rồi xóa cache CloudFront:

```powershell
npm run build
aws s3 sync dist "s3://<FRONTEND_BUCKET>" --delete
aws cloudfront create-invalidation `
  --distribution-id "<CLOUDFRONT_DISTRIBUTION_ID>" `
  --paths "/*"
```

Cấu hình CloudFront distribution với S3 bucket làm default origin và ALB làm
origin thứ hai. Chuyển `/api/*` đến ALB, tắt cache cho behavior này, cho phép
các HTTP method cần thiết và gắn WAF web ACL vào distribution. Giữ S3 bucket
ở chế độ private và chỉ cho phép truy cập qua CloudFront Origin Access Control.

### 8.4 Setup hardware

```powershell
cd aws-iot-dashboard\hardware
Copy-Item include\secrets.example.h include\secrets.h
```

Cập nhật `include/secrets.h`:

```cpp
#define WIFI_SSID "<YOUR_WIFI_SSID>"
#define WIFI_PASSWORD "<YOUR_WIFI_PASSWORD>"
#define API_BASE_URL "http://<ALB_DNS_NAME>"
#define DEVICE_ID "room_01"
```

ALB listener nhận lưu lượng HTTP và chuyển tiếp đến backend target group trên
port `8000`. Không thêm `/api` vào `API_BASE_URL`; firmware tự nối các endpoint
path cần thiết.

Build và upload:

```powershell
pio run
pio run --target upload
pio device monitor --baud 115200
```

Không thêm dấu `/` ở cuối `API_BASE_URL`.

---

## 9. Triển khai backend production

Các lệnh dưới đây dùng để chuẩn bị backend instance cho AMI của Auto Scaling
group. Không sử dụng instance chuẩn bị này như server production duy nhất.

### 9.1 Kết nối từ Windows PowerShell

```powershell
ssh -i "$env:USERPROFILE\.ssh\iot-dashboard-key.pem" ec2-user@<EC2_PUBLIC_DNS>
```

### 9.2 Chuẩn bị backend instance

```bash
sudo dnf update -y
sudo dnf install -y git python3 python3-pip postgresql15
cd ~
git clone <GITHUB_REPOSITORY_URL> aws-iot-dashboard
cd ~/aws-iot-dashboard/backend
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
nano .env
```

Thêm:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard?sslmode=verify-full&sslrootcert=/home/ec2-user/aws-iot-dashboard/backend/global-bundle.pem
```

Chỉ dùng hostname endpoint RDS, không thêm `https://` hoặc `:5432`. Security
Group của RDS phải cho phép TCP `5432` từ Security Group của các backend
instance. Không mở PostgreSQL cho `0.0.0.0/0`.

Sau đó:

```bash
chmod 600 .env
```

### 9.3 Kiểm tra kết nối RDS khi cần

```bash
cd ~/aws-iot-dashboard/backend
export RDSHOST="<RDS_ENDPOINT>"
psql "host=$RDSHOST port=5432 dbname=iot_dashboard user=postgres sslmode=verify-full sslrootcert=$PWD/global-bundle.pem"
```

Nhập mật khẩu RDS khi `psql` yêu cầu.

Khi đang ở PostgreSQL:

```sql
\conninfo
\dt
```

Thoát:

```sql
\q
```

Không cần kết nối `psql` mỗi khi SSH vào EC2. `psql` chỉ dùng để kiểm tra hoặc
debug database. Backend tự kết nối RDS thông qua `DATABASE_URL`, có mã hóa TLS,
xác minh chứng chỉ và endpoint.

### 9.4 Tạo systemd service

```bash
sudo mkdir -p /var/log/aws-iot-backend
sudo chown -R ec2-user:ec2-user /var/log/aws-iot-backend
touch /var/log/aws-iot-backend/backend.log
touch /var/log/aws-iot-backend/backend-error.log
sudo nano /etc/systemd/system/aws-iot-backend.service
```

Paste:

```ini
[Unit]
Description=AWS IoT Dashboard FastAPI Backend
After=network.target

[Service]
Type=simple
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/aws-iot-dashboard/backend
EnvironmentFile=/home/ec2-user/aws-iot-dashboard/backend/.env
ExecStart=/home/ec2-user/aws-iot-dashboard/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
StandardOutput=append:/var/log/aws-iot-backend/backend.log
StandardError=append:/var/log/aws-iot-backend/backend-error.log

[Install]
WantedBy=multi-user.target
```

Enable và start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable aws-iot-backend
sudo systemctl start aws-iot-backend
sudo systemctl status aws-iot-backend
```

Nhấn `q` để thoát màn hình status.

### 9.5 Tạo AMI, target group, ALB và Auto Scaling group

1. Dừng backend preparation instance và tạo một backend AMI có version.
2. Tạo launch template sử dụng AMI, Security Group của backend instance, IAM
   instance profile và EBS volume đã mã hóa.
3. Tạo target group sử dụng HTTP port `8000` và health check path
   `/api/health`.
4. Tạo internet-facing ALB trên các public subnet tại `ap-southeast-1a` và
   `ap-southeast-1c`. Cấu hình listener chuyển tiếp đến target group.
5. Tạo Auto Scaling group từ launch template trong cả hai public subnet, gắn
   target group, bật ELB health check và đặt minimum, desired, maximum capacity
   phù hợp.
6. Chờ tất cả instance vượt qua EC2 health check và target-group health check.
7. Cấu hình behavior `/api/*` của CloudFront sử dụng ALB origin.

Security Group của ALB chỉ nên nhận lưu lượng ứng dụng cần thiết. Security
Group của backend instance chỉ cho phép TCP `8000` từ Security Group của ALB.
Nếu YOLO UNO gọi ALB bằng HTTP như trong sơ đồ, cần giữ HTTP listener; chuyển
sang HTTPS và TLS phía thiết bị khi firmware hỗ trợ.

### 9.6 Triển khai bản cập nhật backend

Sau khi áp dụng và kiểm thử thay đổi backend, tạo một AMI mới có version. Cập
nhật launch template sang version mới, trỏ Auto Scaling group đến version đó
và bắt đầu instance refresh. Quy trình này giữ mô hình nhiều instance và tránh
cập nhật thủ công từng instance đang chạy.

Kiểm tra trên từng instance:

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/openapi.json | grep -o '/api/[^"]*' | sort -u
```

Xem log:

```bash
sudo tail -f /var/log/aws-iot-backend/backend.log /var/log/aws-iot-backend/backend-error.log
```

Kiểm tra qua load balancer:

```bash
curl http://<ALB_DNS_NAME>/api/health
```

---

## 10. Lưu ý bảo mật

- Không commit `.env`, `.pem`, private key, password hoặc `hardware/include/secrets.h`.
- Giữ frontend S3 bucket ở chế độ private và dùng CloudFront Origin Access Control.
- Gắn WAF web ACL vào CloudFront và điều chỉnh managed/rate-based rule phù hợp.
- Chỉ cho phép port backend `8000` từ Security Group của ALB.
- Chỉ cho phép port PostgreSQL `5432` từ Security Group của backend instance.
- SSH chỉ nên mở cho IP quản trị.
- Không hard-code AWS access key.
- Dùng EC2 IAM Role cho CloudWatch và các quyền AWS cần thiết khác.
- Mã hóa EBS và RDS bằng KMS, đồng thời lưu backup RDS trong 7 ngày.

---

## 11. Checklist kiểm thử

- [x] YOLO UNO kết nối Wi-Fi.
- [x] CloudFront phục vụ frontend từ private S3 bucket.
- [x] WAF bảo vệ CloudFront distribution.
- [x] CloudFront chuyển `/api/*` đến backend ALB.
- [x] YOLO UNO truy cập được backend ALB.
- [x] ALB health check thành công với instance ở cả hai Availability Zone.
- [x] Auto Scaling thay thế được backend instance không khỏe mạnh.
- [x] Telemetry được lưu vào PostgreSQL.
- [x] API latest và history trả dữ liệu.
- [x] Frontend tạo được command.
- [x] Hardware nhận và thực thi command.
- [x] Hardware gửi command ACK.
- [x] Command chuyển từ `Pending` sang `Executed`.
- [x] RDS Multi-AZ replication và failover đã được cấu hình.
- [x] Backup RDS được lưu trong 7 ngày.
- [x] CloudWatch nhận log backend và metric hạ tầng.

---

## 12. Tài liệu

- Báo cáo workshop hoàn chỉnh: `content/5-Workshop/` trong repository nộp bài riêng
- Sơ đồ kiến trúc: `diagrams/`
- Hướng dẫn backend: `backend/README.vi.md`
- Hướng dẫn frontend: `frontend/README.vi.md`
- Hướng dẫn hardware: `hardware/README.vi.md`

---

## 13. License

Repository được phát triển phục vụ mục đích học tập và thực tập.
