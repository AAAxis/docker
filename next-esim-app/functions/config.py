import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_config_value(key, fallback_keys=None):
    """Get configuration value from multiple sources"""
    # Try environment variables first
    value = os.environ.get(key)
    if value:
        return value
    
    # Try fallback keys
    if fallback_keys:
        for fallback_key in fallback_keys:
            value = os.environ.get(fallback_key)
            if value:
                return value
    
    # Try Firebase Functions config
    try:
        import firebase_functions.config as config
        if key.startswith('STRIPE_TEST_'):
            return config.get('stripe', {}).get('test_secret_key')
        elif key.startswith('STRIPE_LIVE_'):
            return config.get('stripe', {}).get('live_secret_key')
        elif key.startswith('DATAPLANS_'):
            return config.get('dataplans', {}).get('api_token')
    except:
        pass
    
    return None

# Stripe configuration - support both test and live keys
STRIPE_TEST_SECRET_KEY = get_config_value('STRIPE_TEST_SECRET_KEY', ['STRIPE_SECRET_KEY'])
STRIPE_LIVE_SECRET_KEY = get_config_value('STRIPE_LIVE_SECRET_KEY')

# DataPlans API configuration (JWT token) - optional, can be loaded from Firestore
DATAPLANS_API_TOKEN = get_config_value('DATAPLANS_API_TOKEN', ['DATAPLANS'])

# Validate required environment variables
if not STRIPE_TEST_SECRET_KEY:
    raise ValueError("STRIPE_TEST_SECRET_KEY is not set. Please set it via .env file or Firebase config.")

# DataPlans API token is optional here - it can be loaded from Firestore dynamically
if DATAPLANS_API_TOKEN:
    print("✅ DataPlans API token loaded from environment/config")
else:
    print("⚠️ DataPlans API token not found in environment - will try to load from Firestore")

# Helper function to get the appropriate Stripe key based on mode
def get_stripe_key(mode='test'):
    """Get the appropriate Stripe secret key based on mode"""
    if mode == 'live':
        if not STRIPE_LIVE_SECRET_KEY:
            raise ValueError("STRIPE_LIVE_SECRET_KEY is not set for live mode. Please configure it.")
        return STRIPE_LIVE_SECRET_KEY
    else:
        return STRIPE_TEST_SECRET_KEY

# Helper function to get DataPlans API configuration
def get_dataplans_config(environment='test'):
    """Get DataPlans API configuration including endpoint and token"""
    from firebase_admin import firestore
    
    # Determine the correct endpoint based on environment
    if environment == 'prod' or environment == 'production':
        base_url = 'https://app.dataplans.io/api/v1'
    else:
        base_url = 'https://sandbox.dataplans.io/api/v1'
    
    # Try to get API token from Firestore first
    api_token = None
    try:
        db = firestore.client()
        doc_ref = db.collection('config').document('dataplans')
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            api_token = data.get('api_key')
            if api_token:
                print(f"✅ DataPlans API token loaded from Firestore")
    except Exception as e:
        print(f"⚠️ Could not load DataPlans API token from Firestore: {e}")
    
    # Fallback to environment variable
    if not api_token:
        api_token = DATAPLANS_API_TOKEN
        if api_token:
            print(f"✅ Using DataPlans API token from environment")
    
    if not api_token:
        raise ValueError("DataPlans API token not found in Firestore or environment variables")
    
    return {
        'base_url': base_url,
        'api_token': api_token,
        'headers': {
            'Authorization': f'Bearer {api_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
