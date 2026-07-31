# AWS IoT Dashboard Backend

[English](README.md)

FastAPI backend nhận telemetry từ thiết bị IoT, lưu dữ liệu vào PostgreSQL và
quản lý command điều khiển theo trạng thái `Pending` → `Executed`.

Trong production, Application Load Balancer chuyển tiếp lưu lượng HTTP trên
port `8000` đến các backend instance trong Auto Scaling group hoạt động trên
hai Availability Zone. Các instance kết nối đến Amazon RDS for PostgreSQL
Multi-AZ qua RDS endpoint trên TCP `5432`.

## Công nghệ

- FastAPI + Uvicorn
- SQLAlchemy
- PostgreSQL / Amazon RDS
- Pydantic

## Cấu trúc

```text
backend/
├── app/
│   ├── api/          # API routes
│   ├── database/     # Kết nối và khởi tạo database
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   └── services/     # Xử lý telemetry và command
├── .env.example
├── main.py
├── requirements.txt
└── simulator.py
```

## Chạy local

Các lệnh dưới đây chạy từ thư mục `backend`.

### 1. Tạo môi trường Python

Windows PowerShell:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Linux/macOS:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

### 2. Cấu hình database

Nếu dùng Amazon RDS, tải CA bundle vào thư mục `backend` trước.

Windows PowerShell:

```powershell
Invoke-WebRequest `
  -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" `
  -OutFile "global-bundle.pem"
```

Linux/macOS:

```bash
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

Cập nhật `.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard?sslmode=verify-full&sslrootcert=global-bundle.pem
DEVICE_API_KEY=demo-device-key
```

`DATABASE_URL` là biến bắt buộc. Nếu mật khẩu chứa ký tự đặc biệt, cần
URL-encode trước khi đưa vào connection string. Chỉ dùng hostname endpoint RDS,
không thêm `https://` hoặc `:5432`. `sslmode=verify-full` yêu cầu kết nối TLS,
xác minh CA và kiểm tra endpoint khớp với chứng chỉ.

Nếu chạy với PostgreSQL local không cấu hình TLS, có thể dùng:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_PASSWORD>@localhost:5432/iot_dashboard
```

File `global-bundle.pem` được `.gitignore` bỏ qua và không được commit vào
repository.

> `DEVICE_API_KEY` đã có trong cấu hình nhưng các endpoint hiện tại chưa kiểm
> tra API key. Không nên public API trực tiếp ra Internet nếu chưa bổ sung xác
> thực hoặc giới hạn truy cập.

### 3. Tạo bảng và chạy API

```powershell
python -m app.database.init_db
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Sau khi khởi động:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

Khi chạy production, bỏ `--reload`. Tạo backend AMI đã bật service rồi triển
khai bằng launch template và Auto Scaling group phía sau Application Load
Balancer. Xem [hướng dẫn triển khai](../README.vi.md#9-triển-khai-backend-production)
ở README gốc.

## API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Thông tin backend |
| `GET` | `/api/health` | Kiểm tra trạng thái API |
| `POST` | `/api/telemetry` | Nhận và lưu telemetry |
| `GET` | `/api/devices/{device_id}/latest` | Telemetry mới nhất |
| `GET` | `/api/devices/{device_id}/history` | Lịch sử telemetry, mới nhất trước |
| `POST` | `/api/devices/{device_id}/commands` | Tạo command `Pending` |
| `GET` | `/api/devices/{device_id}/commands/latest` | Lấy command `Pending` cũ nhất |
| `POST` | `/api/devices/{device_id}/commands/{command_id}/ack` | Chuyển command thành `Executed` |

Endpoint command trả `404` nếu thiết bị chưa tồn tại. Thiết bị được tự động tạo
khi backend nhận telemetry đầu tiên có `deviceId` tương ứng.

### Gửi telemetry

```http
POST /api/telemetry
Content-Type: application/json
```

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

### Tạo command

```http
POST /api/devices/room_01/commands
Content-Type: application/json
```

```json
{
  "command": "FAN_ON"
}
```

Các command firmware hỗ trợ:

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

Backend lưu command dưới dạng chuỗi và không tự kiểm tra danh sách trên. Thiết
bị chịu trách nhiệm xác nhận command hợp lệ và gửi ACK sau khi thực thi.

## Chạy simulator

Simulator gửi telemetry và xử lý command tương tự thiết bị thật:

```powershell
python simulator.py `
  --base-url http://localhost:8000 `
  --device-id room_01 `
  --interval 3
```

Trên Linux/macOS, thay dấu nối dòng PowerShell bằng `\` hoặc viết lệnh trên một
dòng. Nên luôn truyền `--base-url` để tránh sử dụng địa chỉ mặc định trong
`simulator.py`.

## Xử lý lỗi nhanh

- `DATABASE_URL Field required`: chưa tạo `.env` hoặc chạy lệnh sai thư mục.
- Lỗi kết nối PostgreSQL: kiểm tra host, port `5432`, database, tài khoản,
  firewall và RDS Security Group.
- `certificate verify failed` hoặc không tìm thấy CA: kiểm tra
  `global-bundle.pem`, `sslrootcert` và chạy backend từ đúng thư mục `backend`.
- Timeout khi kết nối RDS: Security Group của RDS phải cho phép TCP `5432` từ
  Security Group của backend instance hoặc từ nguồn truy cập được phê duyệt.
- `404` khi tạo command: gửi telemetry cho `deviceId` đó trước.
- `ModuleNotFoundError`: kích hoạt virtual environment và cài lại
  `requirements.txt`.
- Command luôn `Pending`: thiết bị/simulator phải gọi endpoint ACK sau khi thực
  thi.
