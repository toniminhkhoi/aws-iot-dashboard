from fastapi import FastAPI
from app.api import health, device

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

app.include_router(health.router, prefix = "/api", tags= ["Health Check"])
app.include_router(device.router, prefix = "/api", tags = ["Device"])