#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <DHT20.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>

#include "secrets.h"

// ============================================================
// AWS IOT MONITORING AND CONTROL DASHBOARD - YOLO UNO
// ============================================================
// Phần cứng được sử dụng:
//   - Quạt
//   - Đèn LED
//   - Servo rèm
//   - Cảm biến ánh sáng analog
//   - Cảm biến nhiệt độ, độ ẩm DHT20
//   - Màn hình LCD 1602 I2C
//
// YOLO UNO giao tiếp trực tiếp với FastAPI backend trên EC2:
//   POST /api/telemetry
//   GET  /api/devices/{device_id}/commands/latest
//   POST /api/devices/{device_id}/commands/{command_id}/ack
//
// Chỉ giữ các thành phần phần cứng được liệt kê phía trên.
// ============================================================

// =====================
// PIN MAPPING ĐÃ TEST
// =====================
// Grove A1-A0: dùng kênh A0 / GPIO1 cho cảm biến ánh sáng.
#define LIGHT_SENSOR_PIN 1

// Cả bốn cổng I2C1-I2C4 đều dùng chung hai chân này.
#define I2C_SDA 11
#define I2C_SCL 12

// Grove D8-D7: mô-đun quạt dùng cả hai tín hiệu.
// Theo kết quả test: GPIO10 HIGH và GPIO17 LOW thì quạt chạy.
#define PIN_FAN 10
#define PIN_FAN_CONTROL 17

// Grove D4-D3: LED dùng tín hiệu D3 / GPIO6, HIGH thì sáng.
#define PIN_LIGHT 6

// Grove D6-D5: servo rèm dùng tín hiệu D5 / GPIO38.
#define PIN_SERVO 38

// =====================
// DEVICE CONFIG
// =====================
constexpr int CURTAIN_CLOSE_ANGLE = 0;
constexpr int CURTAIN_OPEN_ANGLE = 90;

constexpr unsigned long TELEMETRY_INTERVAL_MS = 5000;
constexpr unsigned long COMMAND_POLL_INTERVAL_MS = 2000;
constexpr unsigned long LCD_UPDATE_INTERVAL_MS = 2000;
constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr uint16_t HTTP_TIMEOUT_MS = 7000;

constexpr uint8_t LCD_COLUMNS = 16;
constexpr uint8_t LCD_ROWS = 2;
constexpr uint8_t LCD_ADDRESS_OHSTEM = 0x21;
constexpr uint8_t LCD_ADDRESS_COMMON = 0x27;
constexpr uint8_t LCD_ADDRESS_ALTERNATE = 0x3F;

// =====================
// GLOBAL OBJECTS
// =====================
Servo curtainServo;
DHT20 dht20;
Preferences preferences;
LiquidCrystal_I2C lcd21(LCD_ADDRESS_OHSTEM, LCD_COLUMNS, LCD_ROWS);
LiquidCrystal_I2C lcd27(LCD_ADDRESS_COMMON, LCD_COLUMNS, LCD_ROWS);
LiquidCrystal_I2C lcd3F(LCD_ADDRESS_ALTERNATE, LCD_COLUMNS, LCD_ROWS);
LiquidCrystal_I2C* lcd = nullptr;

bool dhtReady = false;
bool lcdReady = false;
bool fanState = false;
bool lightState = false;
int curtainAngle = CURTAIN_CLOSE_ANGLE;

float latestTemperature = NAN;
float latestHumidity = NAN;
int latestLightValue = 0;

unsigned long lastTelemetryMs = 0;
unsigned long lastCommandPollMs = 0;
unsigned long lastLcdUpdateMs = 0;
unsigned long lastWiFiAttemptMs = 0;

// Lưu command ID để tránh thực thi lặp khi ACK lỗi hoặc board khởi động lại.
int32_t lastAckedCommandId = -1;
int32_t pendingAckCommandId = -1;

// =====================
// URL HELPERS
// =====================
String getBaseUrl() {
    String url = API_BASE_URL;

    while (url.endsWith("/")) {
        url.remove(url.length() - 1);
    }

    return url;
}

