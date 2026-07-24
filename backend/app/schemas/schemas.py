from typing import Generic, Optional, TypeVar, Union

from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime

#DTO hứng dữ liệu từ IOT
class TelemetryCreate(BaseModel):
    # Cấu hình cho phép Pydantic nhận diện cả tên alias (camelCase) lẫn tên gốc (snake_case)
    model_config = ConfigDict(populate_by_name=True)
    device_id: str = Field(..., alias="deviceId")
    temperature: float
    humidity: float
    light_intensity: float = Field(..., alias="lightIntensity")
    fan_status: bool = Field(..., alias="fan")
    light_status: bool = Field(..., alias="light")
    curtain_status: bool = Field(..., alias="curtain")

class DeviceCommand(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    command: str = Field(..., alias="Command")
    # @field_validator("command", mode = "before")
    # @classmethod
    # def ensure_list(cls, v):
    #     if isinstance(v, str):
    #         return [v]  # Chuyển "LED_ON" -> ["LED_ON"]
    #     return v
    
#Det response
class TelemetryResponse(BaseModel):
    # Cấu hình này cực kỳ quan trọng: Cho phép DTO tự động đọc dữ liệu từ Model SQLAlchemy
    model_config = ConfigDict(from_attributes=True) 
    id: int
    device_id: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    light_intensity: Optional[float] = None
    fan_status: Optional[bool] = None
    light_status: Optional[bool] = None
    curtain_status: Optional[bool] = None
    timestamp: datetime

dataT = TypeVar("dataT")

class APIResponse(BaseModel, Generic[dataT]):
    status: str = "success"
    data: dataT