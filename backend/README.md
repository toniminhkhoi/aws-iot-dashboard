# AWS IoT Dashboard

Ứng dụng giám sát và điều khiển thiết bị IoT trên nền tảng AWS.

Hệ thống gồm:

- **Frontend:** React + Vite
- **Backend:** FastAPI + Uvicorn
- **Database:** Amazon RDS for PostgreSQL
- **Compute:** Amazon EC2
- **Monitoring:** Amazon CloudWatch
- **Simulator:** Python script mô phỏng thiết bị IoT

---

## 1. Kiến trúc hệ thống

```text
IoT Simulator / Arduino / ESP32
             │
             │ HTTP REST API
             ▼
      FastAPI Backend
       chạy trên EC2
             │
             │ SQLAlchemy
             ▼
  Amazon RDS PostgreSQL
             │
             ▼
      React Dashboard

EC2 logs / CPU / memory / disk
             │
             ▼
      Amazon CloudWatch
```

Luồng telemetry:

```text
Simulator
→ POST /api/telemetry
→ FastAPI
→ SQLAlchemy
→ Amazon RDS PostgreSQL
→ Frontend gọi latest/history
```

Luồng điều khiển:

```text
Frontend bấm BẬT/TẮT
→ POST command
→ Backend lưu command với trạng thái Pending
→ Simulator/thiết bị lấy command mới nhất
→ Thiết bị thực thi command
→ Thiết bị gửi ACK
→ Command chuyển sang Executed
→ Thiết bị gửi telemetry trạng thái mới
→ Frontend cập nhật giao diện
```

---

## 2. Cấu trúc thư mục

```text
aws-iot-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── .env.example
│   ├── main.py
│   ├── requirements.txt
│   └── simulator.py
│
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
│
├── diagrams/
├── docs/
├── report/
└── screenshots/
```

---

## 3. Public URLs

> Public IPv4 và Public DNS của EC2 có thể thay đổi sau khi Stop/Start nếu chưa sử dụng Elastic IP.

```text
Frontend local:
http://localhost:5173

Backend root:
http://<EC2_PUBLIC_IP>:8000/

Swagger UI:
http://<EC2_PUBLIC_IP>:8000/docs

Health API:
http://<EC2_PUBLIC_IP>:8000/api/health
```

Ví dụ:

```text
http://18.141.166.190:8000/docs
```

Không nên hard-code IP EC2 vào nhiều file. Nên sử dụng biến môi trường hoặc proxy của Vite.

---

# BACKEND

## 4. SSH vào EC2

Trên Windows PowerShell, đi tới thư mục chứa file `.pem`:

```powershell
cd F:\Download
```

Kết nối EC2:

```powershell
ssh -i "iot-dashboard-key.pem" ec2-user@<EC2_PUBLIC_DNS>
```

Ví dụ:

```powershell
ssh -i "iot-dashboard-key.pem" ec2-user@ec2-18-141-166-190.ap-southeast-1.compute.amazonaws.com
```

Nếu Windows báo file key có quyền truy cập quá rộng:

```powershell
$key = "F:\Download\iot-dashboard-key.pem"

icacls $key /inheritance:r
icacls $key /remove `
  "NT AUTHORITY\Authenticated Users" `
  "BUILTIN\Users" `
  "Everyone"

icacls $key /grant:r `
  "$($env:USERDOMAIN)\$($env:USERNAME):(R)"
```

---

## 5. Chạy backend trên Windows

Dùng cho phát triển và kiểm thử local.

### 5.1. Đi tới thư mục backend

```powershell
cd F:\aws-iot-dashboard\backend
```

### 5.2. Tạo virtual environment

Chỉ cần chạy lần đầu:

```powershell
py -m venv venv
```

### 5.3. Kích hoạt virtual environment

```powershell
.\venv\Scripts\Activate.ps1
```

Khi kích hoạt thành công, terminal sẽ hiển thị:

```text
(venv) PS F:\aws-iot-dashboard\backend>
```

### 5.4. Cài dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5.5. Tạo `.env`

```powershell
Copy-Item .env.example .env
```

Mở file:

```powershell
notepad .env
```