String getTelemetryUrl() {
    return getBaseUrl() + "/api/telemetry";
}

String getLatestCommandUrl() {
    return getBaseUrl() + "/api/devices/" + String(DEVICE_ID) +
           "/commands/latest";
}

String getCommandAckUrl(int32_t commandId) {
    return getBaseUrl() + "/api/devices/" + String(DEVICE_ID) +
           "/commands/" + String(commandId) + "/ack";
}

// =====================
// SENSOR INITIALIZATION
// =====================
void initializeDHT20() {
    dhtReady = false;

    Wire.beginTransmission(0x38);
    const uint8_t error = Wire.endTransmission();

    if (error != 0) {
        Serial.println("[DHT20] Device 0x38 not found");
        return;
    }

    dht20.begin();
    dhtReady = true;
    Serial.println("[DHT20] Initialized");
}

bool isI2cDevicePresent(uint8_t address) {
    Wire.beginTransmission(address);
    return Wire.endTransmission() == 0;
}

void printLcdLine(uint8_t row, const char* text) {
    if (!lcdReady || lcd == nullptr) {
        return;
    }

    lcd->setCursor(0, row);

    uint8_t column = 0;
    while (text[column] != '\0' && column < LCD_COLUMNS) {
        lcd->print(text[column]);
        column++;
    }

    while (column < LCD_COLUMNS) {
        lcd->print(' ');
        column++;
    }
}

void initializeLcd() {
    uint8_t address = 0;

    if (isI2cDevicePresent(LCD_ADDRESS_OHSTEM)) {
        address = LCD_ADDRESS_OHSTEM;
        lcd = &lcd21;
    } else if (isI2cDevicePresent(LCD_ADDRESS_COMMON)) {
        address = LCD_ADDRESS_COMMON;
        lcd = &lcd27;
    } else if (isI2cDevicePresent(LCD_ADDRESS_ALTERNATE)) {
        address = LCD_ADDRESS_ALTERNATE;
        lcd = &lcd3F;
    } else {
        Serial.println("[LCD] Device 0x21/0x27/0x3F not found");
        return;
    }

    lcd->init();
    lcd->backlight();
    lcd->clear();
    lcdReady = true;

    printLcdLine(0, "YOLO UNO");
    printLcdLine(1, "Starting...");

    Serial.print("[LCD] Initialized at 0x");
    Serial.println(address, HEX);
}

// =====================
// SENSOR READS
// =====================
int readLightSensor() {
    constexpr int SAMPLE_COUNT = 10;
    int sum = 0;

    for (int i = 0; i < SAMPLE_COUNT; i++) {
        sum += analogRead(LIGHT_SENSOR_PIN);
        delay(5);
    }

    return sum / SAMPLE_COUNT;
}

bool readDHT20(float& temperature, float& humidity) {
    if (!dhtReady) {
        return false;
    }

    const int status = dht20.read();

    if (status != DHT20_OK) {
        Serial.print("[DHT20] Read error: ");
        Serial.println(status);
        return false;
    }

    const float newTemperature = dht20.getTemperature();
    const float newHumidity = dht20.getHumidity();

    if (isnan(newTemperature) || isnan(newHumidity)) {
        Serial.println("[DHT20] Invalid temperature or humidity");
        return false;
    }

    temperature = newTemperature;
    humidity = newHumidity;
    return true;
}

bool refreshSensors() {
    latestLightValue = readLightSensor();

    float temperature = NAN;
    float humidity = NAN;
    const bool dhtReadOk = readDHT20(temperature, humidity);

    if (dhtReadOk) {
        latestTemperature = temperature;
        latestHumidity = humidity;
    }

    Serial.print("[SENSOR] temperature=");
    if (isnan(latestTemperature)) {
        Serial.print("N/A");
    } else {
        Serial.print(latestTemperature, 1);
    }

    Serial.print(" humidity=");
    if (isnan(latestHumidity)) {
        Serial.print("N/A");
    } else {
        Serial.print(latestHumidity, 1);
    }

    Serial.print(" lightIntensity=");
    Serial.println(latestLightValue);

    return !isnan(latestTemperature) && !isnan(latestHumidity);
}

