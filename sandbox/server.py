import os
import json
import uuid
import random
import string
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv
from flask_cors import CORS

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Firebase Admin initialization
if not firebase_admin._apps:
    cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', './esim-f0e3e-firebase-adminsdk-fbsvc-cc27060e04.json')
    if not os.path.exists(cred_path):
        raise RuntimeError(f'Firebase service account file not found: {cred_path}')
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("🧪" * 40)
print("🧪 SANDBOX SERVER - ALL AIRALO CALLS RETURN MOCK DATA")
print("🧪" * 40)

def authenticate_firebase_token(id_token):
    """Authenticate Firebase ID token for regular users"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        
        return {
            'uid': uid,
            'email': email,
            'type': 'regular_user',
            'mode': 'sandbox'  # Always sandbox
        }
    except Exception as e:
        print(f"Firebase token authentication error: {e}")
        return None

def authenticate_api_key(api_key):
    """Authenticate API key against Firestore business_users collection"""
    try:
        users_ref = db.collection('business_users')
        query = users_ref.where('apiCredentials.apiKey', '==', api_key).limit(1)
        docs = list(query.stream())
        
        if not docs:
            return None
            
        user_data = docs[0].to_dict()
        
        # Check if email is verified
        if not user_data.get('emailVerified', False):
            return None
            
        return {
            'uid': docs[0].id,
            'email': user_data.get('email'),
            'mode': 'sandbox',  # Always sandbox
            'balance': 999999  # Unlimited balance for sandbox
        }
    except Exception as e:
        print(f"Authentication error: {e}")
        return None

def generate_mock_order(package_id, quantity='1'):
    """Generate mock Airalo order data"""
    mock_order_id = f"TEST_{uuid.uuid4().hex[:16].upper()}"
    mock_iccid = f"8901260{''.join(random.choices(string.digits, k=13))}"
    mock_activation_code = f"TEST_{''.join(random.choices(string.ascii_uppercase + string.digits, k=12))}"
    mock_matching_id = f"MATCH_{''.join(random.choices(string.ascii_uppercase + string.digits, k=10))}"
    
    return {
        'data': {
            'id': mock_order_id,
            'package_id': package_id,
            'quantity': int(quantity),
            'type': 'sim',
            'status': 'completed',
            'price': 0,  # $0 for test orders
            'sims': [{
                'iccid': mock_iccid,
                'lpa': f'LPA:1$test.smdp.io${mock_matching_id}',
                'matching_id': mock_matching_id,
                'activation_code': mock_activation_code,
                'qrcode': f'LPA:1$test.smdp.io${mock_matching_id}',
                'qrcode_url': 'https://test.example.com/qr.png',
                'is_roaming': True,
            }],
            'created_at': '2024-01-01T00:00:00Z',
            'is_test_mode': True
        }
    }

def generate_mock_qr():
    """Generate mock QR code data"""
    mock_iccid = f"8901260{''.join(random.choices(string.digits, k=13))}"
    mock_activation_code = f"TEST_{''.join(random.choices(string.ascii_uppercase + string.digits, k=12))}"
    mock_matching_id = f"MATCH_{''.join(random.choices(string.ascii_uppercase + string.digits, k=10))}"
    mock_lpa = f"LPA:1$test.smdp.io${mock_matching_id}"
    
    return {
        'qrCode': mock_lpa,
        'lpa': mock_lpa,
        'iccid': mock_iccid,
        'activationCode': mock_activation_code,
        'matchingId': mock_matching_id,
        'smdpAddress': 'test.smdp.io',
        'qrCodeUrl': 'https://test.example.com/qr.png',
        'directAppleInstallationUrl': f'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata={mock_lpa}'
    }

# ============================================================================
# Health Check
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'mode': 'SANDBOX',
        'message': 'All Airalo API calls return mock data'
    })

# ============================================================================
# User Endpoints (Firebase Token Authentication) - MOCK DATA ONLY
# ============================================================================

@app.route('/api/user/order', methods=['POST'])
def create_user_order():
    """Create MOCK eSIM order (always returns test data)"""
    try:
        # Authenticate user via Firebase ID token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        # Get request data
        data = request.get_json()
        package_id = data.get('package_id')
        quantity = data.get('quantity', '1')
        to_email = data.get('to_email', user['email'])
        
        if not package_id:
            return jsonify({'success': False, 'error': 'package_id is required'}), 400
        
        print(f"")
        print(f"{'='*80}")
        print(f"🧪 SANDBOX - Creating MOCK order (no real Airalo API call)")
        print(f"{'='*80}")
        print(f"  User: {user['email']} ({user['uid']})")
        print(f"  Package: {package_id}")
        print(f"  Quantity: {quantity}")
        print(f"  Mode: SANDBOX (mock data only)")
        print(f"{'='*80}")
        print(f"")
        
        # Generate mock order data
        mock_order_result = generate_mock_order(package_id, quantity)
        mock_order_id = mock_order_result['data']['id']
        mock_iccid = mock_order_result['data']['sims'][0]['iccid']
        
        print(f"✅ MOCK order created: {mock_order_id}")
        
        # Save order to Firestore (marked as test)
        order_data = {
            'userId': user['uid'],
            'userEmail': user['email'],
            'airaloOrderId': mock_order_id,
            'packageId': package_id,
            'quantity': quantity,
            'status': 'completed',
            'orderData': mock_order_result.get('data', {}),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'mode': 'sandbox',
            'isTestMode': True
        }
        
        order_ref = db.collection('orders').add(order_data)
        order_id = order_ref[1].id
        
        # LOG TO api_usage FOR BUSINESS DASHBOARD (marked as test, $0)
        api_usage_data = {
            'userId': user['uid'],
            'userEmail': user['email'],
            'endpoint': '/api/user/order',
            'method': 'POST',
            'mode': 'sandbox',
            'packageId': package_id,
            'packageName': package_id,
            'orderId': order_id,
            'airaloOrderId': mock_order_id,
            'amount': 0,  # $0 for test orders
            'status': 'completed',
            'isTestOrder': True,
            'testModeLabel': '🧪 TEST ORDER',
            'createdAt': firestore.SERVER_TIMESTAMP,
            'metadata': {
                'quantity': quantity,
                'iccid': mock_iccid
            }
        }
        
        # Add to api_usage collection for business dashboard
        db.collection('api_usage').add(api_usage_data)
        print(f"✅ Logged to global api_usage collection (SANDBOX MODE)")
        
        # ALSO ADD TO USER SUBCOLLECTION
        try:
            user_api_usage_ref = db.collection('business_users').document(user['uid']).collection('api_usage')
            user_api_usage_ref.add(api_usage_data)
            print(f"✅ Logged to user subcollection (SANDBOX MODE)")
        except Exception as subcollection_error:
            print(f"⚠️ Warning: Could not save to user subcollection: {subcollection_error}")
        
        return jsonify({
            'success': True,
            'orderId': order_id,
            'airaloOrderId': mock_order_id,
            'orderData': mock_order_result.get('data', {}),
            'isTestMode': True
        })
        
    except Exception as e:
        print(f"❌ Error creating mock order: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/qr-code', methods=['POST'])
def get_user_qr_code():
    """Get MOCK QR code (always returns mock QR code)"""
    try:
        # Authenticate user via Firebase ID token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        # Get request data
        data = request.get_json()
        order_id = data.get('orderId')
        
        if not order_id:
            return jsonify({'success': False, 'error': 'orderId is required'}), 400
        
        print(f"🧪 SANDBOX - Returning MOCK QR code for order: {order_id}")
        
        # Generate mock QR code data
        qr_data = generate_mock_qr()
        
        return jsonify({
            'success': True,
            **qr_data,
            'isTestMode': True
        })
        
    except Exception as e:
        print(f"❌ Error getting mock QR code: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/balance', methods=['GET'])
def get_user_balance():
    """Get user balance (always returns unlimited for sandbox)"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        print(f"🧪 SANDBOX - Returning unlimited balance for user {user['email']}")
        
        return jsonify({
            'success': True,
            'balance': 999999.99,
            'hasInsufficientFunds': False,
            'minimumRequired': 4.0,
            'mode': 'sandbox'
        })
        
    except Exception as e:
        print(f"❌ Error getting balance: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# Business API Endpoints (API Key Authentication) - MOCK DATA ONLY
# ============================================================================

@app.route('/api/packages', methods=['GET'])
def get_packages():
    """Get mock packages list"""
    print("🧪 SANDBOX - Returning mock packages list")
    
    # Return some mock packages
    mock_packages = {
        'data': [
            {
                'id': 'test-package-1',
                'title': 'Test Package 1GB',
                'data': '1GB',
                'validity': '7 days',
                'price': 4.50,
                'operator': 'Test Operator'
            }
        ]
    }
    
    return jsonify(mock_packages)

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Create MOCK order (API key auth)"""
    try:
        # Check for API key
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'Missing API key'}), 401
        
        # Authenticate API key
        user = authenticate_api_key(api_key)
        if not user:
            return jsonify({'success': False, 'error': 'Invalid API key'}), 401
        
        # Get request data
        data = request.get_json()
        package_id = data.get('package_id')
        quantity = data.get('quantity', '1')
        
        if not package_id:
            return jsonify({'success': False, 'error': 'package_id is required'}), 400
        
        print(f"🧪 SANDBOX - Creating MOCK order via API key for user {user['email']}")
        
        # Generate mock order
        mock_order_result = generate_mock_order(package_id, quantity)
        
        return jsonify({
            'success': True,
            **mock_order_result,
            'isTestMode': True
        })
        
    except Exception as e:
        print(f"❌ Error creating mock order: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"")
    print(f"🧪" * 40)
    print(f"🧪 Starting SANDBOX server on port {port}")
    print(f"🧪 ALL Airalo API calls will return MOCK data")
    print(f"🧪 NO REAL orders will be created")
    print(f"🧪" * 40)
    print(f"")
    app.run(host='0.0.0.0', port=port, debug=False)

