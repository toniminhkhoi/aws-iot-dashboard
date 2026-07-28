# AWS IoT Monitoring and Control Dashboard

An IoT monitoring and control system built with FastAPI, React, PostgreSQL, YOLO UNO, and AWS services.

[Tiếng Việt](README.vi.md)

---

## 1. Overview

This project provides an end-to-end IoT monitoring and control platform.

The **YOLO UNO** device collects temperature, humidity, and light intensity data and sends telemetry to a FastAPI backend hosted on Amazon EC2. The backend stores data in Amazon RDS for PostgreSQL. A React + Vite dashboard displays the latest telemetry and historical data and allows users to remotely control a fan, light, and curtain.

The hardware polls the backend for the latest pending command, executes it, and sends an acknowledgement. Amazon CloudWatch collects backend logs and monitors EC2 and RDS metrics.

### Main capabilities

- Collect temperature, humidity, and light intensity data.
- Store telemetry in PostgreSQL on Amazon RDS.
- Display latest and historical telemetry.
- Control the fan, light, and curtain remotely.
- Manage command states from `Pending` to `Executed`.
- Send command acknowledgements from hardware.
- Run the backend as a `systemd` service on EC2.
- Monitor EC2, RDS, and backend logs with Amazon CloudWatch.

---

## 2. Architecture

<p align="center">
  <img
    src="diagrams/aws-iot-dashboard-architecture.png"
    alt="AWS IoT Monitoring and Control Dashboard Architecture"
    width="100%"
  />
</p>

The architecture includes:

- A React + Vite frontend running outside AWS.
- A FastAPI backend hosted on Amazon EC2.
- Amazon RDS for PostgreSQL for telemetry and command persistence.
- YOLO UNO hardware sending telemetry, polling pending commands, and sending command acknowledgements.
- Amazon CloudWatch collecting EC2 logs, EC2 metrics, and RDS metrics.
- CloudWatch Alarms monitoring CPU, memory, disk usage, and database connections.
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

The project does not use AWS IoT Core, Lambda, API Gateway, S3, SNS, ECS, ECR, Cognito, CloudFront, or DynamoDB.

---

## 3. Team Responsibilities

| Member | Responsibility |
|---|---|
| **Phạm Lê Minh Khôi** | AWS infrastructure, EC2 deployment, RDS, CloudWatch, Security Groups, DevOps, and YOLO UNO hardware |
| **Thượng Đình Hưng** | React + Vite frontend and dashboard interface |
| **Ngô Minh Thuận** | FastAPI backend, API endpoints, database integration, and command processing |
| **Lê Bảo Khánh** | Documentation, proposal, blog posts, weekly worklog, and event reports |

---

## 4. Technologies

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
- DHT20 temperature and humidity sensor
- Analog light sensor
- Fan module
- Relay/light module
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

## 5. Repository Structure

```text
aws-iot-dashboard/
├── backend/
├── frontend/
├── hardware/
│   ├── boards/
│   │   └── yolo_uno.json
│   ├── include/
│   │   ├── secrets.example.h
│   │   └── secrets.h
│   ├── src/
│   │   └── main.cpp
│   ├── platformio.ini
│   └── README.md
├── diagrams/
├── docs/
├── report/
├── screenshots/
├── README.md
├── README.vi.md
└── .gitignore
```

---

## 6. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root endpoint |
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/telemetry` | Receive telemetry from YOLO UNO |
| `GET` | `/api/devices/{device_id}/latest` | Get latest telemetry |
| `GET` | `/api/devices/{device_id}/history` | Get telemetry history |
| `POST` | `/api/devices/{device_id}/commands` | Create a device command |
| `GET` | `/api/devices/{device_id}/commands/latest` | Get latest pending command |
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

## 7. Telemetry Example

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

## 8. Initial Setup

### 8.1 Clone the repository

Run on Windows PowerShell:

```powershell
git clone <GITHUB_REPOSITORY_URL>
cd aws-iot-dashboard
```

### 8.2 Backend setup on Windows

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Update `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:<RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard
```

Run locally:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 8.3 Frontend setup on Windows

```powershell
cd aws-iot-dashboard\frontend
npm install
npm run dev
```

### 8.4 Hardware setup

```powershell
cd aws-iot-dashboard\hardware
Copy-Item include\secrets.example.h include\secrets.h
```

Update `include/secrets.h`:

```cpp
#define WIFI_SSID "<YOUR_WIFI_SSID>"
#define WIFI_PASSWORD "<YOUR_WIFI_PASSWORD>"
#define API_BASE_URL "http://<EC2_PUBLIC_IP>:8000"
#define DEVICE_ID "room_01"
```

Build and upload:

```powershell
pio run
pio run --target upload
pio device monitor --baud 115200
```

---

## 9. EC2 Backend Setup

### 9.1 Connect from Windows PowerShell

```powershell
ssh -i "$env:USERPROFILE\.ssh\iot-dashboard-key.pem" ec2-user@<EC2_PUBLIC_DNS>
```

### 9.2 First-time setup on EC2

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
nano .env
```

Add:

```env
DATABASE_URL=postgresql://postgres:<RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard
```

Then:

```bash
chmod 600 .env
```

### 9.3 Optional RDS connection test

```bash
cd ~
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
psql "host=<RDS_ENDPOINT> port=5432 dbname=iot_dashboard user=postgres sslmode=verify-full sslrootcert=$HOME/global-bundle.pem"
```

Inside PostgreSQL:

```sql
\dt
```

Exit:

```sql
\q
```

A manual `psql` connection is only needed for checks and debugging. The backend connects automatically through `DATABASE_URL`.

### 9.4 Create the systemd service

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

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable aws-iot-backend
sudo systemctl start aws-iot-backend
sudo systemctl status aws-iot-backend
```

### 9.5 Daily update commands

```bash
cd ~/aws-iot-dashboard
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart aws-iot-backend
sudo systemctl status aws-iot-backend
```

Verify:

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/openapi.json | grep -o '/api/[^"]*' | sort -u
```

View logs:

```bash
sudo tail -f /var/log/aws-iot-backend/backend.log /var/log/aws-iot-backend/backend-error.log
```

---

## 10. Security Notes

- Do not commit `.env`, `.pem`, private keys, passwords, or `hardware/include/secrets.h`.
- Allow PostgreSQL access to RDS only from the EC2 Security Group.
- Restrict SSH access to the administrator IP.
- Do not hard-code AWS access keys.
- Use an EC2 IAM Role for CloudWatch Agent permissions.

---

## 11. Testing Checklist

- [ ] YOLO UNO connects to Wi-Fi.
- [ ] YOLO UNO can reach the EC2 backend.
- [ ] Telemetry is stored in PostgreSQL.
- [ ] Latest and history APIs return data.
- [ ] Frontend can create commands.
- [ ] Hardware receives and executes commands.
- [ ] Hardware sends command ACK.
- [ ] Command state changes from `Pending` to `Executed`.
- [ ] CloudWatch receives logs and metrics.

---

## 12. Documentation

- Deployment guides: `docs/`
- Architecture diagrams: `diagrams/`
- Testing evidence: `screenshots/`
- Proposal, blogs, worklogs, and event reports: `report/`
- Hardware guide: `hardware/README.md`

---

## 13. License

This repository is developed for educational and internship purposes.
