# AWS IoT Monitoring and Control Dashboard

An IoT monitoring and control system built with FastAPI, React, PostgreSQL, YOLO UNO, and AWS services.

[Tiếng Việt](README.vi.md)

---

## 1. Overview

This project provides an end-to-end IoT monitoring and control platform.

The **YOLO UNO** device collects temperature, humidity, and light intensity
data and sends telemetry over HTTP to an Application Load Balancer (ALB). The
ALB distributes requests to FastAPI backend instances in an Auto Scaling group
spanning two Availability Zones. The backend stores telemetry and commands in
an Amazon RDS for PostgreSQL Multi-AZ database.

The production React + Vite build is hosted in Amazon S3 and delivered through
Amazon CloudFront, protected by AWS WAF. CloudFront serves the static dashboard
from S3 and routes `/api/*` requests to the backend ALB. The hardware also
polls the ALB for pending commands, executes them, and sends acknowledgements.
Amazon CloudWatch collects backend logs and infrastructure metrics.

### Main capabilities

- Collect temperature, humidity, and light intensity data.
- Store telemetry in PostgreSQL on Amazon RDS.
- Display latest and historical telemetry.
- Control the fan, light, and curtain remotely.
- Manage command states from `Pending` to `Executed`.
- Send command acknowledgements from hardware.
- Deliver the static frontend globally with S3, CloudFront, and AWS WAF.
- Distribute API traffic through an Application Load Balancer.
- Scale and replace backend instances with an Auto Scaling group and backend AMI.
- Use RDS PostgreSQL Multi-AZ with synchronous replication and automatic failover.
- Encrypt supported storage with an AWS managed KMS key.
- Retain RDS backups for seven days.
- Monitor backend logs and infrastructure metrics with Amazon CloudWatch.

---

## 2. Architecture

<p align="center">
  <img
    src="diagrams/aws-iot-dashboard-architecture.png"
    alt="AWS IoT Monitoring and Control Dashboard Architecture"
    width="100%"
  />
</p>

The system is deployed in the AWS Singapore Region (`ap-southeast-1`):

1. A web user connects over HTTPS through AWS WAF to CloudFront.
2. CloudFront's default behavior serves the React + Vite static build from the
   frontend S3 bucket.
3. CloudFront forwards `/api/*` requests to the IoT backend ALB.
4. YOLO UNO communicates with the same ALB directly over HTTP.
5. The ALB performs health checks and accepts application traffic.
6. Its target group forwards HTTP traffic on port `8000` to FastAPI instances
   in an Auto Scaling group across public subnets in `ap-southeast-1a` and
   `ap-southeast-1c`.
7. Backend instances use the RDS endpoint over TCP `5432`.
8. Amazon RDS for PostgreSQL runs the primary database in a private subnet in
   `ap-southeast-1c` and the standby database in `ap-southeast-1b`.
9. RDS synchronously replicates to the standby and provides automatic failover.

Backend instances are created from a backend AMI and use EBS volumes. IAM
roles provide workload permissions, CloudWatch receives logs and metrics, an
AWS managed KMS key protects supported encrypted resources, and database
backups are retained for seven days.


### AWS services

- Amazon S3
- Amazon CloudFront
- AWS WAF
- Elastic Load Balancing — Application Load Balancer
- Amazon EC2 Auto Scaling
- Amazon EC2 and Amazon Machine Images
- Amazon EBS
- Amazon RDS for PostgreSQL Multi-AZ
- Amazon VPC, public/private subnets, and Security Groups
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch
- AWS Key Management Service (AWS KMS)
- RDS automated backups

The project does not use AWS IoT Core, Lambda, API Gateway, SNS, ECS, ECR,
Cognito, or DynamoDB.

---

## 3. Team Responsibilities

| Member | Responsibility |
|---|---|
| **Phạm Lê Minh Khôi** | AWS infrastructure, EC2 deployment, RDS, CloudWatch, Security Groups, DevOps, and YOLO UNO hardware |
| **Thượng Đình Hưng** | React + Vite frontend, dashboard interface, overall system integration, debugging, and project demo recording |
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
- Grove LED module
- Servo motor
- LCD1602 I2C display

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
- RDS automated backups

---

## 5. Repository Structure and Submission Mapping

This project uses two repositories:

1. A separate **Hugo report repository** is used for internship submission.
   This workshop is documented under `content/5-Workshop/`.
