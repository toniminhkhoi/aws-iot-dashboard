from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()

@router.get("/health")
def check_health():
    return {
        "status": "ok",
        "service": "aws-iot-dashboard-backend",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }