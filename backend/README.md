# AWS IoT Dashboard Backend

FastAPI backend for the **Cloud-based IoT Monitoring and Control Dashboard on AWS**.

Backend này nhận dữ liệu telemetry từ IoT device/simulator, lưu vào PostgreSQL/RDS và cung cấp API để dashboard đọc dữ liệu mới nhất hoặc lịch sử dữ liệu.

---

## Public URLs

> Public IP/DNS có thể thay đổi sau khi stop/start EC2 nếu chưa dùng Elastic IP.

```text
Swagger UI:  http://3.1.210.255:8000/docs
Health API:  http://3.1.210.255:8000/api/health
Root API:    http://3.1.210.255:8000/
```

---

## SSH vào EC2

Trên Windows PowerShell, vào thư mục chứa key `.pem` rồi SSH:

```powershell
cd F:\Download
ssh -i "F:\Download\iot-dashboard-key.pem" ec2-user@ec2-3-1-210-255.ap-southeast-1.compute.amazonaws.com
```

Nếu key báo lỗi quyền quá mở, chạy:

```powershell
$key = "F:\Download\iot-dashboard-key.pem"
icacls $key /inheritance:r
icacls $key /remove "NT AUTHORITY\Authenticated Users" "BUILTIN\Users" "Everyone"
icacls $key /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(R)"
```

---

## Chạy backend trên Windows local

Dùng phần này khi muốn chạy backend trên máy cá nhân để phát triển/test local.

```powershell
cd aws-iot-dashboard/backend

# Tạo virtual environment
py -m venv venv

# Kích hoạt virtual environment
.\venv\Scripts\Activate.ps1

# Cài dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# Tạo file môi trường nếu chưa có
Copy-Item .env.example .env

# Kiểm tra pip
pip --version

# Chạy backend local
uvicorn main:app --reload
```

Mở Swagger local:

```text
http://127.0.0.1:8000/docs
```

---

## Cài đặt lần đầu trên Linux EC2

Dùng phần này sau khi clone source code lần đầu lên EC2.

```bash
cd ~/aws-iot-dashboard/backend

# Tạo virtual environment nếu chưa có
python3 -m venv venv

# Kích hoạt virtual environment
source venv/bin/activate

# Cài dependencies
python3 -m pip install --upgrade pip
pip install -r requirements.txt

# Tạo file môi trường nếu chưa có
cp .env.example .env

# Kiểm tra pip
pip --version
```

> Không cần xóa `venv` mỗi lần deploy. Chỉ xóa `venv` khi môi trường Python bị lỗi hoặc muốn tạo lại từ đầu.

---

## Cấu hình biến môi trường `.env`

Mở file `.env`:

```bash
cd ~/aws-iot-dashboard/backend
nano .env
```

Ví dụ cấu hình kết nối RDS PostgreSQL:

```env
DATABASE_URL=postgresql://postgres:<PASSWORD>@iot-dashboard-db.cnowwiw6oqtq.ap-southeast-1.rds.amazonaws.com:5432/iot_dashboard
```

Lưu file trong nano:

```text
Ctrl + O
Enter
Ctrl + X
```

> Không commit file `.env` lên GitHub nếu có password thật.

---

## Triển khai backend bằng systemd trên EC2

Backend trên EC2 nên chạy bằng `systemd`, không chạy thủ công bằng `uvicorn` trong terminal.

### Các lệnh thường dùng

```bash
# Kiểm tra backend có đang chạy không
sudo systemctl status aws-iot-backend

# Sau khi sửa code, pull code mới hoặc sửa .env
sudo systemctl restart aws-iot-backend

# Nếu backend đang dừng
sudo systemctl start aws-iot-backend

# Chỉ dùng khi thật sự muốn tắt backend
sudo systemctl stop aws-iot-backend

# Xem log realtime khi test API/simulator
journalctl -u aws-iot-backend -f
```

Thoát màn hình `systemctl status` bằng phím:

```text
q
```

Thoát màn hình `journalctl -f` bằng:

