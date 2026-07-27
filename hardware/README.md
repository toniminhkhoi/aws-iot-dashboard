# YOLO UNO Hardware Client — Minimal

Firmware cho project **AWS IoT Monitoring and Control Dashboard**.

## Phần cứng được giữ lại

- Quạt
- Đèn/relay
- Servo điều khiển rèm
- Cảm biến ánh sáng analog
- Cảm biến nhiệt độ và độ ẩm DHT20

Firmware không chứa PIR, ultrasonic, buzzer, LCD hoặc MQTT.

## Endpoint FastAPI

- `POST /api/telemetry`
- `GET /api/devices/{device_id}/commands/latest`
- `POST /api/devices/{device_id}/commands/{command_id}/ack`

## Command hỗ trợ

- `FAN_ON`
- `FAN_OFF`
- `LIGHT_ON`
- `LIGHT_OFF`
- `CURTAIN_OPEN`
- `CURTAIN_CLOSE`

## Chuẩn bị cấu hình

Sao chép:

```text
include/secrets.example.h
```

thành:

```text
include/secrets.h
```

Sau đó cấu hình Wi-Fi và địa chỉ EC2 trong `include/secrets.h`.

## Build và upload

```powershell
pio run
pio run --target upload
pio device monitor --baud 115200
```

## Payload telemetry

```json
{
  "deviceId": "room_01",
  "temperature": 30.5,
  "humidity": 72.0,
  "lightIntensity": 1050,
  "fan": false,
  "light": true,
  "curtain": false
}
```

`CURTAIN_OPEN_ANGLE` mặc định là `90`. Cần điều chỉnh theo cơ cấu rèm thực tế.
