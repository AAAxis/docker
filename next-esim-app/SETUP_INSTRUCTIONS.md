# Setup Instructions

## Environment Configuration

To run this React eSIM application, you need to create a `.env` file in the root directory with the following variables:

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Stripe Configuration (Test Mode)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# DataPlans API (optional)
REACT_APP_DATAPLANS_API_TOKEN=your_dataplans_api_token
```

## Quick Start

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your actual API keys

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## Notes

- The app will work without Stripe keys (payment will show a configuration message)
- Firebase keys are required for country/region data
- DataPlans API is optional for data synchronization
