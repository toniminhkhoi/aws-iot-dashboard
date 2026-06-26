# AWS IoT Dashboard

Cloud-based IoT Monitoring and Control Dashboard on AWS using
**FastAPI**, **React**, and **PostgreSQL**.

## Project Overview

This project demonstrates an IoT monitoring and control platform
deployed on AWS. A Python simulator (or ESP32 in the future) sends
telemetry data to a FastAPI backend hosted on AWS EC2. Data is stored in
PostgreSQL and displayed on a React dashboard. Users can also send
control commands back to the device.

## Features

-   Real-time telemetry
-   Historical sensor data
-   Remote device control
-   FastAPI REST API
-   AWS EC2 deployment
-   PostgreSQL database
-   CloudWatch monitoring

## Architecture

``` text
ESP32 / Python Simulator
        │
        ▼
FastAPI Backend (AWS EC2)
        │
        ▼
PostgreSQL (AWS RDS)
        │
        ▼
React Dashboard
        │
        ▼
CloudWatch
```

## Technologies

-   Python, FastAPI, Uvicorn
-   React, Vite
-   PostgreSQL
-   AWS EC2, RDS, IAM, CloudWatch
-   Git & GitHub

## Folder Structure

``` text
aws-iot-dashboard/
├── backend/
├── frontend/
├── simulator/
├── docs/
├── diagrams/
├── screenshots/
├── report/
├── README.md
└── .gitignore
```

## API Endpoints

  Method   Endpoint
  -------- ------------------------------------------
  GET      /api/health
  POST     /api/telemetry
  GET      /api/devices/{device_id}/latest
  GET      /api/devices/{device_id}/history
  POST     /api/devices/{device_id}/commands
  GET      /api/devices/{device_id}/commands/latest

## Team

-   Member 1: AWS & DevOps
-   Member 2: Backend API
-   Member 3: Frontend Dashboard
-   Member 4: Simulator, Testing, Documentation

## Future Improvements

-   Docker
-   GitHub Actions
-   AWS IoT Core
-   HTTPS
-   Authentication

## License

Educational project.