Ví dụ:

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard
```

Không commit `.env` lên GitHub.

### 5.6. Tạo bảng database

```powershell
python -m app.database.init_db
```

### 5.7. Chạy backend local

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Swagger local:

```text
http://127.0.0.1:8000/docs
```

---

## 6. Cài backend lần đầu trên EC2

### 6.1. Đi tới thư mục backend

```bash
cd ~/aws-iot-dashboard/backend
```

### 6.2. Tạo virtual environment

```bash
python3 -m venv venv
```

### 6.3. Kích hoạt virtual environment

```bash
source venv/bin/activate
```

Khi kích hoạt thành công:

```text
(venv) [ec2-user@ip-xxx backend]$
```

### 6.4. Cài dependencies

```bash
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

### 6.5. Tạo `.env`

```bash
cp .env.example .env
nano .env
```

Ví dụ:

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@iot-dashboard-db.cnowwiw6oqtq.ap-southeast-1.rds.amazonaws.com:5432/iot_dashboard
```

Lưu trong `nano`:

```text
Ctrl + O
Enter
Ctrl + X
```

### 6.6. Tạo bảng database

```bash
python -m app.database.init_db
```

---

## 7. Chạy backend bằng systemd

Backend trên EC2 nên chạy bằng `systemd`, không nên phụ thuộc vào terminal SSH.

### Kiểm tra trạng thái

```bash
sudo systemctl status aws-iot-backend
```

Thoát màn hình trạng thái:

```text
q
```

### Khởi động backend

```bash
sudo systemctl start aws-iot-backend
```

### Restart sau khi cập nhật code hoặc `.env`

```bash
sudo systemctl restart aws-iot-backend
```

### Dừng backend

```bash
sudo systemctl stop aws-iot-backend
```

### Cho backend tự chạy khi EC2 khởi động

```bash
sudo systemctl enable aws-iot-backend
```

### Kiểm tra service có enabled không

```bash
sudo systemctl is-enabled aws-iot-backend
```

---

## 8. Xem log backend

Nếu service chưa redirect log sang file:

```bash
sudo journalctl -u aws-iot-backend -f
```

Thoát:

```text
Ctrl + C
```

Nếu systemd được cấu hình:

```ini
StandardOutput=append:/var/log/aws-iot-backend/backend.log
StandardError=append:/var/log/aws-iot-backend/backend-error.log
```

thì xem log bằng:

```bash
sudo tail -f /var/log/aws-iot-backend/backend.log
```

Xem lỗi:

```bash
sudo tail -f /var/log/aws-iot-backend/backend-error.log
```

Theo dõi cả hai:

```bash
sudo tail -f \
  /var/log/aws-iot-backend/backend.log \
  /var/log/aws-iot-backend/backend-error.log
```

Xem 100 dòng gần nhất:

```bash
sudo tail -n 100 /var/log/aws-iot-backend/backend.log
sudo tail -n 100 /var/log/aws-iot-backend/backend-error.log
```

---

## 9. Debug Uvicorn thủ công trên EC2

Không được chạy `systemd` và Uvicorn thủ công cùng lúc trên cổng `8000`.

Dừng service trước:

```bash
sudo systemctl stop aws-iot-backend
```

Chạy Uvicorn:

```bash
cd ~/aws-iot-dashboard/backend
source venv/bin/activate

uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000
```

Sau khi debug xong:

```text
Ctrl + C
```

Bật lại service:

```bash
sudo systemctl start aws-iot-backend
sudo systemctl status aws-iot-backend
```

---

## 10. Workflow sau khi pull code mới

```bash
cd ~/aws-iot-dashboard

git status
git pull origin main

cd backend
source venv/bin/activate

pip install -r requirements.txt
python -m app.database.init_db

