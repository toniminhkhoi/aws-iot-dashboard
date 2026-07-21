from app.database.session import Base, engine
from app.models.models import Device, TelemetryLog

def init_db():
    # Câu lệnh này sẽ quét qua tất cả class kế thừa Base và tạo bảng nếu chưa tồn tại
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Creating database tables...")
    init_db()
    print("Tables created successfully!")