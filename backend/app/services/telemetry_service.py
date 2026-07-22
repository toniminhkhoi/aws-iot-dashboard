from sqlalchemy.orm import Session
from app.schemas.schemas import TelemetryCreate
from app.models.models import Device, TelemetryLog
from typing import Optional

class TelemetryService:
    def __init__(self, db: Session):
        self.db = db        

    def process_telemetry(self, telemetry_in: TelemetryCreate):
        device = self.db.query(Device).filter_by(id=telemetry_in.device_id).first()
        if not device:
            device = Device(
                id = telemetry_in.device_id
            )
            self.db.add(device)
        new_telemetry = TelemetryLog(
            device_id = telemetry_in.device_id,
            temperature = telemetry_in.temperature,
            humidity = telemetry_in.humidity,
            light_intensity = telemetry_in.light_intensity,
            fan_status = telemetry_in.fan_status,
            light_status = telemetry_in.light_status,
            curtain_status = telemetry_in.curtain_status
        )
        self.db.add(new_telemetry)
        self.db.commit()
        self.db.refresh(new_telemetry)
        return new_telemetry
    
    def get_latest_telemetry(self, target_device_id: str) -> Optional[TelemetryLog]:
        telemetry_log = self.db.query(TelemetryLog).filter_by(device_id=target_device_id).order_by(TelemetryLog.timestamp.desc()).first()
        return telemetry_log
        
    def get_history_telemetry(self, target_device_id: str) -> Optional[list[TelemetryLog]]:
        telemetry_logs = self.db.query(TelemetryLog).filter_by(device_id = target_device_id).order_by(TelemetryLog.timestamp.desc()).all()
        return telemetry_logs