sudo systemctl restart aws-iot-backend
sudo systemctl status aws-iot-backend
```

Kiểm tra health:

```bash
curl http://127.0.0.1:8000/api/health
```

Kiểm tra route đang được backend công bố:

```bash
curl -s http://127.0.0.1:8000/openapi.json |
grep -o '/api/[^"]*' |
sort -u
```

---

# DATABASE

## 11. Kết nối Amazon RDS PostgreSQL

### 11.1. Cài PostgreSQL client trên EC2

```bash
sudo dnf install postgresql15 -y
```

Kiểm tra:

```bash
psql --version
```

### 11.2. Kết nối RDS

Nên chạy trên một dòng:

```bash
psql -h iot-dashboard-db.cnowwiw6oqtq.ap-southeast-1.rds.amazonaws.com -p 5432 -U postgres -d iot_dashboard
```

Hoặc xuống dòng đúng kiểu Linux:

```bash
psql \
  -h iot-dashboard-db.cnowwiw6oqtq.ap-southeast-1.rds.amazonaws.com \
  -p 5432 \
  -U postgres \
  -d iot_dashboard
```

Khi được hỏi:

```text
Password for user postgres:
```

nhập password của RDS.

Không ghi password thật trong README, source code hoặc GitHub.

Khi kết nối thành công:

```text
iot_dashboard=>
```

### 11.3. Thoát khỏi PostgreSQL

```sql
\q
```

`Ctrl + C` chỉ hủy câu SQL hiện tại, không thoát hoàn toàn khỏi `psql`.

---

## 12. Các lệnh PostgreSQL thường dùng

Liệt kê bảng:

```sql
\dt
```

Xem cấu trúc bảng:

```sql
\d commands
```

Xem telemetry mới nhất:

```sql
SELECT
    id,
    device_id,
    temperature,
    humidity,
    light_intensity,
    fan_status,
    light_status,
    curtain_status,
    timestamp
FROM telemetry_logs
ORDER BY id DESC
LIMIT 10;
```

Xem command mới nhất:

```sql
SELECT
    id,
    device_id,
    command,
    state,
    timestamp
FROM commands
ORDER BY id DESC
LIMIT 10;
```

Xem các command đang chờ xử lý:

```sql
SELECT
    id,
    device_id,
    command,
    state,
    timestamp
FROM commands
WHERE state = 'Pending'
ORDER BY id DESC;
```

Xem các command đã thực thi:

```sql
SELECT
    id,
    device_id,
    command,
    state,
    timestamp
FROM commands
WHERE state = 'Executed'
ORDER BY id DESC;
```

> Backend hiện dùng bảng `commands`, không dùng bảng `device_commands`.

Nếu `device_commands` là bảng dư và không có dữ liệu:

```sql
DROP TABLE IF EXISTS device_commands;
```

Chỉ xóa khi đã xác nhận model SQLAlchemy không sử dụng bảng này.

---

# SIMULATOR

## 13. Chạy IoT simulator trên Windows

Đi tới backend:

```powershell
cd F:\aws-iot-dashboard\backend
```

Kích hoạt môi trường:

```powershell
.\venv\Scripts\Activate.ps1
```

Cài `requests` nếu chưa có:

```powershell
pip install requests
```

Chạy simulator, gửi dữ liệu tới backend EC2:

```powershell
python simulator.py `
  --base-url http://<EC2_PUBLIC_IP>:8000 `
  --device-id room_01 `
  --interval 5 `
  --check-latest
```

Ví dụ:

```powershell
python simulator.py `
  --base-url http://18.141.166.190:8000 `
  --device-id room_01 `
  --interval 5 `
  --check-latest
```

---

## 14. Chạy IoT simulator trên EC2

Trên EC2 không dùng lệnh Windows như:

```text
.\venv\Scripts\Activate.ps1
```

Dùng lệnh Linux:

```bash
cd ~/aws-iot-dashboard/backend
source venv/bin/activate
```

Chạy simulator:

```bash
python3 simulator.py \
  --base-url http://127.0.0.1:8000 \
  --device-id room_01 \
  --interval 5 \
  --check-latest