2. **`aws-iot-dashboard`** is this source repository and contains the complete
   backend, frontend, and YOLO UNO firmware.

### Submission/report repository

```text
submission-report/
├── .github/
│   └── workflows/                 # GitHub Pages deployment
├── archetypes/                    # Hugo content templates
├── content/
│   ├── 1-Worklog/
│   ├── 2-Proposal/
│   ├── 3-BlogsTranslated/
│   ├── 4-EventParticipated/
│   ├── 5-Workshop/                # This AWS IoT Dashboard workshop
│   ├── 6-Self-evaluation/
│   ├── 7-Feedback/
│   ├── _index.md
│   └── _index.vi.md
├── layouts/                       # Hugo layout overrides
├── static/                        # Images and other static files
├── themes/
│   └── hugo-theme-learn/
├── config.toml
└── README.md
```

### Workshop source repository

```text
aws-iot-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/                  # Health, telemetry, and device command routes
│   │   ├── database/             # PostgreSQL session and database initialization
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic request and response schemas
│   │   ├── services/             # Telemetry and command business logic
│   │   └── setting.py            # Backend environment configuration
│   ├── main.py                   # FastAPI application entry point
│   ├── simulator.py              # Software device simulator
│   ├── requirements.txt
│   ├── README.md
│   └── README.vi.md
├── frontend/
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── assets/               # Dashboard images
│   │   ├── services/             # API and IoT data mapping
│   │   ├── App.tsx               # Main dashboard
│   │   └── main.tsx              # React entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── README.md
│   └── README.vi.md
├── hardware/
│   ├── boards/
│   │   └── yolo_uno.json         # Custom PlatformIO board definition
│   ├── include/
│   │   ├── secrets.example.h
│   │   └── secrets.h             # Local only; ignored by Git
│   ├── src/
│   │   └── main.cpp              # YOLO UNO firmware
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
Invoke-WebRequest `
  -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" `
  -OutFile "global-bundle.pem"
```

Update `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard?sslmode=verify-full&sslrootcert=global-bundle.pem
```

Use the RDS endpoint shown under **Connectivity & security**, without `https://`
or the port. URL-encode the database password before inserting it into
`DATABASE_URL`. A local connection also requires RDS to be reachable from the
machine, for example through an approved Security Group rule, VPN, or tunnel.

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

For production, build the frontend, upload `dist/` to the frontend S3 bucket,
and invalidate the CloudFront cache:

```powershell
npm run build
aws s3 sync dist "s3://<FRONTEND_BUCKET>" --delete
aws cloudfront create-invalidation `
  --distribution-id "<CLOUDFRONT_DISTRIBUTION_ID>" `
  --paths "/*"
```

Configure the CloudFront distribution with the S3 bucket as the default origin
and the ALB as a second origin. Route `/api/*` to the ALB, disable caching for
that behavior, allow the required HTTP methods, and attach the WAF web ACL to
the distribution. Keep the S3 bucket private and grant access only through
CloudFront Origin Access Control.

### 8.4 Hardware setup

```powershell
cd aws-iot-dashboard\hardware
Copy-Item include\secrets.example.h include\secrets.h
```

Update `include/secrets.h`:

```cpp
#define WIFI_SSID "<YOUR_WIFI_SSID>"
#define WIFI_PASSWORD "<YOUR_WIFI_PASSWORD>"
#define API_BASE_URL "http://<ALB_DNS_NAME>"
#define DEVICE_ID "room_01"
```

The ALB listener accepts HTTP traffic and forwards it to the backend target
group on port `8000`. Do not append `/api` to `API_BASE_URL`; the firmware adds
the endpoint paths itself.

Build and upload:

```powershell
pio run
pio run --target upload
pio device monitor --baud 115200
```

---

## 9. Production Backend Deployment

The commands below prepare a backend instance for the AMI used by the Auto
Scaling group. Do not treat the preparation instance as the only production
server.

### 9.1 Connect from Windows PowerShell

```powershell
ssh -i "$env:USERPROFILE\.ssh\iot-dashboard-key.pem" ec2-user@<EC2_PUBLIC_DNS>
```

### 9.2 Prepare the backend instance

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

Add:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard?sslmode=verify-full&sslrootcert=/home/ec2-user/aws-iot-dashboard/backend/global-bundle.pem
```

Use the exact RDS endpoint hostname, without `https://` or `:5432`. Ensure the
RDS Security Group allows inbound TCP `5432` from the backend instances'
Security Group. Do not open PostgreSQL to `0.0.0.0/0`.

