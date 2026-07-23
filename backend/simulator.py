import random
import time
from datetime import datetime
from typing import Dict, Any

import requests


# =========================
# CONFIG
# =========================

API_BASE_URL = "http://3.1.210.255:8000"
DEVICE_ID = "room_01"
INTERVAL_SECONDS = 5


# =========================
# DEVICE STATE
# =========================

device_state = {
    "fan_state": "off",
    "light_state": "off",
    "curtain_angle": 0,
}


def generate_telemetry() -> Dict[str, Any]:
    """
    Giả lập dữ liệu cảm biến IoT.
    """

    temperature = round(random.uniform(26.0, 35.0), 1)
    humidity = round(random.uniform(55.0, 85.0), 1)
    light_level = random.randint(100, 900)
    presence = random.choice([True, False])
    distance_cm = round(random.uniform(30.0, 200.0), 1)

    return {
        "device_id": DEVICE_ID,
        "temperature": temperature,
        "humidity": humidity,
        "light_level": light_level,
        "presence": presence,
        "distance_cm": distance_cm,
        "fan_state": device_state["fan_state"],
        "light_state": device_state["light_state"],
        "curtain_angle": device_state["curtain_angle"],
    }


def send_telemetry(payload: Dict[str, Any]) -> None:
    """
    Gửi telemetry lên FastAPI backend.
    """

    url = f"{API_BASE_URL}/api/telemetry"

    try:
        response = requests.post(url, json=payload, timeout=10)

        if response.status_code == 200:
            print(f"[OK] Sent telemetry at {datetime.now().strftime('%H:%M:%S')}")
            print(payload)
        else:
            print(f"[ERROR] Backend returned status {response.status_code}")
            print(response.text)

    except requests.exceptions.RequestException as error:
        print(f"[ERROR] Cannot send telemetry: {error}")


def main() -> None:
    print("IoT Simulator started")
    print(f"Backend URL: {API_BASE_URL}")
    print(f"Device ID: {DEVICE_ID}")
    print(f"Interval: {INTERVAL_SECONDS} seconds")
    print("-" * 50)

    while True:
        payload = generate_telemetry()
        send_telemetry(payload)
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()