from pydantic import BaseModel, Field, ConfigDict
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

# ==========================================
# 2. DTO RESPONSE (Trả dữ liệu về cho React Frontend)
# ==========================================
# class TelemetryResponse(BaseModel):
#     # Cấu hình này cực kỳ quan trọng: Cho phép DTO tự động đọc dữ liệu từ Model SQLAlchemy
#     model_config = ConfigDict(from_attributes=True) 

#     id: int
#     device_id: str
#     temperature: float
#     humidity: float
#     light_intensity: float
#     fan_status: bool
#     light_status: bool
#     curtain_status: bool
#     timestamp: datetime