```text
Ctrl + C
```

> `Ctrl + C` trong `journalctl` chỉ thoát màn hình log, không dừng backend. Backend vẫn chạy bằng `systemd`.

---

## Khi nào mới chạy `uvicorn` thủ công?

Chỉ chạy `uvicorn` thủ công khi muốn debug trực tiếp. Trước khi chạy thủ công, cần dừng service để tránh lỗi trùng port `8000`.

```bash
sudo systemctl stop aws-iot-backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Khi debug xong, bấm `Ctrl + C`, rồi bật lại systemd:

```bash
sudo systemctl start aws-iot-backend
sudo systemctl status aws-iot-backend
```

---

## Workflow sau khi pull code mới

```bash
cd ~/aws-iot-dashboard
git pull origin main

cd backend
source venv/bin/activate
pip install -r requirements.txt

sudo systemctl restart aws-iot-backend
sudo systemctl status aws-iot-backend
journalctl -u aws-iot-backend -f
```

---

## API endpoints

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/` | Kiểm tra root API |
| `GET` | `/api/health` | Health check backend |
| `POST` | `/api/telemetry` | Gửi telemetry từ device/simulator |
| `GET` | `/api/devices/{device_id}/latest` | Lấy telemetry mới nhất của device |
| `GET` | `/api/devices/{device_id}/history?limit=20` | Lấy lịch sử telemetry của device |

Ví dụ payload gửi telemetry:

```json
{
  "device_id": "room_01",
  "temperature": 31.2,
  "humidity": 68.5,
  "light_level": 520,
  "presence": true,
  "distance_cm": 110.0,
  "fan_state": "off",
  "light_state": "on",
  "curtain_angle": 60
}
```

---

## Test RDS PostgreSQL từ EC2

Cài PostgreSQL client:

```bash
sudo dnf install postgresql15 -y
psql --version
```

Kết nối vào RDS:

```bash
psql -h iot-dashboard-db.cnowwiw6oqtq.ap-southeast-1.rds.amazonaws.com -U postgres -d iot_dashboard
```

Kiểm tra bảng:

```sql
\dt
```

Xem dữ liệu mới nhất:

```sql
SELECT * FROM sensor_readings ORDER BY created_at DESC LIMIT 5;
```

Thoát PostgreSQL:

```sql
\q
```

---

## Chạy IoT simulator

Simulator dùng để giả lập thiết bị IoT gửi dữ liệu lên backend.

```bash
cd ~/aws-iot-dashboard/backend
source venv/bin/activate
python simulator.py
```

Khi simulator chạy, kiểm tra log backend bằng terminal khác:

```bash
journalctl -u aws-iot-backend -f
```

Nếu thấy log dạng sau là thành công:

```text
POST /api/telemetry HTTP/1.1 200 OK
```

---

## Tắt tài nguyên AWS để tránh phát sinh phí

Khi không dùng nữa trong ngày:

```text
EC2 → Instances → chọn iot-backend-server → Instance state → Stop instance
RDS → Databases → chọn iot-dashboard-db → Actions → Stop temporarily
```

Lưu ý:

- Stop EC2 chỉ dừng phí compute, EBS volume vẫn có thể tính phí lưu trữ.
- Stop RDS chỉ dừng phí DB instance hours, storage/backup/snapshot vẫn có thể tính phí.
- RDS stop tạm thời có thể tự start lại sau một thời gian, nên nếu kết thúc project hẳn thì cần delete database và snapshot không cần dùng.

---

## Ghi chú cho báo cáo

Các AWS services đã sử dụng:

```text
Amazon EC2
Amazon RDS for PostgreSQL
Amazon VPC / Security Groups
Amazon EBS
IAM / Budget
```

Luồng hệ thống:

```text
Simulator / Hardware
        ↓ HTTP POST /api/telemetry
FastAPI Backend on EC2
        ↓ SQLAlchemy / PostgreSQL
Amazon RDS PostgreSQL
        ↓
Dashboard / API latest-history
```
