# AWS IoT Monitoring and Control Dashboard

Hệ thống giám sát và điều khiển thiết bị IoT sử dụng FastAPI, React, PostgreSQL, YOLO UNO và các dịch vụ AWS.

[English](README.md)

---

## 1. Tổng quan

Project xây dựng một hệ thống giám sát và điều khiển IoT hoàn chỉnh từ thiết bị phần cứng đến giao diện người dùng.

Thiết bị **YOLO UNO** thu thập nhiệt độ, độ ẩm và cường độ ánh sáng, sau đó gửi telemetry đến FastAPI backend chạy trên Amazon EC2. Backend lưu dữ liệu vào Amazon RDS for PostgreSQL. Dashboard React + Vite hiển thị dữ liệu mới nhất, dữ liệu lịch sử và cho phép người dùng điều khiển quạt, đèn và rèm từ xa.

Hardware định kỳ lấy command mới nhất từ backend, thực thi command và gửi ACK xác nhận. Amazon CloudWatch được dùng để thu thập log backend và theo dõi metric của EC2 và RDS.

### Chức năng chính

- Thu thập nhiệt độ, độ ẩm và cường độ ánh sáng.
- Lưu telemetry vào PostgreSQL trên Amazon RDS.
- Hiển thị telemetry mới nhất và dữ liệu lịch sử.
- Điều khiển quạt, đèn và rèm từ xa.
- Quản lý trạng thái command từ `Pending` sang `Executed`.
- Hardware gửi ACK sau khi thực hiện command.
- Backend chạy bằng `systemd` trên EC2.
- Theo dõi EC2, RDS và log backend bằng Amazon CloudWatch.

---

## 2. Architecture

<p align="center">
  <img
    src="diagrams/aws-iot-dashboard-architecture.png"
    alt="AWS IoT Monitoring and Control Dashboard Architecture"
    width="100%"
  />
</p>

Kiến trúc hệ thống gồm:

- Frontend React + Vite chạy bên ngoài AWS.
- FastAPI backend được triển khai trên Amazon EC2.
- Amazon RDS for PostgreSQL dùng để lưu telemetry và command.
- Phần cứng YOLO UNO gửi telemetry, lấy command đang ở trạng thái Pending và gửi ACK sau khi thực thi.
- Amazon CloudWatch thu thập log EC2, metric EC2 và metric RDS.
- CloudWatch Alarms giám sát CPU, memory, disk usage và database connections.


### Dịch vụ AWS

- Amazon EC2
- Amazon EBS
- Amazon RDS for PostgreSQL
- Amazon VPC
- Security Groups
- AWS IAM Role
- Amazon CloudWatch
- CloudWatch Alarms


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

- Amazon EC2
- Amazon EBS
- Amazon RDS for PostgreSQL
- Amazon VPC
- Security Groups
- AWS IAM Role
- Amazon CloudWatch
- CloudWatch Alarms

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

### 8.4 Setup hardware

```powershell
cd aws-iot-dashboard\hardware
Copy-Item include\secrets.example.h include\secrets.h
```

Cập nhật `include/secrets.h`:

```cpp
#define WIFI_SSID "<YOUR_WIFI_SSID>"
#define WIFI_PASSWORD "<YOUR_WIFI_PASSWORD>"
#define API_BASE_URL "http://<EC2_PUBLIC_IP>:8000"
#define DEVICE_ID "room_01"
```

Build và upload:

```powershell
pio run
pio run --target upload
pio device monitor --baud 115200
```

Không thêm dấu `/` ở cuối `API_BASE_URL`.

---

## 9. Setup backend trên EC2

### 9.1 Kết nối từ Windows PowerShell

```powershell
ssh -i "$env:USERPROFILE\.ssh\iot-dashboard-key.pem" ec2-user@<EC2_PUBLIC_DNS>
```

### 9.2 Setup EC2 lần đầu

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

Chỉ dùng hostname endpoint RDS, không thêm `https://` hoặc `:5432`. Security Group
của RDS phải cho phép TCP `5432` từ Security Group của EC2. Không mở PostgreSQL
cho `0.0.0.0/0`.

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

### 9.5 Các lệnh cập nhật hằng ngày

```bash
cd ~/aws-iot-dashboard
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart aws-iot-backend
sudo systemctl status aws-iot-backend
```

Kiểm tra backend:

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/openapi.json | grep -o '/api/[^"]*' | sort -u
```

Xem log:

```bash
sudo tail -f /var/log/aws-iot-backend/backend.log /var/log/aws-iot-backend/backend-error.log
```

---

## 10. Lưu ý bảo mật

- Không commit `.env`, `.pem`, private key, password hoặc `hardware/include/secrets.h`.
- RDS chỉ nên cho phép PostgreSQL từ EC2 Security Group.
- SSH chỉ nên mở cho IP quản trị.
- Không hard-code AWS access key.
- Dùng IAM Role cho CloudWatch Agent trên EC2.

---

## 11. Checklist kiểm thử

- [x] YOLO UNO kết nối Wi-Fi.
- [x] YOLO UNO truy cập được backend EC2.
- [x] Telemetry được lưu vào PostgreSQL.
- [x] API latest và history trả dữ liệu.
- [x] Frontend tạo được command.
- [x] Hardware nhận và thực thi command.
- [x] Hardware gửi command ACK.
- [x] Command chuyển từ `Pending` sang `Executed`.
- [x] CloudWatch nhận logs và metrics.

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
