# Backend

FastAPI backend for AWS IoT Dashboard.

## Run locally

```bash
cd backend
Remove-Item -Recurse -Force .\venv #để xóa
py -m venv venv

#Chỉ chạy 1 trong 2
source venv/bin/ #Nếu ở Linux trên EC2
.\venv\Scripts\Activate.ps1 #Nếu ở Windows

python -m pip install --upgrade pip
pip --version #kiểm tra
pip install -r requirements.txt
Copy-Item .env.example .env #Tạo file .env

#Chỉ chạy 1 trong 2
uvicorn main:app --host 0.0.0.0 --port 8000 #Nếu ở Linux trên EC2
uvicorn main:app --reload #Nếu ở Windows
