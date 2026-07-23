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


def generate_telemetry(device_id: str) -> Dict[str, Any]:
    """
    Giả lập dữ liệu IoT theo schema backend mới.

    Backend mới đang nhận payload theo dạng:
    {
        "deviceId": "...",
        "temperature": ...,
        "humidity": ...,
        "lightIntensity": ...,
        "fan": true/false,
        "light": true/false,
        "curtain": true/false
    }
    """

    temperature = round(random.uniform(26.0, 35.0), 1)
    humidity = round(random.uniform(55.0, 85.0), 1)
    light_intensity = round(random.uniform(100.0, 900.0), 1)

    # Logic giả lập đơn giản:
    # - Nhiệt độ cao thì bật quạt
    # - Ánh sáng thấp thì bật đèn
    # - Ánh sáng cao thì kéo rèm
    fan_on = temperature >= 30.0
    light_on = light_intensity < 350.0
    curtain_closed = light_intensity >= 700.0

    return {
        "deviceId": device_id,
        "temperature": temperature,
        "humidity": humidity,
        "lightIntensity": light_intensity,
        "fan": fan_on,
        "light": light_on,
        "curtain": curtain_closed,
    }


def send_telemetry(api_base_url: str, payload: Dict[str, Any]) -> bool:
    """
    Gửi telemetry lên FastAPI backend.
    Trả về True nếu gửi thành công, False nếu lỗi.
    """

    url = f"{api_base_url.rstrip('/')}/api/telemetry"

    try:
        response = requests.post(url, json=payload, timeout=10)

        if 200 <= response.status_code < 300:
            print(f"[OK] {datetime.now().strftime('%H:%M:%S')} - sent telemetry")
            print(f"     payload: {payload}")
            try:
                print(f"     response: {response.json()}")
            except ValueError:
                print(f"     response: {response.text}")
            return True

        print(f"[ERROR] Backend returned HTTP {response.status_code}")
        print(response.text)
        return False

    except requests.exceptions.RequestException as error:
        print(f"[ERROR] Cannot send telemetry: {error}")
        return False


def check_latest(api_base_url: str, device_id: str) -> None:
    """
    Gọi thử endpoint latest của backend mới:
    GET /api/device/{device_id}/latest
    """

    url = f"{api_base_url.rstrip('/')}/api/device/{device_id}/latest"

    try:
        response = requests.get(url, timeout=10)
        print(f"[LATEST] HTTP {response.status_code}")
        try:
            print(response.json())
        except ValueError:
            print(response.text)
    except requests.exceptions.RequestException as error:
        print(f"[ERROR] Cannot get latest telemetry: {error}")


def main() -> None:
    parser = argparse.ArgumentParser(description="IoT telemetry simulator for AWS IoT Dashboard backend")
    parser.add_argument("--base-url", default=DEFAULT_API_BASE_URL, help="FastAPI backend base URL")
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID, help="Device ID to simulate")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS, help="Seconds between requests")
    parser.add_argument("--once", action="store_true", help="Send only one telemetry payload, then exit")
    parser.add_argument("--check-latest", action="store_true", help="Call latest API after sending telemetry")

    args = parser.parse_args()

    print("IoT Simulator started")
    print(f"Backend URL : {args.base_url}")
    print(f"Device ID   : {args.device_id}")
    print(f"Interval    : {args.interval} seconds")
    print(f"Mode        : {'once' if args.once else 'loop'}")
    print("-" * 60)

    while True:
        payload = generate_telemetry(args.device_id)
        success = send_telemetry(args.base_url, payload)

        if success and args.check_latest:
            check_latest(args.base_url, args.device_id)

        if args.once:
            break

        time.sleep(args.interval)


if __name__ == "__main__":
    main()