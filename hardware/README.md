# YOLO UNO Firmware

[Tiếng Việt](README.vi.md)

Firmware for the hardware device in the **AWS IoT Monitoring and Control
Dashboard** project. The YOLO UNO reads sensors, controls actuators
automatically, and communicates over HTTP with the FastAPI backend through the
Application Load Balancer.

The current firmware uses:

- A DHT20 temperature and humidity sensor.
- An analog light sensor.
- A two-pin fan controller.
- An LED or relay.
- A curtain servo.
- An I2C LCD 1602.
- Wi-Fi for telemetry, commands, and execution acknowledgements.

> The firmware does not connect to AWS IoT Core and does not use MQTT. The
> project name refers to the AWS-hosted system; the board calls the backend ALB
> directly over HTTP.

## 1. Directory structure

```text
hardware/
├── boards/
│   └── yolo_uno.json         # Custom ESP32-S3 board definition
├── include/
│   ├── secrets.example.h     # Configuration template
│   └── secrets.h             # Local configuration; never commit
├── src/
│   └── main.cpp              # Firmware source
├── .gitignore
├── platformio.ini
├── README.md
└── README.vi.md
```

## 2. Hardware and pin connections

### Pin table

| Device | YOLO UNO port | Firmware pin | Notes |
|---|---|---:|---|
| Light sensor | Grove `A1-A0` | A0 / `GPIO1` | ADC reading averaged over 10 samples |
| Fan | Grove `D8-D7` | D8 / `GPIO17` and D7 / `GPIO10` | Fan runs when `GPIO17 = LOW`, `GPIO10 = HIGH` |
| LED/relay | Grove `D4-D3` | D3 / `GPIO6` | Active HIGH |
| Curtain servo | Grove `D6-D5` | D5 / `GPIO38` | 50 Hz PWM, 500–2400 µs pulse |
| DHT20 | One I2C port | SDA / `GPIO11`, SCL / `GPIO12` | Address `0x38` |
| I2C LCD 1602 | One I2C port | SDA / `GPIO11`, SCL / `GPIO12` | Probes `0x21`, `0x27`, `0x3F` |

> The servo pin in `src/main.cpp` is `GPIO38`. If the hardware follows an older
> wiring diagram with another pin, rewire it or update `PIN_SERVO` before
> uploading.

### I2C bus wiring

| DHT20/LCD | YOLO UNO |
|---|---|
| GND | GND |
| VCC | 3V3 |
| SDA | GPIO11 |
| SCL | GPIO12 |

The DHT20 and LCD share a 100 kHz I2C bus, so SDA, SCL, 3V3, and GND can be
wired in parallel. The YOLO UNO I2C ports also share these pins.

If the LCD module is stable only at 5V, use a bidirectional I2C logic-level
converter. Do not connect a module's 5V pull-up resistors directly to ESP32-S3
GPIO pins. Use a suitable power supply for the servo and fan, and always share
GND with the board.

## 3. Environment setup

Install either:

