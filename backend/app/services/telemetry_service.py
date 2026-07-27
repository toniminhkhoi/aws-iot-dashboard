from sqlalchemy.orm import Session
from app.schemas.schemas import TelemetryCreate, DeviceCommand
from app.models.models import Device, TelemetryLog, DeviceCommands
from typing import Optional
# from sqlalchemy.orm.attributes import flag_modified

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
            self.db.flush()
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

    def create_command(self, target_device_id: str, device_command: DeviceCommand):
        device = self.db.query(Device).filter_by(id=target_device_id).first()
        if not device:
            return None
        new_command = DeviceCommands(
            state = "Pending",
            command = device_command.command,
            device_id = target_device_id
        )
        self.db.add(new_command)
        self.db.commit()
        self.db.refresh(new_command)
        return new_command

    # ĐÃ SỬA: Chỉ lấy command có trạng thái "Pending", ưu tiên lệnh cũ nhất xử lý trước (FIFO)
    def get_latest_command(self, target_device_id: str):
        command = self.db.query(DeviceCommands).filter_by(
            device_id=target_device_id, 
            state="Pending"
        ).order_by(DeviceCommands.timestamp.asc()).first()
        
        if command:
            return command
        return None

    def update_command_state(self, target_command_id: int):
        command = self.db.query(DeviceCommands).filter_by(id = target_command_id).first()
        if not command:
            return None
        command.state = "Executed"
        self.db.commit()
        self.db.refresh(command)
        return command