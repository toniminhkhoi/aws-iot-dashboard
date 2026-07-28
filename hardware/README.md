# YOLO UNO Hardware Client

Firmware cho project **AWS IoT Monitoring and Control Dashboard**.

## Phần cứng được giữ lại

- Quạt
- Đèn/relay
- Servo điều khiển rèm
- Cảm biến ánh sáng analog
- Cảm biến nhiệt độ và độ ẩm DHT20
- Màn hình LCD 1602 I2C (tự dò địa chỉ `0x21`, `0x27` hoặc `0x3F`)

## Kết nối LCD I2C

| LCD 1602 I2C | YOLO UNO |
| --- | --- |
| GND | GND |
| VCC | 3V3 |
| SDA | GPIO11 |
| SCL | GPIO12 |

LCD và DHT20 dùng chung bus I2C nên có thể nối song song SDA, SCL, 3V3 và GND.
Nếu module LCD chỉ hoạt động ổn định ở 5V, cần dùng bộ chuyển mức logic I2C
hai chiều; không đưa tín hiệu kéo lên 5V trực tiếp vào GPIO của ESP32-S3.

## Bố trí cổng phần cứng

| Thiết bị | Cổng trên YOLO UNO | Chân dùng trong code |
| --- | --- | --- |
| Cảm biến ánh sáng | Grove `A1-A0` | A0 / GPIO1 |
| Quạt hai chân điều khiển | Grove `D8-D7` | D8/GPIO17 và D7/GPIO10 |
| Đèn LED | Grove `D4-D3` | D3 / GPIO6 |
| Servo rèm | Grove `D6-D5` | D5 / GPIO8 |
| DHT20 | Grove `I2C1` | SDA/GPIO11, SCL/GPIO12 |
| LCD1602 I2C | Grove `I2C2` | SDA/GPIO11, SCL/GPIO12 |

Firmware không chứa PIR, ultrasonic, buzzer, LCD hoặc MQTT.

## Endpoint FastAPI

- `POST /api/telemetry`
- `GET /api/devices/{device_id}/commands/latest`
- `POST /api/devices/{device_id}/commands/{command_id}/ack`

## Command hỗ trợ

- `MODE_AUTO`
- `MODE_MANUAL`
- `FAN_ON`
- `FAN_OFF`
- `LIGHT_ON`
- `LIGHT_OFF`
- `CURTAIN_OPEN`
- `CURTAIN_CLOSE`

Ở chế độ Auto, quạt bật khi nhiệt độ từ 30°C, LED bật khi giá trị ánh sáng
dưới 350 và rèm đóng khi giá trị ánh sáng từ 700. Lệnh điều khiển trực tiếp
quạt, LED hoặc rèm sẽ tự chuyển firmware sang chế độ Manual.

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
