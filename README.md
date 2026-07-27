# AWS IoT Monitoring and Control Dashboard

> **Tiếng Việt:** Hệ thống giám sát và điều khiển thiết bị IoT sử dụng FastAPI, React, PostgreSQL và các dịch vụ AWS.  
> **English:** An IoT monitoring and control system built with FastAPI, React, PostgreSQL, and AWS services.

---

## 1. Tổng quan | Overview

### Tiếng Việt

Project cho phép:

- Thiết bị **YOLO UNO** gửi dữ liệu nhiệt độ, độ ẩm, cường độ ánh sáng và trạng thái thiết bị.
- FastAPI backend tiếp nhận telemetry và lưu dữ liệu vào Amazon RDS for PostgreSQL.
- React dashboard hiển thị dữ liệu mới nhất và lịch sử.
- Người dùng gửi lệnh điều khiển quạt, đèn và rèm.
- Thiết bị lấy command mới nhất, thực thi và gửi ACK.
- Amazon CloudWatch theo dõi logs, metrics và alarms của EC2 và RDS.

### English

The project supports:

- A **YOLO UNO** device sending temperature, humidity, light intensity, and actuator states.
- A FastAPI backend receiving telemetry and storing it in Amazon RDS for PostgreSQL.
- A React dashboard displaying latest and historical data.
- Remote control of the fan, light, and curtain.
- Device command polling, execution, and acknowledgement.
- Amazon CloudWatch monitoring for EC2 and RDS logs, metrics, and alarms.

---

## 2. Kiến trúc | Architecture

```text
Dashboard User
      |
      v
React + Vite Frontend
      |
      | REST API
      v
Amazon EC2 - FastAPI Backend
      <--------------------> Amazon RDS for PostgreSQL
      ^
      | Telemetry / Pending command / Command ACK
      |
IoT Hardware - YOLO UNO

Amazon EC2 --------> Amazon CloudWatch
Amazon RDS --------> Amazon CloudWatch
Amazon CloudWatch -> CloudWatch Alarms
```

### AWS services

- Amazon EC2
- Amazon EBS
- Amazon RDS for PostgreSQL
- Amazon VPC
- Security Groups
- AWS IAM Role
- Amazon CloudWatch
- CloudWatch Alarms

> The project does not use AWS IoT Core, Lambda, API Gateway, S3, SNS, ECS, ECR, Cognito, CloudFront, or DynamoDB.

---

## 3. Chức năng | Features

- Telemetry ingestion
- Latest sensor data
- Historical sensor data
- Fan control
- Light control
- Curtain control
- Command state: `Pending` → `Executed`
- Command ACK from hardware
- PostgreSQL data persistence
- EC2 deployment with `systemd`
- CloudWatch logs, metrics, and alarms

---

## 4. Công nghệ | Technologies

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- PostgreSQL driver
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
- DHT20 temperature and humidity sensor
- Analog light sensor
- Fan module
- Relay/light
- Servo motor

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

## 5. Cấu trúc repository | Repository Structure

```text
aws-iot-dashboard/
├── backend/
│   ├── app/
│   ├── main.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
├── hardware/
│   ├── boards/
│   │   └── yolo_uno.json
│   ├── include/
│   │   ├── secrets.example.h
│   │   └── secrets.h              # Local only, do not commit
│   ├── src/
│   │   └── main.cpp
│   ├── platformio.ini
│   └── README.md
├── diagrams/
├── docs/
│   └── deployment.md
├── report/
├── screenshots/
├── README.md
└── .gitignore
```

### Folder purposes

| Folder | Purpose |
|---|---|
| `backend/` | FastAPI API, database models, schemas, and services |
| `frontend/` | React + Vite dashboard |
| `hardware/` | YOLO UNO firmware and PlatformIO configuration |
| `diagrams/` | Architecture diagrams and editable diagram sources |
| `docs/` | Deployment, testing, API, and operation documents |
| `report/` | Internship report and workshop content |
| `screenshots/` | Deployment and testing evidence |

---

