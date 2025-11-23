# 🧪 RoamJet Sandbox API Server

This is the **SANDBOX** version of the RoamJet API server that **always returns mock Airalo data**.

## 🎯 Purpose

- **NO real Airalo API calls** are made
- All orders return mock/test data
- Perfect for testing without spending money
- Should be deployed to: `sandbox.roamjet.net`

## 🚀 Deployment

### Docker Build & Run

```bash
# Build the Docker image
docker build -t roamjet-sandbox .

# Run the container
docker run -p 5000:5000 roamjet-sandbox
```

### Deploy to Server

Deploy this to `sandbox.roamjet.net` and configure your frontend to use this server when in sandbox/test mode.

## 📋 Endpoints

All endpoints return mock data:

- `POST /api/user/order` - Create mock order
- `POST /api/user/qr-code` - Get mock QR code
- `GET /api/user/balance` - Returns unlimited balance (999999.99)
- `GET /api/packages` - Returns mock packages
- `POST /api/orders` - Create mock order (API key auth)
- `GET /health` - Health check

## ⚙️ Configuration

Copy `.env.example` to `.env`:

```bash
cp env.example .env
```

No Airalo credentials needed - everything is mocked!

## 🔒 Authentication

- **Firebase Token Auth**: For regular users (esim-main frontend)
- **API Key Auth**: For business users (esim-biz dashboard)

Both work the same as production, but return mock data.

## ✨ Features

- ✅ All orders are free ($0)
- ✅ Unlimited balance
- ✅ Instant QR codes
- ✅ No real API costs
- ✅ Perfect for testing and development

## 🔗 Production Server

For production (real Airalo orders), use the `/api` server instead.

