from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.setting import setting

engine = create_engine(
    setting.DATABASE_URL,
    echo=True  # Bật log xem câu lệnh SQL
)

SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()