from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import JSONB

def get_time_now():
    return datetime.now(timezone.utc)

class Device(Base):
    __tablename__ = "devices"
    id = Column(String, primary_key = True, index = True) #sử dụng id do IOT gửi lên để làm id luôn
    building_name = Column(String, nullable = True)
    # floor = Column(String, nullable = True)
    # is_active = Column(Boolean, default = True)
    created_at = Column(DateTime, default = get_time_now)
    telemetry_logs = relationship("TelemetryLog", back_populates = "device")
    commands = relationship("DeviceCommands", back_populates= "device")

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"
    id = Column(Integer, primary_key = True, index = True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id"), index=True)
    temperature = Column(Float, nullable = True)
    humidity = Column(Float, nullable = True)
    light_intensity = Column(Float, nullable = True)
    fan_status = Column(Boolean, nullable = True)
    light_status = Column(Boolean, nullable = True)
    curtain_status = Column(Boolean, nullable = True)
    timestamp = Column(DateTime, default = get_time_now)
    device = relationship("Device", back_populates = "telemetry_logs")

class DeviceCommands(Base):
    __tablename__ = "commands"
    id = Column(Integer, primary_key=True, index= True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id"), index=True)
    state = Column(String)
    timestamp = Column(DateTime, default = get_time_now)
    command = Column(String)
    device = relationship("Device", back_populates= "commands")