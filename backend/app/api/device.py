from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.telemetry_service import TelemetryService
from app.schemas.schemas import APIResponse, TelemetryResponse, DeviceCommand

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

@router.post("/devices/{device_id}/commands")
def create_command(command_create: DeviceCommand, device_id:str, db:Session = Depends(get_db)):
   telemetry_service = TelemetryService(db)
   command = telemetry_service.create_command( device_id, command_create)
   if not command:
      raise HTTPException(
               status_code=status.HTTP_404_NOT_FOUND,
               detail = f"No telemetry data found for device '{device_id}'"
            )
   return {
      "status" : "success"
   }

@router.get("/devices/{device_id}/commands/latest")
def get_latest_command(device_id:str, db:Session = Depends(get_db)):
   telemetry_service = TelemetryService(db)
   command = telemetry_service.get_latest_command(device_id)
   if not command:
      raise HTTPException(
                     status_code=status.HTTP_404_NOT_FOUND,
                     detail = f"No data found for device '{device_id}'"
                  )
   return {
      "status": "success",
      "command" : command
   }