```

Do simulator và backend cùng chạy trên EC2 nên dùng:

```text
http://127.0.0.1:8000
```

Không cần gọi Public IP EC2.

Dừng simulator:

```text
Ctrl + C
```

---

## 15. Simulator và command

Simulator cần thực hiện vòng lặp:

```text
1. Gửi telemetry
2. GET command Pending mới nhất
3. Thực hiện FAN_ON, FAN_OFF, LIGHT_ON...
4. Gửi ACK
5. Gửi telemetry trạng thái mới
```

Các command hỗ trợ:

```text
FAN_ON
FAN_OFF
LIGHT_ON
LIGHT_OFF
CURTAIN_OPEN
CURTAIN_CLOSE
```

Command mới được lưu với:

```text
state = Pending
```

Sau khi simulator hoặc thiết bị ACK:

```text
state = Executed
```

---

# FRONTEND

## 16. Cài frontend trên Windows

Đi tới thư mục frontend:

```powershell
cd F:\aws-iot-dashboard\frontend
```

Kiểm tra Node.js:

```powershell
node -v
npm -v
```

Cài dependencies:

```powershell
npm install
```

Chạy frontend:

```powershell
npm run dev
```

Khi thành công:

```text
Local: http://localhost:5173/
```

Mở:

```text
http://localhost:5173
```

Giữ terminal chạy Vite. Nếu đóng terminal hoặc bấm `Ctrl + C`, `localhost:5173` sẽ ngừng hoạt động.

---

## 17. Cấu hình Vite proxy

File:

```text
frontend/vite.config.ts
```

Frontend local gọi backend EC2:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://<EC2_PUBLIC_IP>:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

Ví dụ:

```ts
target: 'http://18.141.166.190:8000',
```

Sau khi sửa `vite.config.ts`, phải restart Vite:

```text
Ctrl + C
npm run dev
```

Trong source frontend nên gọi API bằng đường dẫn tương đối:

```ts
fetch('/api/devices/room_01/latest');
```

Không nên hard-code:

```ts
fetch('http://18.141.166.190:8000/api/devices/room_01/latest');
```

---

## 18. Build frontend production

```powershell
cd F:\aws-iot-dashboard\frontend
npm run build
```

Build output:

```text
frontend/dist/
```

Muốn truy cập frontend bằng Public IP EC2, cần deploy thư mục `dist` lên EC2 và phục vụ bằng Nginx hoặc dịch vụ hosting khác.

Sửa `vite.config.ts` không đồng nghĩa với deploy frontend lên EC2.

---

# API

## 19. API endpoints

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/` | Kiểm tra root API |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/telemetry` | Gửi telemetry |
| `GET` | `/api/devices/{device_id}/latest` | Lấy telemetry mới nhất |
| `GET` | `/api/devices/{device_id}/history` | Lấy lịch sử telemetry |
| `POST` | `/api/devices/{device_id}/commands` | Tạo command |
| `GET` | `/api/devices/{device_id}/commands/latest` | Lấy command Pending mới nhất |
| `POST` | `/api/devices/{device_id}/commands/{command_id}/ack` | Xác nhận command đã thực hiện |

Ví dụ tạo command:

```json
{
  "command": "FAN_OFF"
}
```

Test trên EC2:

```bash
curl -i -X POST \
  http://127.0.0.1:8000/api/devices/room_01/commands \
  -H 'Content-Type: application/json' \
  -d '{"command":"FAN_OFF"}'
```

Lấy command mới nhất:

```bash
curl \
  http://127.0.0.1:8000/api/devices/room_01/commands/latest
```

ACK command:

```bash
curl -i -X POST \
  http://127.0.0.1:8000/api/devices/room_01/commands/<COMMAND_ID>/ack
```

---

# CLOUDWATCH

## 20. IAM Role cho CloudWatch Agent

EC2 cần IAM Role có policy:

```text
CloudWatchAgentServerPolicy
```

Role ví dụ:

```text
iot-dashboard-cloudwatch-role
```

Gắn IAM Role vào EC2:

```text
EC2
→ Instances
→ chọn iot-backend-server
→ Actions
→ Security
→ Modify IAM role
→ chọn iot-dashboard-cloudwatch-role
```

Không hard-code AWS Access Key vào EC2.

---

## 21. Cài CloudWatch Agent trên EC2

```bash
sudo dnf install amazon-cloudwatch-agent -y
```

Kiểm tra:

```bash
rpm -qa | grep amazon-cloudwatch-agent
```

Tạo thư mục log backend nếu chưa có:

```bash
sudo mkdir -p /var/log/aws-iot-backend
sudo chown ec2-user:ec2-user /var/log/aws-iot-backend
```

---

## 22. Cấu hình CloudWatch Agent

Tạo file:

```bash
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Ví dụ cấu hình:

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "IoTDashboard/EC2",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}"
    },
    "metrics_collected": {
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "/"
        ]
      },
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": true
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/aws-iot-backend/backend.log",
            "log_group_name": "/aws/ec2/iot-dashboard/backend",
            "log_stream_name": "{instance_id}/backend",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/aws-iot-backend/backend-error.log",
            "log_group_name": "/aws/ec2/iot-dashboard/backend-error",
            "log_stream_name": "{instance_id}/backend-error",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
