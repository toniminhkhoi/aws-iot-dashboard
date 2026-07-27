import argparse
import os
import random
import time
from datetime import datetime
from typing import Any, Dict

import requests


# =========================================================
# DEFAULT CONFIG
# Có thể override bằng biến môi trường hoặc command-line args.
# Ví dụ:
#   API_BASE_URL=http://IP CUA EC2 :8000 python simulator.py
#   python simulator.py --base-url http://IP CUA EC2 :8000 --device-id room_01
# =========================================================

DEFAULT_API_BASE_URL = os.getenv("API_BASE_URL", "http://47.129.106.198:8000")
DEFAULT_DEVICE_ID = os.getenv("DEVICE_ID", "room_01")
DEFAULT_INTERVAL_SECONDS = int(os.getenv("INTERVAL_SECONDS", "5"))


class DeviceState:
    def __init__(self, device_id: str):
        self.device_id = device_id
        self.mode = "AUTO"  # Chế độ: "AUTO" hoặc "MANUAL"
        self.fan_on = False
        self.light_on = True
        self.curtain_closed = False

def process_pending_commands(api_base_url: str, state: DeviceState):
    """
    Hỏi Backend xem có lệnh điều khiển nào đang Pending không.
    Nếu có -> Cập nhật trạng thái thiết bị và gửi ACK xác nhận.
    """
    url_get = f"{api_base_url.rstrip('/')}/api/devices/{state.device_id}/commands/latest"
    
    try:
        res = requests.get(url_get, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get("status") == "success" and data.get("command_state") == "Pending":
                cmd_str = data.get("command")
                cmd_id = data.get("command_id")
                
                print(f"\n[COMMAND RECEIVED] Lệnh: '{cmd_str}' (ID: {cmd_id})")
                
                # 1. Xử lý đổi chế độ Auto / Manual
                if cmd_str == "MODE_AUTO":
                    state.mode = "AUTO"
                    print("--> 🤖 Chuyển sang CHẾ ĐỘ TỰ ĐỘNG (AI Auto Control)")
                elif cmd_str == "MODE_MANUAL":
                    state.mode = "MANUAL"
                    print("--> ✋ Chuyển sang CHẾ ĐỘ THỦ CÔNG (Manual Override)")
                
                # 2. Xử lý bật/tắt thủ công (Tự động kích hoạt chế độ MANUAL)
                elif cmd_str == "FAN_ON":
                    state.mode = "MANUAL"
                    state.fan_on = True
                    print("--> ✋ [MANUAL] Bật Quạt")
                elif cmd_str == "FAN_OFF":
                    state.mode = "MANUAL"
                    state.fan_on = False
                    print("--> ✋ [MANUAL] Tắt Quạt")
                elif cmd_str == "LIGHT_ON":
                    state.mode = "MANUAL"
                    state.light_on = True
                    print("--> ✋ [MANUAL] Bật Đèn")
                elif cmd_str == "LIGHT_OFF":
                    state.mode = "MANUAL"
                    state.light_on = False
                    print("--> ✋ [MANUAL] Tắt Đèn")
                elif cmd_str == "CURTAIN_OPEN":
                    state.mode = "MANUAL"
                    state.curtain_closed = False
                    print("--> ✋ [MANUAL] Mở Rèm")
                elif cmd_str == "CURTAIN_CLOSE":
                    state.mode = "MANUAL"
                    state.curtain_closed = True
                    print("--> ✋ [MANUAL] Đóng Rèm")

                # 3. Gửi ACK xác nhận đã thực thi lệnh xuống Backend
                url_ack = f"{api_base_url.rstrip('/')}/api/devices/{state.device_id}/commands/{cmd_id}/ack"
                requests.post(url_ack, timeout=5)
                print(f"[ACK SENT] Đã xác nhận hoàn tất lệnh ID: {cmd_id}\n")
                
    except requests.exceptions.RequestException:
        pass  # Bỏ qua nếu lỗi mạng để simulator tiếp tục chạy


def generate_telemetry(state: DeviceState) -> Dict[str, Any]:
    """
    Sinh dữ liệu cảm biến ngẫu nhiên.
    Nếu ở chế độ AUTO -> Tự động bật/tắt theo thông số.
    Nếu ở chế độ MANUAL -> Giữ nguyên trạng thái do người dùng ra lệnh!
    """
    temperature = round(random.uniform(26.0, 35.0), 1)
    humidity = round(random.uniform(55.0, 85.0), 1)
    light_intensity = round(random.uniform(100.0, 900.0), 1)

    # NẾU Ở CHẾ ĐỘ TỰ ĐỘNG: Thiết bị tự quyết định
    if state.mode == "AUTO":
        state.fan_on = temperature >= 30.0
        state.light_on = light_intensity < 350.0
        state.curtain_closed = light_intensity >= 700.0

    # NẾU Ở CHẾ ĐỘ THỦ CÔNG (MANUAL): Bỏ qua tính toán tự động!
    # Giữ nguyên giá trị state.fan_on, state.light_on, state.curtain_closed hiện tại.

    return {
        "deviceId": state.device_id,
        "temperature": temperature,
        "humidity": humidity,
        "lightIntensity": light_intensity,
        "fan": state.fan_on,
        "light": state.light_on,
        "curtain": state.curtain_closed,
    }


def send_telemetry(api_base_url: str, payload: Dict[str, Any], mode: str) -> bool:
    url = f"{api_base_url.rstrip('/')}/api/telemetry"
    try:
        response = requests.post(url, json=payload, timeout=10)
        if 200 <= response.status_code < 300:
            mode_badge = "🤖 AUTO  " if mode == "AUTO" else "✋ MANUAL"
            print(f"[OK] {datetime.now().strftime('%H:%M:%S')} [{mode_badge}] Temp: {payload['temperature']}°C | Fan: {'ON ' if payload['fan'] else 'OFF'} | Light: {'ON ' if payload['light'] else 'OFF'}")
            return True
        print(f"[ERROR] HTTP {response.status_code}: {response.text}")
        return False
    except requests.exceptions.RequestException as error:
        print(f"[ERROR] Cannot send telemetry: {error}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="IoT telemetry simulator for AWS IoT Dashboard backend")
    parser.add_argument("--base-url", default=DEFAULT_API_BASE_URL, help="FastAPI backend base URL")
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID, help="Device ID to simulate")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS, help="Seconds between requests")
    args = parser.parse_args()

    print("=========================================================")
    print("🚀 IOT SMART SIMULATOR (AUTO / MANUAL OVERRIDE ENGINE)")
    print("=========================================================")
    print(f"Backend URL : {args.base_url}")
    print(f"Device ID   : {args.device_id}")
    print(f"Interval    : {args.interval} seconds")
    print("---------------------------------------------------------")

    # Khởi tạo cỗ máy trạng thái cho thiết bị
    device_state = DeviceState(args.device_id)

    while True:
        # Bước 1: Lắng nghe và xử lý lệnh từ Frontend/AWS gửi xuống
        process_pending_commands(args.base_url, device_state)

        # Bước 2: Sinh dữ liệu đo đạc & tính toán trạng thái
        payload = generate_telemetry(device_state)

        # Bước 3: Gửi số liệu mới nhất lên Backend
        send_telemetry(args.base_url, payload, device_state.mode)

        time.sleep(args.interval)


if __name__ == "__main__":
    main()