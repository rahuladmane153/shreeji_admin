# Shreeji — KYC & Device Management System

A complete KYC onboarding + device management / location-tracking platform.

```
shreeji_admin/          Admin portal (this repo)
├── client/             Next.js 14 admin frontend
└── server/             Node.js microservices (also serves the mobile app APIs)

shreeji_android/        Flutter mobile app (separate repo)
```

## Architecture

| Layer        | Tech                                   |
|--------------|----------------------------------------|
| Mobile app   | Flutter (`shreeji_android`)            |
| Admin portal | Next.js 14 (App Router, TS, Tailwind)  |
| Backend      | Node.js microservices (Express)        |
| Database     | MySQL (`shreeji_app`) via Sequelize    |
| Gateway      | API gateway proxies `/api/<service>/*` |

### Microservices (`server/packages`)

| Service       | Port | Responsibility                                            |
|---------------|------|-----------------------------------------------------------|
| api-gateway   | 5000 | Single entry point, proxies to services                   |
| auth          | 5001 | Admin login, customer OTP login/register, token refresh   |
| kyc-app       | 5002 | Mobile APIs: device, KYC, documents, location, heartbeat  |
| customer      | 5003 | Admin: onboarded customers + KYC records review           |
| device        | 5004 | Admin: device management + commands (lock/disable/…)      |
| tracking      | 5005 | Admin: live map, location history, geofencing, alerts     |
| master        | 5006 | Admin: dashboard stats + audit logs                       |

Shared code lives in `server/common` (config, keys, helpers, middleware, and the
Sequelize models under `database/db_model_structure`). Each service connects
through `database/db_connectivity/<service>/index.js`, loading only the models it
needs.

## Running the backend

Prerequisites: Node 18+, MySQL running on `127.0.0.1:3306` (root / 1100).

```bash
cd server
npm install                 # installs all workspaces
npm run db:init             # creates shreeji_app, syncs tables, seeds admin
npm run dev                 # starts all 7 services with nodemon
```

Seed admin: **admin@shreeji.com / Admin@123**
Customer OTP is in dev mode (`OTP_DEV_MODE=1`) → OTP is always `123456` and
returned in the API response. Configuration lives in `server/.env`.

### Direct customer registration API

Use the no-OTP onboarding flow for new customers:

```http
POST /api/auth/customer/register
Content-Type: application/json

{
  "first_name": "Rahul",
  "last_name": "Admane",
  "mobile": "9876543210",
  "password": "Password@123",
  "confirm_password": "Password@123"
}
```

Response includes JWT access/refresh tokens and a `next_step: "register_device"`
flag so the app can continue straight to the device-registration step.

For production: `npm start` (PM2 via `ecosystem.config.js`).

## Running the admin portal

```bash
cd client
npm install
npm run dev                 # http://localhost:3000
```

Login with the seed admin. The portal talks to the gateway at
`http://127.0.0.1:5000/api` (configurable in `client/.env.local`). The live map
uses OpenStreetMap tiles (no API key required).

## Running the mobile app

See `shreeji_android/README.md`. Point `API_BASE` at the gateway
(`http://10.0.2.2:5000/api` for the Android emulator).

## Security notes

- Stateless JWT access tokens + rotating refresh tokens (hashed in DB).
- Aadhaar numbers are encrypted at rest (AES-256-GCM); only the masked last-4 is
  shown in the admin portal.
- Every sensitive admin action and customer consent is written to `audit_logs`.
- Set `OTP_DEV_MODE=0` and wire a real SMS/OCR provider before production.