void updateLcd() {
    if (!lcdReady) {
        return;
    }

    char firstLine[LCD_COLUMNS + 1];
    char secondLine[LCD_COLUMNS + 1];

    if (isnan(latestTemperature) || isnan(latestHumidity)) {
        snprintf(firstLine, sizeof(firstLine), "T:--.-C H:--.-%%");
    } else {
        snprintf(
            firstLine,
            sizeof(firstLine),
            "T:%4.1fC H:%2.0f%%",
            latestTemperature,
            latestHumidity
        );
    }

    snprintf(
        secondLine,
        sizeof(secondLine),
        "L:%4d C:%s",
        latestLightValue,
        curtainAngle >= CURTAIN_OPEN_ANGLE ? "ON" : "OFF"
    );

    printLcdLine(0, firstLine);
    printLcdLine(1, secondLine);
}

// =====================
// ACTUATORS
// =====================
void setFan(bool on) {
    fanState = on;

    digitalWrite(PIN_FAN_CONTROL, LOW);
    digitalWrite(PIN_FAN, on ? HIGH : LOW);

    Serial.print("[FAN] ");
    Serial.println(on ? "ON" : "OFF");
}

void setLight(bool on) {
    lightState = on;
    digitalWrite(PIN_LIGHT, on ? HIGH : LOW);

    Serial.print("[LIGHT] ");
    Serial.println(on ? "ON" : "OFF");
}

void setCurtain(int angle) {
    curtainAngle = constrain(angle, 0, 180);
    curtainServo.write(curtainAngle);

    Serial.print("[CURTAIN] angle=");
    Serial.println(curtainAngle);
}

bool executeCommand(String command) {
    command.trim();
    command.toUpperCase();

    Serial.print("[COMMAND] Execute: ");
    Serial.println(command);

    if (command == "FAN_ON") {
        setFan(true);
        return true;
    }

    if (command == "FAN_OFF") {
        setFan(false);
        return true;
    }

    if (command == "LIGHT_ON") {
        setLight(true);
        return true;
    }

    if (command == "LIGHT_OFF") {
        setLight(false);
        return true;
    }

    if (command == "CURTAIN_OPEN") {
        setCurtain(CURTAIN_OPEN_ANGLE);
        return true;
    }

    if (command == "CURTAIN_CLOSE") {
        setCurtain(CURTAIN_CLOSE_ANGLE);
        return true;
    }

    Serial.println("[COMMAND] Unsupported command; ACK not sent");
    return false;
}

// =====================
// WIFI
// =====================
bool connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    lastWiFiAttemptMs = millis();

    Serial.println();
    Serial.print("[WiFi] Connecting to ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(false);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    const unsigned long startedAt = millis();

    while (WiFi.status() != WL_CONNECTED &&
           millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
        delay(500);
        Serial.print(".");
    }

    Serial.println();

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WiFi] Connection timeout");
        return false;
    }

    Serial.println("[WiFi] Connected");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");

    return true;
}

void maintainWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        return;
    }

    const unsigned long now = millis();

    if (now - lastWiFiAttemptMs >= WIFI_RETRY_INTERVAL_MS) {
        connectWiFi();
    }
}

// =====================
// HTTP HELPERS
// =====================
void configureHttp(HTTPClient& http, const String& url) {
    http.setConnectTimeout(HTTP_TIMEOUT_MS);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(url);
    http.addHeader("Accept", "application/json");
}

bool isHttpSuccess(int code) {
    return code >= 200 && code < 300;
}

