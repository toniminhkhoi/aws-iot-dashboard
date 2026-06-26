# Backend

FastAPI backend for AWS IoT Dashboard.

---

# Chạy trên Windows

```powershell
cd backend

# (Tùy chọn) Xóa virtual environment cũ
Remove-Item -Recurse -Force .\venv

# Tạo virtual environment
py -m venv venv

# Kích hoạt virtual environment
.\venv\Scripts\Activate.ps1

# Chỉ cần chạy 1 lần sau khi clone project
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env

# Kiểm tra pip
pip --version

# Chạy backend
uvicorn main:app --reload
```

> **Lưu ý**
>
> - `pip install -r requirements.txt` chỉ cần chạy lại khi `requirements.txt` thay đổi hoặc tạo `venv` mới.
> - `Copy-Item .env.example .env` chỉ cần chạy một lần nếu chưa có file `.env`.

---

# Chạy trên Linux (EC2)

```bash
cd backend

# (Tùy chọn) Xóa virtual environment cũ
rm -rf venv

# Tạo virtual environment
python3 -m venv venv

# Kích hoạt virtual environment
source venv/bin/activate

# Chỉ cần chạy 1 lần sau khi clone project
python3 -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env

# Kiểm tra pip
pip --version

# Chạy backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

> **Lưu ý**
>
> - `pip install -r requirements.txt` chỉ cần chạy lại khi `requirements.txt` thay đổi hoặc tạo `venv` mới.
> - `cp .env.example .env` chỉ cần chạy một lần nếu chưa có file `.env`.

---

# Triển khai trên EC2

Sau khi đã cấu hình `systemd`:

```bash
sudo systemctl start aws-iot-backend
sudo systemctl stop aws-iot-backend
sudo systemctl restart aws-iot-backend
sudo systemctl status aws-iot-backend
journalctl -u aws-iot-backend -f
```

> Khi backend đã chạy bằng **systemd**, **không cần** chạy `uvicorn` thủ công nữa.