## 6. API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root endpoint |
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/telemetry` | Receive telemetry from YOLO UNO |
| `GET` | `/api/devices/{device_id}/latest` | Get latest telemetry |
| `GET` | `/api/devices/{device_id}/history` | Get telemetry history |
| `POST` | `/api/devices/{device_id}/commands` | Create a device command |
| `GET` | `/api/devices/{device_id}/commands/latest` | Get the latest pending command |
| `POST` | `/api/devices/{device_id}/commands/{command_id}/ack` | Acknowledge an executed command |

Supported commands:

```text
FAN_ON
FAN_OFF
LIGHT_ON
LIGHT_OFF
CURTAIN_OPEN
CURTAIN_CLOSE
```

---

## 7. Telemetry example

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

> Field names must match the current backend Pydantic schema.

---

## 8. Chạy backend trên EC2 | Run Backend on EC2

```bash
cd ~/aws-iot-dashboard/backend
source venv/bin/activate
pip install -r requirements.txt

sudo systemctl restart aws-iot-backend
sudo systemctl status aws-iot-backend
```

Quick checks:

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/openapi.json
```

Backend logs:

```bash
sudo tail -f /var/log/aws-iot-backend/backend.log
```

---

## 9. Chạy frontend trên Windows | Run Frontend on Windows

```powershell
cd frontend
npm install
npm run dev
```

The Vite proxy forwards relative `/api` requests to the FastAPI backend on EC2.

Example:

```ts
fetch('/api/devices/room_01/latest')
```

---

## 10. Build firmware YOLO UNO

Open the hardware project:

```powershell
cd hardware
```

Create the local secrets file from the example:

```powershell
Copy-Item include\secrets.example.h include\secrets.h
```

Update `include/secrets.h`:

```cpp
#define WIFI_SSID "<YOUR_WIFI_SSID>"
#define WIFI_PASSWORD "<YOUR_WIFI_PASSWORD>"
#define API_BASE_URL "http://<EC2_PUBLIC_IP>:8000"
#define DEVICE_ID "room_01"
```

Build, upload, and monitor:

```powershell
pio run
pio run --target upload
pio device monitor --baud 115200
```

Do not add `/` at the end of `API_BASE_URL`.

---

## 11. Security notes

- Do not commit `.env`, passwords, private keys, or `hardware/include/secrets.h`.
- Use placeholders in public documentation.
- Allow PostgreSQL access to RDS only from the EC2 Security Group.
- Restrict SSH access to the administrator IP.
- Do not hard-code AWS access keys.
- Use an EC2 IAM Role for CloudWatch Agent permissions.

Recommended `.gitignore` entries:

```gitignore
.env
**/.env
*.pem
*.key

venv/
.venv/
**/venv/
**/.venv/
__pycache__/
**/__pycache__/
*.py[cod]

node_modules/
**/node_modules/
dist/
**/dist/

.pio/
**/.pio/
hardware/include/secrets.h

.vscode/
.idea/
.DS_Store
Thumbs.db
```

If `secrets.h` was already tracked:

```powershell
git rm --cached hardware/include/secrets.h
```

This command removes the file from Git tracking but keeps the local file.

---

## 12. Monitoring

Amazon CloudWatch monitors:

- FastAPI application logs
- EC2 CPU
- EC2 memory
- EC2 disk usage
- RDS CPU
- RDS database connections

Configured alarms may include:

- EC2 High CPU
- EC2 High Memory
- EC2 High Disk
- RDS High CPU
- RDS High Connections

---

## 13. Testing checklist

- [ ] YOLO UNO connects to Wi-Fi.
- [ ] YOLO UNO can reach the EC2 public address.
- [ ] Telemetry returns a successful HTTP response.
- [ ] Telemetry is stored in PostgreSQL.
- [ ] Latest and history APIs return data.
- [ ] Frontend can create commands.
- [ ] Hardware receives the latest pending command.
- [ ] Fan, light, and curtain respond correctly.
- [ ] Hardware sends command ACK.
- [ ] Command state changes from `Pending` to `Executed`.
- [ ] CloudWatch receives logs and metrics.
- [ ] CloudWatch alarms use the correct metrics and dimensions.

---

## 14. Documentation

- Deployment guide: `docs/deployment.md`
- Architecture diagrams: `diagrams/`
- Testing evidence: `screenshots/`
- Internship report and workshop: `report/`
- Hardware guide: `hardware/README.md`

---

## 15. License

This repository is developed for educational and internship purposes.
