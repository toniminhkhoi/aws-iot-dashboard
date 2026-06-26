from fastapi import FastAPI
from datetime import datetime, timezone

app = FastAPI(
    title="AWS IoT Dashboard API",
    description="Backend API for Cloud-based IoT Monitoring and Control Dashboard on AWS",
    version="1.0.0"
)

@app.get("/")
def root():
    return {
        "message": "AWS IoT Dashboard Backend",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "aws-iot-dashboard-backend",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }