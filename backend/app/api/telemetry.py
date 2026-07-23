from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.schemas import TelemetryCreate
from app.database.session import get_db
from app.services.telemetry_service import TelemetryService
router = APIRouter()

@router.post("/telemetry")
def add_telemetry(create: TelemetryCreate, db: Session = Depends(get_db)):
    telemetry_service = TelemetryService(db)
    telemetry = telemetry_service.process_telemetry(create)
    return {
        "status" : "success",
        "message" : "Added new telemetry",
        "data": {
          "log_id": telemetry.id,
          "device_id": telemetry.device_id,
          "timestamp": telemetry.timestamp,
      },
    }