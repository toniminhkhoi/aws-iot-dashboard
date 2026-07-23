from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.telemetry_service import TelemetryService
from app.schemas.schemas import APIResponse, TelemetryResponse

router = APIRouter()

@router.get("/device/{device_id}/latest",
            response_model=APIResponse[TelemetryResponse])
def get_latest_telemetry(device_id: str, db: Session = Depends(get_db)):
   telemetry_service = TelemetryService(db)
   latest_log = telemetry_service.get_latest_telemetry(device_id)
   if not latest_log:
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No telemetry data found for device '{device_id}'"
      )
   return {
      "data" : latest_log
   }

@router.get("/device/{device_id}/history",
            response_model=APIResponse[list[TelemetryResponse]])
def get_history_telemetry(device_id : str ,db: Session = Depends(get_db)):
   telemetry_service = TelemetryService(db)
   logs = telemetry_service.get_history_telemetry(device_id)
   if not logs:
      raise HTTPException(
         status_code=status.HTTP_404_NOT_FOUND,
         detail = f"No telemetry data found for device '{device_id}'"
      )
   return {
      "data" : logs
   }