```

Lưu file:

```text
Ctrl + O
Enter
Ctrl + X
```

---

## 23. Khởi động CloudWatch Agent

Nạp cấu hình và khởi động:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s
```

Kiểm tra trạng thái:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -m ec2 \
  -a status
```

Hoặc:

```bash
sudo systemctl status amazon-cloudwatch-agent
```

Restart:

```bash
sudo systemctl restart amazon-cloudwatch-agent
```

Cho agent tự chạy khi boot:

```bash
sudo systemctl enable amazon-cloudwatch-agent
```

Xem log agent:

```bash
sudo tail -f \
  /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

---

## 24. Kiểm tra CloudWatch Logs

Trên AWS Console:

```text
CloudWatch
→ Logs
→ Log management
→ Log groups
```

Các Log Group dự kiến:

```text
/aws/ec2/iot-dashboard/backend
/aws/ec2/iot-dashboard/backend-error
```

Nếu chưa xuất hiện, kiểm tra:

```bash
sudo systemctl status amazon-cloudwatch-agent
```

và:

```bash
sudo tail -n 100 \
  /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

---

## 25. CloudWatch Metrics

Metric mặc định của EC2:

```text
AWS/EC2
├── CPUUtilization
├── NetworkIn
├── NetworkOut
├── StatusCheckFailed
└── EBS metrics
```

Metric từ CloudWatch Agent:

```text
IoTDashboard/EC2
├── mem_used_percent
├── disk_used_percent
├── cpu_usage_idle
├── cpu_usage_user
└── cpu_usage_system
```

Memory và Disk không có sẵn trong metric mặc định của EC2. Cần CloudWatch Agent để gửi hai metric này.

---

## 26. CloudWatch Alarms đề xuất

| Alarm | Metric | Điều kiện |
|---|---|---|
| `iot-dashboard-ec2-high-cpu` | `CPUUtilization` | `>= 80%` trong 5 phút |
| `iot-dashboard-ec2-high-memory` | `mem_used_percent` | `>= 80%` trong 5 phút |
| `iot-dashboard-ec2-high-disk` | `disk_used_percent` | `>= 80%` trong 5 phút |
| `iot-dashboard-rds-high-cpu` | `CPUUtilization` | `>= 80%` trong 5 phút |
| `iot-dashboard-rds-high-connections` | `DatabaseConnections` | `>= 10` trong 5 phút |
| `iot-dashboard-ec2-status-check` | `StatusCheckFailed` | `>= 1` trong 5 phút |

Có thể kết nối alarm với Amazon SNS để gửi email.

Sau khi tạo SNS subscription, phải mở email và xác nhận:

```text
Confirm subscription
```

---

## 27. Trạng thái `Insufficient data`

CloudWatch Alarm hiển thị:

```text
Insufficient data
```

khi:

- metric mới được tạo;
- tài nguyên đang dừng;
- chưa đủ datapoint;
- CloudWatch Agent chưa gửi metric;
- khoảng thời gian đang chọn không có dữ liệu.

Đây không nhất thiết là lỗi.

---

# SECURITY

## 28. Security Group đề xuất

### EC2 Security Group

| Port | Source | Mục đích |
|---|---|---|
| `22` | My IP `/32` | SSH |
| `8000` | My IP `/32` hoặc mạng cần test | FastAPI |
| `80` | `0.0.0.0/0` | Nginx/frontend public, nếu có |

Không nên mở SSH:

```text
0.0.0.0/0
```

### RDS Security Group

| Port | Source | Mục đích |
|---|---|---|
| `5432` | EC2 Security Group | Cho EC2 kết nối PostgreSQL |

Không nên mở RDS PostgreSQL ra toàn Internet nếu không cần thiết.

---

## 29. `.gitignore`

```gitignore
# Environment
.env
.env.*
!.env.example
backend/.env
backend/.env.*