Then:

```bash
chmod 600 .env
```

### 9.3 Optional RDS connection test

```bash
cd ~/aws-iot-dashboard/backend
export RDSHOST="<RDS_ENDPOINT>"
psql "host=$RDSHOST port=5432 dbname=iot_dashboard user=postgres sslmode=verify-full sslrootcert=$PWD/global-bundle.pem"
```

Enter the RDS password when `psql` prompts for it.

Inside PostgreSQL:

```sql
\conninfo
\dt
```

Exit:

```sql
\q
```

A manual `psql` connection is only needed for checks and debugging. The backend
connects automatically through `DATABASE_URL` using TLS certificate and endpoint
verification.

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

### 9.5 Create the AMI, target group, ALB, and Auto Scaling group

1. Stop the backend preparation instance and create a versioned backend AMI.
2. Create a launch template that uses the AMI, the backend instance Security
   Group, an IAM instance profile, and encrypted EBS volumes.
3. Create a target group using HTTP port `8000` and health check path
   `/api/health`.
4. Create an internet-facing ALB spanning the public subnets in
   `ap-southeast-1a` and `ap-southeast-1c`. Configure its listener to forward
   to the target group.
5. Create an Auto Scaling group from the launch template in both public
   subnets, attach the target group, enable ELB health checks, and set the
   required minimum, desired, and maximum capacity.
6. Wait until all instances pass both EC2 and target-group health checks.
7. Configure CloudFront's `/api/*` behavior to use the ALB origin.

The ALB Security Group should accept only the intended application traffic.
The backend instance Security Group should allow TCP `8000` from the ALB
Security Group. If YOLO UNO calls the ALB over HTTP as shown in the diagram,
keep an HTTP listener; use HTTPS and device-side TLS when that is supported by
the firmware.

### 9.6 Deploy backend updates

Build a new versioned AMI after applying and testing backend changes. Update
the launch template to a new version, point the Auto Scaling group at that
version, and start an instance refresh. This preserves the multi-instance
deployment and avoids updating instances manually in place.

Verify an instance locally:

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/openapi.json | grep -o '/api/[^"]*' | sort -u
```

View logs:

```bash
sudo tail -f /var/log/aws-iot-backend/backend.log /var/log/aws-iot-backend/backend-error.log
```

Verify through the load balancer:

```bash
curl http://<ALB_DNS_NAME>/api/health
```

---

## 10. Security Notes

- Do not commit `.env`, `.pem`, private keys, passwords, or `hardware/include/secrets.h`.
- Keep the frontend S3 bucket private and use CloudFront Origin Access Control.
- Attach the WAF web ACL to CloudFront and tune managed/rate-based rules.
- Allow backend port `8000` only from the ALB Security Group.
- Allow PostgreSQL port `5432` only from the backend instance Security Group.
- Restrict SSH access to the administrator IP.
- Do not hard-code AWS access keys.
- Use an EC2 IAM Role for CloudWatch and other required AWS permissions.
- Encrypt EBS and RDS storage with KMS and retain RDS backups for seven days.

---

## 11. Testing Checklist

- [x] YOLO UNO connects to Wi-Fi.
- [x] CloudFront serves the frontend from the private S3 bucket.
- [x] WAF protects the CloudFront distribution.
- [x] CloudFront routes `/api/*` to the backend ALB.
- [x] YOLO UNO can reach the backend ALB.
- [x] ALB health checks pass for instances in both Availability Zones.
- [x] Auto Scaling replaces an unhealthy backend instance.
- [x] Telemetry is stored in PostgreSQL.
- [x] Latest and history APIs return data.
- [x] Frontend can create commands.
- [x] Hardware receives and executes commands.
- [x] Hardware sends command ACK.
- [x] Command state changes from `Pending` to `Executed`.
- [x] RDS Multi-AZ replication and failover are configured.
- [x] RDS backups are retained for seven days.
- [x] CloudWatch receives backend logs and infrastructure metrics.

---

## 12. Documentation

- Final workshop report: `content/5-Workshop/` in the separate submission repository
- Architecture diagrams: `diagrams/`
- Backend guide: `backend/README.md`
- Frontend guide: `frontend/README.md`
- Hardware guide: `hardware/README.md`

---

## 13. License

This repository is developed for educational and internship purposes.