// =====================
// TELEMETRY -> FASTAPI
// =====================
bool sendTelemetry() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[TELEMETRY] Skipped: WiFi disconnected");
        return false;
    }

    if (isnan(latestTemperature) || isnan(latestHumidity)) {
        Serial.println("[TELEMETRY] Skipped: DHT20 has no valid data yet");
        return false;
    }

    JsonDocument doc;
    doc["deviceId"] = DEVICE_ID;
    doc["temperature"] = latestTemperature;
    doc["humidity"] = latestHumidity;
    doc["lightIntensity"] = latestLightValue;
    doc["fan"] = fanState;
    doc["light"] = lightState;
    doc["curtain"] = curtainAngle >= CURTAIN_OPEN_ANGLE;

    String payload;
    serializeJson(doc, payload);

    HTTPClient http;
    const String url = getTelemetryUrl();
    configureHttp(http, url);
    http.addHeader("Content-Type", "application/json");

    Serial.print("[TELEMETRY] POST ");
    Serial.println(url);
    Serial.print("[TELEMETRY] Body: ");
    Serial.println(payload);

    const int code = http.POST(payload);
    const String response = code > 0 ? http.getString() : String();
    http.end();

    Serial.print("[TELEMETRY] HTTP ");
    Serial.println(code);

    if (!response.isEmpty()) {
        Serial.print("[TELEMETRY] Response: ");
        Serial.println(response);
    }

    return isHttpSuccess(code);
}

// =====================
// COMMAND ACK -> FASTAPI
// =====================
bool sendCommandAck(int32_t commandId) {
    if (commandId < 0 || WiFi.status() != WL_CONNECTED) {
        return false;
    }

    HTTPClient http;
    const String url = getCommandAckUrl(commandId);
    configureHttp(http, url);
    http.addHeader("Content-Type", "application/json");

    Serial.print("[ACK] POST ");
    Serial.println(url);

    const int code = http.POST("{}");
    const String response = code > 0 ? http.getString() : String();
    http.end();

    Serial.print("[ACK] HTTP ");
    Serial.println(code);

    if (!response.isEmpty()) {
        Serial.print("[ACK] Response: ");
        Serial.println(response);
    }

    if (!isHttpSuccess(code)) {
        return false;
    }

    lastAckedCommandId = commandId;
    pendingAckCommandId = -1;

    preferences.putInt("lastAck", lastAckedCommandId);
    preferences.remove("pendingAck");

    Serial.print("[ACK] Command marked Executed: ");
    Serial.println(commandId);

    return true;
}

void retryPendingAck() {
    if (pendingAckCommandId < 0) {
        return;
    }

    Serial.print("[ACK] Retrying command id ");
    Serial.println(pendingAckCommandId);
    sendCommandAck(pendingAckCommandId);
}