- [Visual Studio Code](https://code.visualstudio.com/) with the PlatformIO IDE
  extension; or
- PlatformIO Core with the `pio` command available in the terminal.

Check PlatformIO Core:

```powershell
pio --version
```

If PowerShell does not recognize `pio`, add PlatformIO to the current
terminal's `PATH` and check again:

```powershell
$env:Path += ";$env:USERPROFILE\.platformio\penv\Scripts"
pio --version
```

This `PATH` change applies only to the current terminal. You can instead invoke
`& "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe"` directly.

`platformio.ini` defines:

- Platform: `espressif32`
- Framework: Arduino
- Environment: `yolo_uno`
- Monitor/upload speed: `115200`
- Libraries: ArduinoJson, ESP32Servo, DHT20, and LiquidCrystal_I2C

PlatformIO downloads the declared libraries during the first build.

## 4. Configure Wi-Fi and the backend

From the `hardware` directory, create the local configuration:

```powershell
Copy-Item .\include\secrets.example.h .\include\secrets.h
```

Open `include/secrets.h` and replace the values:

```cpp
#pragma once

constexpr char WIFI_SSID[] = "WIFI_NAME";
constexpr char WIFI_PASSWORD[] = "WIFI_PASSWORD";
constexpr char API_BASE_URL[] = "http://ALB_DNS_NAME";
constexpr char DEVICE_ID[] = "room_01";
```

Configuration fields:

| Variable | Description | Example |
|---|---|---|
| `WIFI_SSID` | Wi-Fi network used by the board | `"MyWifi"` |
| `WIFI_PASSWORD` | Wi-Fi password | `"secret"` |
| `API_BASE_URL` | ALB base URL; trailing `/` is optional | `"http://my-alb.ap-southeast-1.elb.amazonaws.com"` |
| `DEVICE_ID` | Device ID; must match the backend/dashboard | `"room_01"` |

Notes:

- `include/secrets.h` is excluded by `.gitignore`; never commit real values.
- `API_BASE_URL` must be reachable from the board's network. Do not use
  `localhost` or `127.0.0.1` unless the backend actually runs on the board.
- Do not append `/api`; the firmware adds each API endpoint path.
- The firmware currently uses `HTTPClient` with HTTP URLs. Add TLS
  configuration to the firmware if the backend only accepts HTTPS.
- The firmware removes a trailing `/` from `API_BASE_URL`.

## 5. Build, upload, and monitor

Run these commands from the `hardware` directory:

```powershell
pio run -e yolo_uno
pio run -e yolo_uno --target upload
pio device monitor --baud 115200
```

Specify the serial port when the computer has multiple ports:

```powershell
pio run -e yolo_uno --target upload --upload-port COM5
pio device monitor --port COM5 --baud 115200
```

After a successful boot, Serial Monitor reports LCD, DHT20, Auto/Manual,
command ACK, Wi-Fi, IP address, and RSSI status.

## 6. Runtime flow

After boot, the firmware:

1. Turns the fan and light OFF and moves the curtain to the closed `0°` angle.
2. Initializes the servo, I2C, LCD, and DHT20.
3. Restores the control mode and saved ACK state from Preferences.
4. Connects to Wi-Fi.
5. Starts sensor reads, automatic control, command polling, and telemetry.

Default intervals:

| Task | Interval |
|---|---:|
| Read sensors, apply Auto control, and update the LCD | 2 seconds |
| Poll the backend for a new command | 2 seconds |
| Send telemetry | 5 seconds |
| Retry Wi-Fi after disconnection | 10 seconds |
| Wi-Fi connection attempt timeout | 20 seconds |
| HTTP timeout | 7 seconds |

### Sensor readings

- Light intensity is a raw ADC value averaged over 10 samples, not lux.
- The DHT20 is checked at I2C address `0x38`.
- If a DHT20 read fails, the firmware retains the latest valid value.
- Until the DHT20 produces at least one valid reading, the firmware neither
  sends telemetry nor applies Auto control.

### LCD display

The firmware probes LCD addresses `0x21`, `0x27`, and `0x3F`. A missing LCD
does not stop other functions.

```text
T:30.5C H:72%
L:1050 C:OFF
```

- `T`: temperature in °C.
- `H`: humidity in percent.
- `L`: raw light-sensor ADC value.
- `C:ON`: curtain is at or above the `90°` open angle; `C:OFF`: it is below
  that angle.

## 7. Control modes

### Auto

The firmware defaults to Auto on its first boot. Thresholds in
`applyAutomaticControl()`:

| Device | ON/open condition | OFF/closed condition |
|---|---|---|
| Fan | Temperature `>= 30°C` | Temperature `< 30°C` |
| Light | Light value `< 350` | Light value `>= 350` |
| Curtain | Light value `< 700` → open to `90°` | Light value `>= 700` → close to `0°` |

The thresholds do not use hysteresis, so an actuator can toggle repeatedly when
a sensor value fluctuates around a threshold.

### Manual

Direct fan, light, or curtain commands switch the firmware to Manual. Sensor
reads and telemetry continue, but the firmware stops changing actuators
automatically.

The firmware stores the Auto/Manual mode in Preferences and restores it after a
reboot. It does not store fan, light, or curtain-angle state: at boot, the fan
and light are OFF and the curtain returns to `0°`; Auto may update them during
the next sensor cycle.

### Curtain angles

```cpp
constexpr int CURTAIN_CLOSE_ANGLE = 0;
constexpr int CURTAIN_OPEN_ANGLE = 90;
```

Adjust these constants in `src/main.cpp` for the physical mechanism. Ensure the
angles cannot stall the servo or pull the curtain beyond its travel.

## 8. Supported commands

| Command | Effect | Mode after command |
|---|---|---|
| `MODE_AUTO` | Enable Auto and apply it immediately when valid DHT20 data exists | Auto |
| `MODE_MANUAL` | Disable automatic control | Manual |
| `FAN_ON` | Turn the fan on | Manual |
| `FAN_OFF` | Turn the fan off | Manual |
| `LIGHT_ON` | Turn the light on | Manual |
| `LIGHT_OFF` | Turn the light off | Manual |
| `CURTAIN_OPEN` | Open the curtain to `90°` | Manual |
| `CURTAIN_CLOSE` | Close the curtain to `0°` | Manual |

The firmware trims surrounding whitespace and matches commands without regard
to letter case. It neither executes nor acknowledges unsupported commands.

## 9. FastAPI communication

The firmware uses three endpoints:

| Method | Endpoint | Interval/purpose |
|---|---|---|
| `POST` | `/api/telemetry` | Send data every 5 seconds |
| `GET` | `/api/devices/{device_id}/commands/latest` | Poll every 2 seconds |
| `POST` | `/api/devices/{device_id}/commands/{command_id}/ack` | Acknowledge execution |

Any HTTP status from `200` through `299` is considered successful.

### Telemetry payload

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

Where:

- `lightIntensity` is a raw ADC value.
- `curtain` is `true` when the servo angle is at or above the `90°` open angle.
- Telemetry is sent only while Wi-Fi is connected and valid DHT20 temperature
  and humidity data is available.

### Accepted command JSON

Current backend schema:

```json
{
  "status": "success",
  "command": "FAN_ON",
  "command_id": 12,
  "command_state": "Pending"
}
```

For compatibility with a shorter schema, the firmware also accepts `id`
instead of `command_id` and `state` instead of `command_state`. If the response
contains `device_id`, it must match `DEVICE_ID`. If a state is present, it must
be `Pending`.

When no command exists, the backend may return `204`, `404`, an empty body,
`null`, or `{}`. The firmware continues polling on the next interval.

### Execute and acknowledge

After executing a valid command, the board calls:

```http
POST /api/devices/room_01/commands/12/ack
Content-Type: application/json

{}
```

The firmware stores `lastAckedCommandId` and `pendingAckCommandId` in
Preferences to reduce duplicate execution after network loss or reboot:

- A command whose ID is not greater than the acknowledged ID is ignored.
- If execution succeeds but the ACK fails, the firmware retries the ACK before
  accepting another command.
- A pending ACK is restored after reboot.

Because the firmware compares IDs in increasing order, the backend must assign
increasing `command_id` values to commands received by this board.

## 10. Troubleshooting

### Build failure

- Run the command from the `hardware` directory.
- Confirm that PlatformIO recognizes the environment with
  `pio run -e yolo_uno`.
- Check that `include/secrets.h` exists and has valid syntax.
- Ensure Internet access is available during the first platform and library
  download.

If PowerShell reports `pio: The term 'pio' is not recognized`, add PlatformIO
to the current terminal's `PATH`:

```powershell
$env:Path += ";$env:USERPROFILE\.platformio\penv\Scripts"
pio run -e yolo_uno
```

If `HomeDirPermissionsError` occurs, the terminal cannot write to PlatformIO's
default data directory. Store PlatformIO data in the project's `.pio`
directory, which `.gitignore` already excludes:

```powershell
$env:PLATFORMIO_CORE_DIR = Join-Path $PWD ".pio"
pio run -e yolo_uno
```

If `pio` is still absent from `PATH`, use its full path:

```powershell
$env:PLATFORMIO_CORE_DIR = Join-Path $PWD ".pio"
& "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe" run -e yolo_uno
```

These environment variables apply only to the current terminal.

### Upload failure

- Use a USB cable that supports data.
- Find the correct port with `pio device list`.
- Hold the BOOT button when upload begins if the board does not enter upload
  mode automatically.
- Close Serial Monitor or any program using the same serial port.

### Wi-Fi connection failure

- Check `WIFI_SSID` and `WIFI_PASSWORD`.
- Ensure the Wi-Fi network is compatible with the ESP32-S3 and has adequate
  signal strength.
- Look for `[WiFi] Connection timeout`; the firmware retries every 10 seconds.

### Wi-Fi connects but telemetry fails

- Test `API_BASE_URL` from another device on the same network.
- Confirm that the ALB listener is reachable and its target group is healthy.
- Confirm that the backend Security Group allows port `8000` from the ALB
  Security Group.
- If the log says `DHT20 has no valid data yet`, check DHT20 wiring and address
  `0x38`; telemetry is withheld until valid DHT data exists.

### LCD is blank

- Look for `[LCD] Device 0x21/0x27/0x3F not found`.
- Check SDA `GPIO11`, SCL `GPIO12`, power, and shared GND.
- Adjust the contrast potentiometer on the LCD module.
- Add another address to `initializeLcd()` if the LCD uses one.

### Sensor or actuator logic is reversed

- Light values depend on the sensor type. Use `[SENSOR]` logs to tune the `350`
  and `700` thresholds.
- Invert the logic in `setLight()` for an active-LOW relay.
- Check both control-pin levels in `setFan()` when using another fan module.
- Swap the open/closed angles or reverse the servo mechanism when curtain
  direction is incorrect.

## 11. Safety notes

- Do not drive high-power loads directly from GPIO pins.
- Use an appropriate relay, MOSFET, driver, and flyback diode for fans or
  inductive loads.
- Check LCD, servo, and sensor voltages and logic levels before wiring.
- External servo or fan power must share GND with the YOLO UNO.
- Test the servo without a load to establish safe travel limits first.
