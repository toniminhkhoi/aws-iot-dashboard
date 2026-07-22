from sqlalchemy.orm import Session
from app.schemas.schemas import TelemetryCreate
from app.models.models import Device, TelemetryLog


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
        