// =====================
// POLL LATEST COMMAND
// =====================
void pollLatestCommand() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[COMMAND] Poll skipped: WiFi disconnected");
        return;
    }

    // ACK command hiện tại trước khi nhận command tiếp theo.
    if (pendingAckCommandId >= 0) {
        retryPendingAck();
        return;
    }

    HTTPClient http;
    const String url = getLatestCommandUrl();
    configureHttp(http, url);

    const int code = http.GET();
    const String response = code > 0 ? http.getString() : String();
    http.end();

    if (code == 204) {
        return;
    }

    if (code == 404) {
        Serial.println("[COMMAND] No pending command (HTTP 404)");
        return;
    }

    if (!isHttpSuccess(code)) {
        Serial.print("[COMMAND] GET failed, HTTP ");
        Serial.println(code);

        if (!response.isEmpty()) {
            Serial.print("[COMMAND] Response: ");
            Serial.println(response);
        }

        return;
    }

    if (response.isEmpty() || response == "null" || response == "{}") {
        return;
    }

    JsonDocument doc;
    const DeserializationError error = deserializeJson(doc, response);

    if (error) {
        Serial.print("[COMMAND] Invalid JSON: ");
        Serial.println(error.c_str());
        Serial.print("[COMMAND] Body: ");
        Serial.println(response);
        return;
    }

    // Backend hiện tại dùng command_id/command_state. Vẫn hỗ trợ id/state
    // để tương thích nếu API đổi sang schema rút gọn trong tương lai.
    int32_t commandId = doc["command_id"] | -1;
    if (commandId < 0) {
        commandId = doc["id"] | -1;
    }

    String command = doc["command"] | "";
    String state = doc["command_state"] | "";
    if (state.isEmpty()) {
        state = String(doc["state"] | "");
    }

    String responseDeviceId = doc["device_id"] | "";

    command.trim();
    command.toUpperCase();
    state.trim();
    state.toUpperCase();

    if (commandId < 0 || command.isEmpty()) {
        Serial.println("[COMMAND] Missing id or command in response");
        Serial.print("[COMMAND] Body: ");
        Serial.println(response);
        return;
    }

    if (!responseDeviceId.isEmpty() && responseDeviceId != DEVICE_ID) {
        Serial.println("[COMMAND] Ignored: device_id does not match this board");
        return;
    }

    if (!state.isEmpty() && state != "PENDING") {
        Serial.print("[COMMAND] Ignored non-Pending command id ");
        Serial.println(commandId);
        return;
    }

    if (commandId <= lastAckedCommandId) {
        Serial.print("[COMMAND] Already ACKed, ignored id ");
        Serial.println(commandId);
        return;
    }

    Serial.print("[COMMAND] Received id=");
    Serial.print(commandId);
    Serial.print(" command=");
    Serial.println(command);

    if (!executeCommand(command)) {
        return;
    }

    // Lưu trước khi ACK để board không thực thi lặp sau khi mất mạng/reboot.
    pendingAckCommandId = commandId;
    preferences.putInt("pendingAck", pendingAckCommandId);

    sendCommandAck(commandId);
}

// =====================
// SETUP
// =====================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("========================================");
    Serial.println("AWS IoT Monitoring and Control Dashboard");
    Serial.println("YOLO UNO: Fan, Light, Curtain, DHT20, LCD");
    Serial.println("========================================");

    pinMode(PIN_FAN, OUTPUT);
    pinMode(PIN_FAN_CONTROL, OUTPUT);
    pinMode(PIN_LIGHT, OUTPUT);
    pinMode(LIGHT_SENSOR_PIN, INPUT);

    digitalWrite(PIN_FAN, LOW);
    digitalWrite(PIN_FAN_CONTROL, LOW);
    digitalWrite(PIN_LIGHT, LOW);

    curtainServo.setPeriodHertz(50);
    curtainServo.attach(PIN_SERVO, 500, 2400);
    setCurtain(CURTAIN_CLOSE_ANGLE);

    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(100000);
    initializeLcd();
    initializeDHT20();

    preferences.begin("iot-device", false);
    lastAckedCommandId = preferences.getInt("lastAck", -1);
    pendingAckCommandId = preferences.getInt("pendingAck", -1);

    Serial.print("[STATE] lastAckedCommandId=");
    Serial.println(lastAckedCommandId);
    Serial.print("[STATE] pendingAckCommandId=");
    Serial.println(pendingAckCommandId);

    connectWiFi();

    // Cho phép gửi telemetry và polling command ngay sau khi boot.
    lastTelemetryMs = millis() - TELEMETRY_INTERVAL_MS;
    lastCommandPollMs = millis() - COMMAND_POLL_INTERVAL_MS;
    lastLcdUpdateMs = millis() - LCD_UPDATE_INTERVAL_MS;
}

// =====================
// LOOP
// =====================
void loop() {
    maintainWiFi();

    const unsigned long now = millis();

    if (now - lastLcdUpdateMs >= LCD_UPDATE_INTERVAL_MS) {
        lastLcdUpdateMs = now;
        refreshSensors();
        updateLcd();
    }

    if (now - lastCommandPollMs >= COMMAND_POLL_INTERVAL_MS) {
        lastCommandPollMs = now;
        pollLatestCommand();
    }

    if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryMs = now;
        sendTelemetry();
    }

    delay(20);
}
