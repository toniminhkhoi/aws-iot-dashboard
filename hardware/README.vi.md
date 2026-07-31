# Firmware YOLO UNO

[English](README.md)

Firmware cho thiết bị phần cứng của dự án **AWS IoT Monitoring and Control
Dashboard**. Board YOLO UNO đọc cảm biến, tự động điều khiển thiết bị và giao
tiếp qua HTTP với FastAPI backend thông qua Application Load Balancer.

Firmware hiện tại sử dụng:

- Cảm biến nhiệt độ, độ ẩm DHT20.
- Cảm biến ánh sáng analog.
- Quạt hai chân điều khiển.
- Đèn LED hoặc relay.
- Servo đóng/mở rèm.
- LCD 1602 giao tiếp I2C.
- Wi-Fi để gửi telemetry, nhận lệnh và xác nhận lệnh đã thực thi.

> Firmware không kết nối AWS IoT Core và không sử dụng MQTT. Tên dự án thể hiện
> hệ thống triển khai trên AWS; board gọi trực tiếp backend ALB bằng HTTP.

## 1. Cấu trúc thư mục

```text
hardware/
├── boards/
│   └── yolo_uno.json         # Định nghĩa board ESP32-S3 tùy chỉnh
├── include/
│   ├── secrets.example.h     # Mẫu cấu hình
│   └── secrets.h             # Cấu hình local, không được commit
├── src/
│   └── main.cpp              # Mã nguồn firmware
├── .gitignore
├── platformio.ini
├── README.md
└── README.vi.md
```

## 2. Phần cứng và chân kết nối

### Bảng chân

| Thiết bị | Cổng YOLO UNO | Chân trong firmware | Ghi chú |
|---|---|---:|---|
| Cảm biến ánh sáng | Grove `A1-A0` | A0 / `GPIO1` | Đọc ADC, lấy trung bình 10 mẫu |
| Quạt | Grove `D8-D7` | D8 / `GPIO17` và D7 / `GPIO10` | `GPIO17 = LOW`, `GPIO10 = HIGH` thì quạt chạy |
| Đèn LED/relay | Grove `D4-D3` | D3 / `GPIO6` | Active HIGH |
| Servo rèm | Grove `D6-D5` | D5 / `GPIO38` | PWM 50 Hz, xung 500–2400 µs |
| DHT20 | Một cổng I2C | SDA / `GPIO11`, SCL / `GPIO12` | Địa chỉ `0x38` |
| LCD 1602 I2C | Một cổng I2C | SDA / `GPIO11`, SCL / `GPIO12` | Tự dò `0x21`, `0x27`, `0x3F` |

> Chân servo trong `src/main.cpp` là `GPIO38`. Nếu phần cứng đang đấu theo một
> sơ đồ cũ dùng chân khác, cần đấu lại hoặc sửa `PIN_SERVO` trước khi nạp.

### Kết nối bus I2C

| DHT20/LCD | YOLO UNO |
|---|---|
| GND | GND |
| VCC | 3V3 |
| SDA | GPIO11 |
| SCL | GPIO12 |

DHT20 và LCD dùng chung bus I2C 100 kHz, vì vậy có thể nối song song SDA, SCL,
3V3 và GND. Các cổng I2C trên YOLO UNO cũng dùng chung hai chân này.

Nếu module LCD chỉ hoạt động ổn định ở 5V, hãy dùng bộ chuyển mức logic I2C hai
chiều. Không để điện trở kéo lên 5V của module nối trực tiếp với GPIO ESP32-S3.
Servo và quạt nên dùng nguồn phù hợp với dòng tải; luôn nối chung GND với board.

## 3. Chuẩn bị môi trường

Cần cài một trong hai lựa chọn:

