# Firebase Functions Setup Guide

## Prerequisites

1. **Firebase CLI**: Install the Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Login**: Login to your Firebase account:
   ```bash
   firebase login
   ```

3. **Stripe Account**: You need a Stripe account with API keys.

## Environment Variables Setup

### Option 1: Using Firebase Config (Recommended)

1. Get your Stripe secret key from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

2. Set the environment variable using Firebase CLI:
   ```bash
   # For test environment
   firebase functions:config:set stripe.secret_key="sk_test_your_stripe_secret_key_here"
   
   # For production environment
   firebase functions:config:set stripe.secret_key="sk_live_your_stripe_secret_key_here"
   ```

### Option 2: Using the Deployment Script

1. Set the environment variable in your terminal:
   ```bash
   # For test environment
   export STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   
   # For production environment
   export STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
   ```

2. Run the deployment script:
   ```bash
   ./functions/deploy.sh
   ```

## Manual Deployment

If you prefer to deploy manually:

1. Install Python dependencies:
   ```bash
   cd functions
   pip install -r requirements.txt
   ```

2. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

## Verification

After deployment, you can verify the setup by:

1. **Check Firebase Console**: Go to your Firebase project console and check the Functions section.

2. **Test the Functions**: Use the Firebase Functions emulator or test directly in your app.

3. **Monitor Logs**: Check the function logs for any errors:
   ```bash
   firebase functions:log
   ```

## Troubleshooting

### Common Issues

1. **STRIPE_SECRET_KEY not found**: Make sure you've set the environment variable correctly.

2. **Import errors**: Ensure all dependencies are installed:
   ```bash
   cd functions
   pip install -r requirements.txt
   ```

3. **Permission errors**: Make sure your Firebase project has the necessary permissions and billing is enabled.

### Environment Variables

The functions will look for the Stripe secret key in this order:
1. `STRIPE_SECRET_KEY` environment variable
2. Firebase config: `stripe.secret_key`
3. Firebase params (newer format)

## Security Notes

- Never commit your Stripe secret keys to version control
- Use test keys for development and live keys for production
- Regularly rotate your API keys
- Monitor your Stripe dashboard for any suspicious activity

## Support

If you encounter issues:
1. Check the Firebase Functions logs
2. Verify your Stripe keys are correct
3. Ensure your Firebase project has billing enabled
4. Check the Stripe dashboard for any webhook or API errors 