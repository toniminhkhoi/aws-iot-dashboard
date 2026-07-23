from sqlalchemy.orm import Session
from app.schemas.schemas import TelemetryCreate, DeviceCommand
from app.models.models import Device, TelemetryLog
from typing import Optional
from sqlalchemy.orm.attributes import flag_modified

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

    def create_command(self, target_device_id: str, device_command: DeviceCommand) -> Optional[list[str]]:
        device = self.db.query(Device).filter_by(id=target_device_id).first()
        if not device:
            return None
        existing_command = device.command if device.command else []
        device.command = existing_command + device_command.command
        flag_modified(device, "command")
        self.db.commit()
        self.db.refresh(device)
        return device.command

    def get_latest_command(self, target_device_id: str):
        device = self.db.query(Device).filter_by(id = target_device_id).first()
        # Kiểm tra ép kiểu list an toàn
        commands = device.command
        if isinstance(commands, str):
            commands = [commands]
        # Đảm bảo list không rỗng trước khi lấy phần tử cuối [-1]
        if isinstance(commands, list) and len(commands) > 0:
            return commands[-1]
        return None