- [Visual Studio Code](https://code.visualstudio.com/) cùng extension PlatformIO
  IDE; hoặc
- PlatformIO Core có lệnh `pio` trong terminal.

Kiểm tra PlatformIO Core:

```powershell
pio --version
```

Nếu PowerShell báo `pio` không được nhận diện, thêm thư mục chứa PlatformIO vào
`PATH` của terminal hiện tại rồi kiểm tra lại:

```powershell
$env:Path += ";$env:USERPROFILE\.platformio\penv\Scripts"
pio --version
```

Thay đổi `PATH` trên chỉ có hiệu lực trong terminal hiện tại. Có thể gọi trực tiếp
`& "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe"` nếu không muốn thay đổi
`PATH`.

`platformio.ini` sử dụng:

- Platform: `espressif32`
- Framework: Arduino
- Environment: `yolo_uno`
- Monitor/upload speed: `115200`
- Các thư viện: ArduinoJson, ESP32Servo, DHT20 và LiquidCrystal_I2C

PlatformIO sẽ tự tải các thư viện được khai báo trong lần build đầu tiên.

## 4. Cấu hình Wi-Fi và backend

Từ thư mục `hardware`, tạo file cấu hình local:

```powershell
Copy-Item .\include\secrets.example.h .\include\secrets.h
```

Mở `include/secrets.h` và thay các giá trị:

```cpp
#pragma once

constexpr char WIFI_SSID[] = "TEN_WIFI";
constexpr char WIFI_PASSWORD[] = "MAT_KHAU_WIFI";
constexpr char API_BASE_URL[] = "http://ALB_DNS_NAME";
constexpr char DEVICE_ID[] = "room_01";
```

Ý nghĩa:

| Biến | Mô tả | Ví dụ |
|---|---|---|
| `WIFI_SSID` | Tên Wi-Fi mà board sẽ kết nối | `"MyWifi"` |
| `WIFI_PASSWORD` | Mật khẩu Wi-Fi | `"secret"` |
| `API_BASE_URL` | URL gốc của ALB, không bắt buộc dấu `/` cuối | `"http://my-alb.ap-southeast-1.elb.amazonaws.com"` |
| `DEVICE_ID` | ID thiết bị, phải khớp với backend/dashboard | `"room_01"` |

Lưu ý:

- `include/secrets.h` đã được `.gitignore` bỏ qua; không commit thông tin thật.
- `API_BASE_URL` phải truy cập được từ mạng của board. Không dùng
  `localhost`/`127.0.0.1` trừ khi backend thật sự chạy ngay trên board.
- Không thêm `/api`; firmware tự nối path của từng API endpoint.
- Firmware hiện dùng `HTTPClient` với URL HTTP. Nếu backend chỉ cho phép HTTPS,
  cần bổ sung cấu hình TLS trong firmware.
- Dấu `/` ở cuối `API_BASE_URL`, nếu có, sẽ được firmware tự loại bỏ.

## 5. Build, nạp và xem log

Chạy các lệnh sau trong thư mục `hardware`:

```powershell
pio run -e yolo_uno
pio run -e yolo_uno --target upload
pio device monitor --baud 115200
```

Nếu máy có nhiều cổng serial, chỉ định cổng:

```powershell
pio run -e yolo_uno --target upload --upload-port COM5
pio device monitor --port COM5 --baud 115200
```

Khi khởi động thành công, Serial Monitor sẽ hiển thị trạng thái LCD, DHT20,
Auto/Manual, command ACK, Wi-Fi, địa chỉ IP và RSSI.

## 6. Luồng hoạt động

Sau khi boot, firmware thực hiện theo thứ tự:

1. Đặt quạt và đèn về OFF, đưa rèm về góc đóng `0°`.
2. Khởi tạo servo, I2C, LCD và DHT20.
3. Đọc chế độ cùng trạng thái ACK đã lưu trong bộ nhớ Preferences.
4. Kết nối Wi-Fi.
5. Bắt đầu đọc cảm biến, điều khiển Auto, nhận lệnh và gửi telemetry.

Chu kỳ mặc định:

| Tác vụ | Chu kỳ |
|---|---:|
| Đọc cảm biến, điều khiển Auto và cập nhật LCD | 2 giây |
| Hỏi backend để lấy command mới | 2 giây |
| Gửi telemetry | 5 giây |
| Thử kết nối lại Wi-Fi khi mất mạng | 10 giây |
| Timeout cho một lần kết nối Wi-Fi | 20 giây |
| Timeout HTTP | 7 giây |

### Đọc cảm biến

- Ánh sáng là giá trị ADC thô, trung bình của 10 mẫu, không phải đơn vị lux.
- DHT20 được kiểm tra tại địa chỉ I2C `0x38`.
- Nếu một lần đọc DHT20 lỗi, firmware giữ lại giá trị hợp lệ gần nhất.
- Trước khi DHT20 có ít nhất một kết quả hợp lệ, firmware không gửi telemetry
  và không thực hiện điều khiển Auto.

### Hiển thị LCD

LCD tự dò lần lượt các địa chỉ `0x21`, `0x27`, `0x3F`. Không tìm thấy LCD sẽ
không làm dừng các chức năng còn lại.

```text
T:30.5C H:72%
L:1050 C:OFF
```

- `T`: nhiệt độ theo °C.
- `H`: độ ẩm theo %.
- `L`: giá trị ADC của cảm biến ánh sáng.
- `C:ON`: rèm đang ở góc mở từ `90°`; `C:OFF`: rèm chưa ở góc mở.

## 7. Chế độ điều khiển

### Auto

Firmware mặc định chạy Auto ở lần khởi động đầu tiên. Các ngưỡng trong
`applyAutomaticControl()`:

| Thiết bị | Điều kiện ON/mở | Điều kiện OFF/đóng |
|---|---|---|
| Quạt | Nhiệt độ `>= 30°C` | Nhiệt độ `< 30°C` |
| Đèn | Ánh sáng `< 350` | Ánh sáng `>= 350` |
| Rèm | Ánh sáng `< 700` → mở `90°` | Ánh sáng `>= 700` → đóng `0°` |

Các ngưỡng không có hysteresis, nên thiết bị có thể đổi trạng thái liên tục khi
giá trị cảm biến dao động sát ngưỡng.

### Manual

Các lệnh điều khiển trực tiếp quạt, đèn hoặc rèm tự chuyển firmware sang Manual.
Ở Manual, cảm biến và telemetry vẫn hoạt động nhưng firmware không tự thay đổi
thiết bị chấp hành.

Chế độ Auto/Manual được lưu trong Preferences và được phục hồi sau khi reboot.
Trạng thái quạt, đèn và góc rèm không được lưu: khi boot, quạt và đèn luôn OFF,
rèm luôn về `0°`, sau đó Auto có thể cập nhật lại ở chu kỳ đọc cảm biến.

### Góc rèm

```cpp
constexpr int CURTAIN_CLOSE_ANGLE = 0;
constexpr int CURTAIN_OPEN_ANGLE = 90;
```

Điều chỉnh hai hằng số này trong `src/main.cpp` theo cơ cấu thực tế. Đảm bảo góc
không làm servo bị kẹt hoặc kéo quá hành trình của rèm.

## 8. Command hỗ trợ

| Command | Tác dụng | Chế độ sau lệnh |
|---|---|---|
| `MODE_AUTO` | Bật Auto và áp dụng ngay nếu đã có dữ liệu DHT20 hợp lệ | Auto |
| `MODE_MANUAL` | Tắt điều khiển tự động | Manual |
| `FAN_ON` | Bật quạt | Manual |
| `FAN_OFF` | Tắt quạt | Manual |
| `LIGHT_ON` | Bật đèn | Manual |
| `LIGHT_OFF` | Tắt đèn | Manual |
| `CURTAIN_OPEN` | Mở rèm đến `90°` | Manual |
| `CURTAIN_CLOSE` | Đóng rèm về `0°` | Manual |

Firmware bỏ khoảng trắng đầu/cuối và không phân biệt chữ hoa/chữ thường. Command
không hỗ trợ sẽ không được thực thi và không được ACK.

## 9. Giao tiếp FastAPI

Firmware sử dụng ba endpoint:

| Method | Endpoint | Chu kỳ/mục đích |
|---|---|---|
| `POST` | `/api/telemetry` | Gửi dữ liệu mỗi 5 giây |
| `GET` | `/api/devices/{device_id}/commands/latest` | Lấy command mỗi 2 giây |
| `POST` | `/api/devices/{device_id}/commands/{command_id}/ack` | Xác nhận đã thực thi |

Mọi mã HTTP từ `200` đến `299` được xem là thành công.

### Telemetry gửi lên backend

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

Trong đó:

- `lightIntensity` là ADC thô.
- `curtain` là `true` khi góc servo lớn hơn hoặc bằng góc mở `90°`.
- Telemetry chỉ được gửi khi Wi-Fi đang kết nối và DHT20 đã có nhiệt độ, độ ẩm
  hợp lệ.

### JSON command firmware chấp nhận

Schema backend hiện tại:

```json
{
  "status": "success",
  "command": "FAN_ON",
  "command_id": 12,
  "command_state": "Pending"
}
```

Để tương thích với schema rút gọn, firmware cũng chấp nhận `id` thay cho
`command_id` và `state` thay cho `command_state`. Nếu response có `device_id`,
giá trị đó phải khớp `DEVICE_ID`. Nếu có state, state phải là `Pending`.

Backend có thể trả `204`, `404`, body rỗng, `null` hoặc `{}` khi không có command;
firmware sẽ tiếp tục polling ở chu kỳ sau.

### Thực thi và ACK

Sau khi thực thi command hợp lệ, board gọi:

```http
POST /api/devices/room_01/commands/12/ack
Content-Type: application/json

{}
```

Firmware lưu `lastAckedCommandId` và `pendingAckCommandId` trong Preferences để
hạn chế thực thi lặp khi mất mạng hoặc reboot:

- Command có ID không lớn hơn ID đã ACK sẽ bị bỏ qua.
- Nếu thực thi xong nhưng ACK lỗi, firmware ưu tiên thử ACK lại và chưa nhận
  command tiếp theo.
- Pending ACK được phục hồi sau reboot.

Vì firmware so sánh ID theo thứ tự tăng dần, backend cần cấp `command_id` tăng
dần cho các command mà board này nhận.

## 10. Xử lý sự cố

### Không build được

- Chạy lệnh tại đúng thư mục `hardware`.
- Kiểm tra PlatformIO đã nhận environment bằng `pio run -e yolo_uno`.
- Kiểm tra `include/secrets.h` đã tồn tại và không có lỗi cú pháp.
- Đảm bảo máy có Internet trong lần đầu để PlatformIO tải platform và thư viện.

Nếu PowerShell báo `pio: The term 'pio' is not recognized`, thêm PlatformIO vào
`PATH` của terminal hiện tại:

```powershell
$env:Path += ";$env:USERPROFILE\.platformio\penv\Scripts"
pio run -e yolo_uno
```

Nếu gặp `HomeDirPermissionsError`, terminal hiện tại không có quyền ghi vào thư
mục dữ liệu mặc định của PlatformIO. Chuyển dữ liệu PlatformIO sang thư mục
`.pio` của project (thư mục này đã được `.gitignore` bỏ qua), rồi build lại:

```powershell
$env:PLATFORMIO_CORE_DIR = Join-Path $PWD ".pio"
pio run -e yolo_uno
```

Nếu `pio` vẫn chưa có trong `PATH`, dùng đầy đủ đường dẫn:

```powershell
$env:PLATFORMIO_CORE_DIR = Join-Path $PWD ".pio"
& "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe" run -e yolo_uno
```

Hai biến môi trường trên chỉ áp dụng cho terminal hiện tại.

### Không upload được

- Kiểm tra đúng cáp USB có truyền dữ liệu.
- Xác định đúng COM port bằng `pio device list`.
- Thử giữ nút BOOT khi bắt đầu upload nếu board không tự vào chế độ nạp.
- Đóng Serial Monitor hoặc chương trình khác đang chiếm COM port.

### Wi-Fi không kết nối

- Kiểm tra `WIFI_SSID` và `WIFI_PASSWORD`.
- Đảm bảo Wi-Fi tương thích với ESP32-S3 và tín hiệu đủ mạnh.
- Xem log `[WiFi] Connection timeout`; firmware sẽ tự thử lại mỗi 10 giây.

### Board kết nối Wi-Fi nhưng không gửi được dữ liệu

- Kiểm tra `API_BASE_URL` từ một thiết bị khác trong cùng mạng.
- Xác nhận ALB listener có thể truy cập được và target group đang healthy.
- Xác nhận Security Group của backend cho phép port `8000` từ Security Group
  của ALB.
- Nếu log báo `DHT20 has no valid data yet`, kiểm tra dây DHT20 và địa chỉ
  `0x38`; firmware chưa gửi telemetry khi chưa có dữ liệu DHT hợp lệ.

### LCD không hiển thị

- Xem log `[LCD] Device 0x21/0x27/0x3F not found`.
- Kiểm tra SDA `GPIO11`, SCL `GPIO12`, nguồn và GND chung.
- Chỉnh biến trở tương phản trên module LCD.
- Nếu LCD dùng địa chỉ khác, thêm địa chỉ đó trong `initializeLcd()`.

### Cảm biến hoặc thiết bị hoạt động ngược

- Giá trị ánh sáng phụ thuộc loại cảm biến; quan sát log `[SENSOR]` để hiệu chỉnh
  các ngưỡng `350` và `700`.
- Nếu relay active LOW, cần đảo logic trong `setLight()`.
- Nếu quạt dùng module khác, kiểm tra lại logic hai chân trong `setFan()`.
- Nếu rèm mở/đóng ngược, đổi góc mở và đóng hoặc đảo cơ cấu servo.

## 11. Lưu ý an toàn

- Không cấp tải công suất lớn trực tiếp từ GPIO.
- Dùng relay/MOSFET/driver và diode bảo vệ phù hợp cho quạt hoặc tải cảm.
- Kiểm tra điện áp của LCD, servo, cảm biến và mức logic trước khi nối.
- Nguồn rời cho servo/quạt phải nối chung GND với YOLO UNO.
- Thử servo khi chưa gắn tải để xác định hành trình an toàn trước.