# Python
venv/
backend/venv/
__pycache__/
*.pyc
.pytest_cache/

# Node
node_modules/
frontend/node_modules/
dist/
frontend/dist/

# Editors
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# SSH keys
*.pem
```

Không commit:

```text
.env
password
AWS access key
secret key
.pem
database credentials
```

---

# AWS RESOURCE MANAGEMENT

## 30. Dừng tài nguyên để giảm chi phí

### Dừng EC2

```text
EC2
→ Instances
→ chọn iot-backend-server
→ Instance state
→ Stop instance
```

### Dừng RDS tạm thời

```text
RDS
→ Databases
→ chọn iot-dashboard-db
→ Actions
→ Stop temporarily
```

Lưu ý:

- Stop EC2 dừng phí compute nhưng EBS vẫn có thể tính phí.
- Stop RDS dừng DB instance hours nhưng storage, backup và snapshot vẫn có thể tính phí.
- RDS có thể tự khởi động lại sau thời gian stop tối đa của AWS.
- Nếu kết thúc project hoàn toàn, cần xóa tài nguyên không còn sử dụng.

---

## 31. AWS services đã sử dụng

```text
Amazon EC2
Amazon RDS for PostgreSQL
Amazon CloudWatch
AWS Identity and Access Management
Amazon VPC
EC2 Security Groups
Amazon EBS
Amazon SNS
```

Project đáp ứng yêu cầu sử dụng ít nhất ba dịch vụ AWS.

---

## 32. Checklist kiểm tra hệ thống

### Backend

```bash
sudo systemctl status aws-iot-backend
curl http://127.0.0.1:8000/api/health
```

### Database

```bash
psql -h <RDS_ENDPOINT> -p 5432 -U postgres -d iot_dashboard
```

```sql
\dt
SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 5;
SELECT * FROM commands ORDER BY id DESC LIMIT 5;
```

### Simulator

```bash
python3 simulator.py \
  --base-url http://127.0.0.1:8000 \
  --device-id room_01 \
  --interval 5 \
  --check-latest
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

```text
http://localhost:5173
```

### CloudWatch

```bash
sudo systemctl status amazon-cloudwatch-agent
```

```bash
sudo tail -n 100 \
  /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

---

## 33. Troubleshooting

### `localhost:5173 refused to connect`

Frontend chưa chạy:

```powershell
cd frontend
npm run dev
```

### `404 Not Found`

Kiểm tra endpoint đúng dạng số nhiều:

```text
/api/devices/{device_id}/latest
/api/devices/{device_id}/commands
```

Kiểm tra OpenAPI:

```bash
curl -s http://127.0.0.1:8000/openapi.json |
grep -o '/api/[^"]*' |
sort -u
```

### `500 Internal Server Error`

Xem backend error log:

```bash
sudo tail -f \
  /var/log/aws-iot-backend/backend-error.log
```

### `ModuleNotFoundError`

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### `DATABASE_URL Field required`

Kiểm tra file:

```bash
cd ~/aws-iot-dashboard/backend
ls -la .env
```

và:

```bash
grep DATABASE_URL .env
```

Không gửi password thật khi chụp màn hình hoặc chia sẻ log.

### `SELECT: command not found`

Bạn đang chạy SQL trong Bash. Hãy vào `psql` trước:

```bash
psql -h <RDS_ENDPOINT> -p 5432 -U postgres -d iot_dashboard
```

### Command luôn `Pending`

Simulator hoặc thiết bị chưa:

```text
GET commands/latest
→ thực thi command
→ POST ACK
```

### `journalctl -f` không hiện request

Service đang redirect log ra file:

```bash
sudo tail -f /var/log/aws-iot-backend/backend.log
```