# AWS IoT Dashboard Backend

[Tiếng Việt](README.vi.md)

The FastAPI backend receives telemetry from IoT devices, stores it in
PostgreSQL, and manages control commands through the `Pending` → `Executed`
state transition.

## Technologies

- FastAPI + Uvicorn
- SQLAlchemy
- PostgreSQL / Amazon RDS
- Pydantic

## Project structure

```text
backend/
├── app/
│   ├── api/          # API routes
│   ├── database/     # Database connection and initialization
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   └── services/     # Telemetry and command processing
├── .env.example
├── main.py
├── requirements.txt
└── simulator.py
```

## Run locally

Run the following commands from the `backend` directory.

### 1. Create the Python environment

Windows PowerShell:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Linux/macOS:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

### 2. Configure the database

When using Amazon RDS, first download the CA bundle into the `backend`
directory.

Windows PowerShell:

```powershell
Invoke-WebRequest `
  -Uri "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" `
  -OutFile "global-bundle.pem"
```

Linux/macOS:

```bash
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

Update `.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_RDS_PASSWORD>@<RDS_ENDPOINT>:5432/iot_dashboard?sslmode=verify-full&sslrootcert=global-bundle.pem
DEVICE_API_KEY=demo-device-key
```

`DATABASE_URL` is required. URL-encode the password before inserting it into
the connection string when it contains special characters. Use only the RDS
endpoint hostname; do not include `https://` or `:5432`.
`sslmode=verify-full` requires TLS, verifies the CA, and checks that the
endpoint matches the certificate.

For a local PostgreSQL server without TLS, use:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<URL_ENCODED_PASSWORD>@localhost:5432/iot_dashboard
```

`global-bundle.pem` is excluded by `.gitignore` and must not be committed.

> `DEVICE_API_KEY` is present in the configuration, but the current endpoints
> do not validate it yet. Do not expose the API directly to the Internet
> without authentication or appropriate access restrictions.

### 3. Create tables and start the API

```powershell
python -m app.database.init_db
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

After startup:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

For production, remove `--reload` and place the API behind a reverse proxy or
an appropriately restricted Security Group.

## Main API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Backend information |
| `GET` | `/api/health` | API health check |
| `POST` | `/api/telemetry` | Receive and store telemetry |
| `GET` | `/api/devices/{device_id}/latest` | Latest telemetry |
| `GET` | `/api/devices/{device_id}/history` | Telemetry history, newest first |
| `POST` | `/api/devices/{device_id}/commands` | Create a `Pending` command |
| `GET` | `/api/devices/{device_id}/commands/latest` | Get the oldest `Pending` command |
| `POST` | `/api/devices/{device_id}/commands/{command_id}/ack` | Mark a command as `Executed` |

Command endpoints return `404` when the device does not exist. A device is
created automatically when the backend receives its first telemetry payload
with the corresponding `deviceId`.

### Send telemetry

```http
POST /api/telemetry
Content-Type: application/json
```

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

### Create a command

```http
POST /api/devices/room_01/commands
Content-Type: application/json
```

```json
{
  "command": "FAN_ON"
}
```

Commands supported by the firmware:

```text
MODE_AUTO
MODE_MANUAL
FAN_ON
FAN_OFF
LIGHT_ON
LIGHT_OFF
CURTAIN_OPEN
CURTAIN_CLOSE
```

The backend stores commands as strings and does not validate this list. The
device is responsible for validating each command and sending an ACK after
execution.

## Run the simulator

The simulator sends telemetry and handles commands like a physical device:

```powershell
python simulator.py `
  --base-url http://localhost:8000 `
  --device-id room_01 `
  --interval 3
```

On Linux/macOS, replace PowerShell line continuations with `\`, or place the
command on one line. Always pass `--base-url` to avoid using the default
address in `simulator.py`.

## Troubleshooting

- `DATABASE_URL Field required`: create `.env` and run the command from the
  correct directory.
- PostgreSQL connection error: check the host, port `5432`, database, account,
  firewall, and RDS Security Group.
- `certificate verify failed` or missing CA: check `global-bundle.pem`,
  `sslrootcert`, and run the backend from the `backend` directory.
- RDS connection timeout: allow TCP `5432` from the EC2 Security Group or
  another approved source in the RDS Security Group.
- `404` when creating a command: send telemetry for that `deviceId` first.
- `ModuleNotFoundError`: activate the virtual environment and reinstall
  `requirements.txt`.
- A command remains `Pending`: the device or simulator must call the ACK
  endpoint after execution.
