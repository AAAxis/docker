import os
import json
import requests
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

# Airalo configuration
AIRALO_BASE_URL = os.getenv('AIRALO_BASE_URL', 'https://partners-api.airalo.com')
AIRALO_CLIENT_SECRET = os.getenv('AIRALO_CLIENT_SECRET')
AIRALO_CLIENT_ID = os.getenv('AIRALO_CLIENT_ID')

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
            'mode': user_data.get('apiCredentials', {}).get('mode', 'sandbox'),
            'balance': user_data.get('balance', 0)
        }
    except Exception as e:
        print(f"Authentication error: {e}")
        return None

def authenticate_firebase_token(id_token):
    """Authenticate Firebase ID token for regular users"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        
        return {
            'uid': uid,
            'email': email,
            'type': 'regular_user'
        }
    except Exception as e:
        print(f"Firebase token authentication error: {e}")
        return None

def get_airalo_token():
    """Get Airalo API token"""
    try:
        response = requests.post(f"{AIRALO_BASE_URL}/v2/token", json={
            'client_id': AIRALO_CLIENT_ID,
            'client_secret': AIRALO_CLIENT_SECRET
        })
        response.raise_for_status()
        data = response.json()
        # v2 API returns {"data": {"access_token": "..."}}
        return data.get('data', {}).get('access_token')
    except Exception as e:
        print(f"Airalo token error: {e}")
        return None

def get_user_balance(user_uid):
    """Get current balance for a business user"""
    try:
        # Get billing transactions (credits)
        billing_transactions = db.collection('billing_transactions').where('userId', '==', user_uid).stream()
        credits = sum(t.to_dict().get('amount', 0) for t in billing_transactions)
        
        # Get api_usage (debits) - only from global collection
        api_usage = db.collection('api_usage').where('userId', '==', user_uid).stream()
        debits = sum(u.to_dict().get('amount', 0) for u in api_usage)
        
        balance = credits - debits
        print(f"💰 Balance calculation for {user_uid}: Credits={credits}, Debits={debits}, Balance={balance}")
        return balance
    except Exception as e:
        print(f"❌ Error calculating balance: {e}")
        return 0

def check_minimum_balance(user_uid, minimum=4.0):
    """Check if user has at least minimum balance (default $4)"""
    try:
        balance = get_user_balance(user_uid)
        has_sufficient = balance >= minimum
        print(f"💳 Balance check: ${balance:.2f} >= ${minimum:.2f}? {has_sufficient}")
        return {
            'sufficient': has_sufficient,
            'balance': balance,
            'minimum': minimum
        }
    except Exception as e:
        print(f"❌ Error checking minimum balance: {e}")
        return {
            'sufficient': False,
            'balance': 0,
            'minimum': minimum,
            'error': str(e)
        }

def deduct_balance(user_uid, amount):
    """Deduct balance from user account"""
    try:
        user_ref = db.collection('business_users').document(user_uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return False
            
        current_balance = user_doc.to_dict().get('balance', 0)
        if current_balance < amount:
            return False
            
        new_balance = current_balance - amount
        user_ref.update({'balance': new_balance})
        
        # Record transaction
        transaction_data = {
            'type': 'esim_purchase',
            'amount': amount,
            'balance_before': current_balance,
            'balance_after': new_balance,
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        db.collection('business_users').document(user_uid).collection('transactions').add(transaction_data)
        
        return True
    except Exception as e:
        print(f"Balance deduction error: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Server is running'})

@app.route('/api/user/balance', methods=['GET'])
def get_user_balance_endpoint():
    """Get current balance for authenticated user"""
    try:
        # Authenticate using Firebase ID token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        api_mode = user.get('api_mode', 'production')
        
        # In sandbox/test mode, skip balance calculation and return mock balance
        if api_mode in ['sandbox', 'test']:
            print(f"🧪 SANDBOX/TEST MODE: Returning mock balance (999.99) for user {user['uid']} - NO REAL BALANCE CHECK")
            return jsonify({
                'success': True,
                'balance': 999.99,  # Mock balance for sandbox
                'hasInsufficientFunds': False,
                'minimumRequired': 4.0,
                'mode': 'sandbox'
            })
        
        # PRODUCTION MODE: Calculate real balance
        print(f"🚀 PRODUCTION MODE: Calculating real balance for user {user['uid']}")
        balance = get_user_balance(user['uid'])
        has_sufficient = balance >= 4.0
        
        print(f"💰 Balance check for user {user['uid']}: balance=${balance:.2f}, sufficient={has_sufficient}")
        
        return jsonify({
            'success': True,
            'balance': balance,
            'hasInsufficientFunds': not has_sufficient,
            'minimumRequired': 4.0,
            'mode': 'production'
        })
    except Exception as e:
        print(f"❌ Error getting user balance: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/esim/create', methods=['POST'])
def create_esim():
    """Create a new eSIM"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
    
    api_key = auth_header[7:]
    user = authenticate_api_key(api_key)
    
    if not user:
        return jsonify({'success': False, 'error': 'Client not found'}), 401
    
    data = request.get_json()
    package_id = data.get('package_id')
    
    if not package_id:
        return jsonify({'success': False, 'error': 'package_id is required'}), 400
    
    if user['mode'] == 'sandbox':
        # Return mock eSIM data
        mock_esim = {
            'id': f'mock_esim_{package_id}_{user["uid"][:8]}',
            'package_id': package_id,
            'status': 'active',
            'qr_code': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'activation_code': f'MOCK{user["uid"][:8].upper()}',
            'created_at': '2024-01-01T00:00:00Z',
            'expires_at': '2024-02-01T00:00:00Z'
        }
        return jsonify({'success': True, 'data': mock_esim})
    
    # Production mode - create real eSIM via Airalo
    try:
        token = get_airalo_token()
        if not token:
            return jsonify({'success': False, 'error': 'Failed to authenticate with Airalo'}), 500
        
        # Get package price first
        headers = {'Authorization': f'Bearer {token}'}
        package_response = requests.get(f"{AIRALO_BASE_URL}/packages/{package_id}", headers=headers)
        package_response.raise_for_status()
        package_data = package_response.json()
        package_price = package_data.get('price', 0)
        
        # Check and deduct balance
        if not deduct_balance(user['uid'], package_price):
            return jsonify({'success': False, 'error': 'Insufficient balance'}), 400
        
        # Create eSIM with Airalo
        esim_data = {
            'package_id': package_id,
            'customer_email': user['email']
        }
        
        esim_response = requests.post(f"{AIRALO_BASE_URL}/esims", 
                                   json=esim_data, headers=headers)
        esim_response.raise_for_status()
        
        airalo_esim = esim_response.json()
        
        # Store eSIM in Firestore for tracking
        esim_record = {
            'user_uid': user['uid'],
            'airalo_esim_id': airalo_esim.get('id'),
            'package_id': package_id,
            'price': package_price,
            'status': airalo_esim.get('status'),
            'created_at': firestore.SERVER_TIMESTAMP
        }
        db.collection('esims').add(esim_record)
        
        return jsonify({'success': True, 'data': airalo_esim})
        
    except Exception as e:
        print(f"Airalo eSIM creation error: {e}")
        return jsonify({'success': False, 'error': 'Failed to create eSIM'}), 500

@app.route('/api/esim/details', methods=['GET'])
def get_esim_details():
    """Get eSIM details"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
    
    api_key = auth_header[7:]
    user = authenticate_api_key(api_key)
    
    if not user:
        return jsonify({'success': False, 'error': 'Client not found'}), 401
    
    esim_id = request.args.get('esim_id')
    if not esim_id:
        return jsonify({'success': False, 'error': 'esim_id is required'}), 400
    
    if user['mode'] == 'sandbox':
        # Return mock eSIM details
        mock_details = {
            'id': esim_id,
            'status': 'active',
            'data_used': '1.2GB',
            'data_limit': '5GB',
            'days_remaining': 25,
            'qr_code': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'activation_code': f'MOCK{esim_id[:8].upper()}'
        }
        return jsonify({'success': True, 'data': mock_details})
    
    # Production mode - fetch from Airalo
    try:
        token = get_airalo_token()
        if not token:
            return jsonify({'success': False, 'error': 'Failed to authenticate with Airalo'}), 500
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{AIRALO_BASE_URL}/esims/{esim_id}", headers=headers)
        response.raise_for_status()
        
        esim_data = response.json()
        return jsonify({'success': True, 'data': esim_data})
        
    except Exception as e:
        print(f"Airalo eSIM details error: {e}")
        return jsonify({'success': False, 'error': 'Failed to fetch eSIM details'}), 500

@app.route('/api/esim/usage', methods=['GET'])
def get_esim_usage():
    """Get eSIM usage statistics"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
    
    api_key = auth_header[7:]
    user = authenticate_api_key(api_key)
    
    if not user:
        return jsonify({'success': False, 'error': 'Client not found'}), 401
    
    esim_id = request.args.get('esim_id')
    if not esim_id:
        return jsonify({'success': False, 'error': 'esim_id is required'}), 400
    
    if user['mode'] == 'sandbox':
        # Return mock usage data
        mock_usage = {
            'esim_id': esim_id,
            'data_used': '1.2GB',
            'data_limit': '5GB',
            'usage_percentage': 24,
            'days_used': 5,
            'days_remaining': 25,
            'last_updated': '2024-01-01T12:00:00Z'
        }
        return jsonify({'success': True, 'data': mock_usage})
    
    # Production mode - fetch from Airalo
    try:
        token = get_airalo_token()
        if not token:
            return jsonify({'success': False, 'error': 'Failed to authenticate with Airalo'}), 500
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{AIRALO_BASE_URL}/esims/{esim_id}/usage", headers=headers)
        response.raise_for_status()
        
        usage_data = response.json()
        return jsonify({'success': True, 'data': usage_data})
        
    except Exception as e:
        print(f"Airalo eSIM usage error: {e}")
        return jsonify({'success': False, 'error': 'Failed to fetch eSIM usage'}), 500

# ============================================================================
# Regular User Endpoints (for esim-main frontend)
# These endpoints authenticate via Firebase ID token and use server's Airalo credentials
# ============================================================================

@app.route('/api/user/order', methods=['POST'])
def create_user_order():
    """Create REAL eSIM order (production only - makes real Airalo API call)"""
    try:
        # Get request data first to extract email
        data = request.get_json()
        to_email = data.get('to_email') if data else None
        
        # Authenticate via API key (required for API access)
        # Priority: X-API-Key header first, then Authorization Bearer header
        api_key = request.headers.get('X-API-Key', '')
        auth_header = request.headers.get('Authorization', '')
        
        # If no API key in X-API-Key header, check Authorization Bearer header
        if not api_key and auth_header.startswith('Bearer '):
            potential_key = auth_header[7:]
            # Try to authenticate as API key first
            test_owner = authenticate_api_key(potential_key)
            if test_owner:
                api_key = potential_key
            else:
                # Not an API key, might be Firebase token (will handle later)
                pass
        
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 401
        
        # Authenticate API key (business owner)
        business_owner = authenticate_api_key(api_key)
        if not business_owner:
            return jsonify({'success': False, 'error': 'Invalid or unverified API key'}), 401
        
        print(f"🔑 API Key owner identified: {business_owner['email']} ({business_owner['uid']})")
        
        # Try to authenticate user via Firebase token (optional)
        # Only if Authorization header contains a Firebase token (not the API key we already used)
        user = None
        if auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            # Only try Firebase auth if it's not the API key we already used
            if id_token != api_key:
                user = authenticate_firebase_token(id_token)
        
        # If no Firebase user, create user object from email
        if not user:
            if not to_email:
                return jsonify({'success': False, 'error': 'to_email is required when Firebase token is not provided'}), 400
            # Create a user object from email
            user = {
                'uid': f'email_{to_email.replace("@", "_").replace(".", "_")}',
                'email': to_email,
                'type': 'email_user'
            }
            print(f"📧 Using email-based user: {user['email']} ({user['uid']})")
        
        # Check KYC status
        user_ref = db.collection('business_users').document(business_owner['uid'])
        user_doc = user_ref.get()
        if not user_doc.exists:
            return jsonify({'success': False, 'error': 'Business user not found'}), 404
        
        user_data = user_doc.to_dict()
        kyc_status = user_data.get('kycStatus', 'pending')
        
        if kyc_status != 'approved':
            return jsonify({
                'success': False, 
                'error': 'KYC verification required',
                'kycStatus': kyc_status,
                'message': 'Please complete KYC verification to use the production API'
            }), 403
        
        print(f"✅ KYC verified for {business_owner['email']}")
        
        # Check balance
        current_balance = business_owner.get('balance', 0)
        if current_balance <= 0:
            return jsonify({
                'success': False,
                'error': 'Insufficient balance',
                'balance': current_balance,
                'message': 'Please add funds to your account to create orders'
            }), 402
        
        print(f"✅ Balance check passed: ${current_balance}")
        
        # Get request data (already retrieved above)
        package_id = data.get('package_id')
        quantity = data.get('quantity', '1')
        to_email = data.get('to_email', user.get('email') if user else None)
        description = data.get('description', f"eSIM order for {to_email}")
        
        if not to_email:
            return jsonify({'success': False, 'error': 'to_email is required'}), 400
        
        if not package_id:
            return jsonify({'success': False, 'error': 'package_id is required'}), 400
        
        print(f"")
        print(f"{'='*80}")
        print(f"💳 PRODUCTION - Creating REAL Airalo order")
        print(f"{'='*80}")
        print(f"  User: {user['email']} ({user['uid']})")
        print(f"  Package: {package_id}")
        print(f"  Quantity: {quantity}")
        print(f"{'='*80}")
        print(f"")
        
        # Get Airalo token using server's credentials
        token = get_airalo_token()
        if not token:
            return jsonify({'success': False, 'error': 'Failed to authenticate with Airalo'}), 500
        
        # Prepare form data for Airalo API
        form_data = {
            'quantity': quantity,
            'package_id': package_id,
            'type': 'sim',
            'description': description,
            'to_email': to_email,
            'sharing_option[]': ['link']
        }
        
        print(f"📦 Sending order to Airalo API")
        
        # Create order with Airalo
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        response = requests.post(
            f"{AIRALO_BASE_URL}/v2/orders",
            headers=headers,
            data=form_data
        )
        
        if not response.ok:
            error_text = response.text
            print(f"❌ Airalo order error: {error_text}")
            return jsonify({
                'success': False,
                'error': f'Failed to create order: {response.status_code}'
            }), 500
        
        order_result = response.json()
        airalo_order_id = order_result.get('data', {}).get('id')
        airalo_price = order_result.get('data', {}).get('price', 0)
        
        print(f"✅ REAL order created successfully: {airalo_order_id}")
        
        # Save order to Firestore
        order_data = {
            'userId': user['uid'],
            'userEmail': user['email'],
            'airaloOrderId': airalo_order_id,
            'packageId': package_id,
            'quantity': quantity,
            'status': 'pending',
            'orderData': order_result.get('data', {}),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'mode': 'production',
            'isTestMode': False
        }
        
        order_ref = db.collection('orders').add(order_data)
        order_id = order_ref[1].id
        
        # LOG TO api_usage FOR BUSINESS DASHBOARD
        api_usage_data = {
            'customerId': user['uid'],  # The customer who purchased
            'customerEmail': user['email'],
            'userId': business_owner['uid'],  # Business owner (for filtering orders in dashboard)
            'userEmail': business_owner['email'],  # Business owner email
            'businessOwnerId': business_owner['uid'],  # The business owner who should get paid
            'businessOwnerEmail': business_owner['email'],
            'endpoint': '/api/user/order',
            'method': 'POST',
            'mode': 'production',
            'packageId': package_id,
            'packageName': package_id,
            'orderId': order_id,
            'airaloOrderId': airalo_order_id,
            'amount': airalo_price,
            'status': 'pending',
            'isTestOrder': False,
            'testModeLabel': None,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'metadata': {
                'quantity': quantity,
                'iccid': order_result.get('data', {}).get('sims', [{}])[0].get('iccid') if order_result.get('data', {}).get('sims') else None,
                'hasBusinessOwner': True
            }
        }
        
        # Add to api_usage collection for business dashboard (GLOBAL COLLECTION ONLY)
        db.collection('api_usage').add(api_usage_data)
        print(f"✅ Logged to global api_usage collection (PRODUCTION)")
        print(f"   Customer: {user['email']} ({user['uid']})")
        print(f"   Business Owner: {business_owner['email'] if business_owner else 'NOT SET'} ({business_owner['uid'] if business_owner else 'N/A'})")
        
        return jsonify({
            'success': True,
            'orderId': order_id,
            'airaloOrderId': airalo_order_id,
            'orderData': order_result.get('data', {}),
            'isTestMode': False
        })
        
    except Exception as e:
        print(f"❌ Error creating user order: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/qr-code', methods=['POST'])
def get_user_qr_code():
    """Get QR code for regular user's order"""
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
        
        print(f"📱 Getting QR code for order: {order_id}")
        
        # Try to get order from multiple locations
        # First try: orders collection (backend created)
        order_ref = db.collection('orders').document(order_id)
        order_doc = order_ref.get()
        
        if not order_doc.exists:
            # Second try: users/{uid}/esims/{orderId} (frontend created)
            print(f"📱 Order not in orders collection, checking users/{user['uid']}/esims/{order_id}")
            order_ref = db.collection('users').document(user['uid']).collection('esims').document(order_id)
            order_doc = order_ref.get()
        
        if not order_doc.exists:
            print(f"❌ Order {order_id} not found in any collection")
            return jsonify({'success': False, 'error': 'Order not found'}), 404
        
        order_data = order_doc.to_dict()
        
        # Verify order belongs to user (if userId field exists)
        if order_data.get('userId') and order_data.get('userId') != user['uid']:
            return jsonify({'success': False, 'error': 'Unauthorized access to order'}), 403
        
        # Check if QR code already cached
        if order_data.get('qrCode'):
            print(f"✅ Returning cached QR code")
            return jsonify({
                'success': True,
                'qrCode': order_data.get('qrCode'),
                'activationCode': order_data.get('activationCode'),
                'iccid': order_data.get('iccid'),
                'directAppleInstallationUrl': order_data.get('directAppleInstallationUrl'),
                'lpa': order_data.get('lpa'),
                'smdpAddress': order_data.get('smdpAddress'),
                'fromCache': True
            })
        
        # CHECK TEST MODE: Return mock QR data if this is a test order
        is_test_mode = order_data.get('isTestMode', False)
        airalo_order_id = order_data.get('airaloOrderId')
        
        # If no airaloOrderId and has orderResult, it's probably a frontend-created test order
        if not airalo_order_id and order_data.get('orderResult'):
            is_test_mode = True
            print(f"🧪 Detected frontend test order (no airaloOrderId)")
        
        if is_test_mode:
            print(f"🧪 TEST MODE: Returning MOCK QR code data (no real Airalo call)")
            
            # Try to get mock data from orderData.sims (backend created)
            mock_sims = order_data.get('orderData', {}).get('sims', [])
            
            if mock_sims:
                # Backend-created test order
                mock_sim = mock_sims[0]
                qr_code = mock_sim.get('qrcode', mock_sim.get('lpa'))
                activation_code = mock_sim.get('activation_code')
                iccid = mock_sim.get('iccid')
                lpa = mock_sim.get('lpa')
                smdp_address = 'test.smdp.io'
            else:
                # Frontend-created test order or missing sim data - generate mock data
                import random
                import string
                print(f"🧪 Generating new mock QR data for test order")
                iccid = f"TEST_ICCID_{''.join(random.choices(string.ascii_uppercase + string.digits, k=10))}"
                matching_id = f"MATCH_{''.join(random.choices(string.ascii_uppercase + string.digits, k=10))}"
                activation_code = f"TEST_CODE_{''.join(random.choices(string.ascii_uppercase + string.digits, k=12))}"
                smdp_address = 'test.smdp.io'
                lpa = f'LPA:1${smdp_address}${matching_id}'
                qr_code = lpa
            
            # Cache the mock QR code data
            try:
                order_ref.update({
                    'qrCode': qr_code,
                    'activationCode': activation_code,
                    'iccid': iccid,
                    'lpa': lpa,
                    'smdpAddress': smdp_address,
                    'directAppleInstallationUrl': f'https://test.example.com/install/{iccid}'
                })
            except Exception as update_error:
                print(f"⚠️ Could not cache QR code: {update_error}")
            
            return jsonify({
                'success': True,
                'qrCode': qr_code,
                'activationCode': activation_code,
                'iccid': iccid,
                'lpa': lpa,
                'smdpAddress': smdp_address,
                'directAppleInstallationUrl': f'https://test.example.com/install/{iccid}',
                'qrCodeUrl': f'https://test.example.com/qr/{iccid}.png',
                'isTestMode': True
            })
        
        # LIVE MODE: Get real QR code from Airalo
        print(f"💳 LIVE MODE: Fetching REAL QR code from Airalo")
        
        # Check if we have airaloOrderId for live mode
        if not airalo_order_id:
            print(f"❌ No Airalo order ID found for live order")
            return jsonify({'success': False, 'error': 'Airalo order ID not found. Order may still be processing.'}), 400
        
        # Get Airalo token
        token = get_airalo_token()
        if not token:
            return jsonify({'success': False, 'error': 'Failed to authenticate with Airalo'}), 500
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        # Get order details from Airalo
        print(f"📱 Fetching order details from Airalo")
        order_response = requests.get(
            f"{AIRALO_BASE_URL}/v2/orders/{airalo_order_id}",
            headers=headers
        )
        
        if not order_response.ok:
            return jsonify({
                'success': False,
                'error': 'Failed to fetch order details',
                'canRetry': True
            }), 400
        
        order_details = order_response.json()
        sims = order_details.get('data', {}).get('sims', [])
        
        if not sims or len(sims) == 0:
            return jsonify({
                'success': False,
                'error': 'No SIMs found in order. The order may still be processing.',
                'canRetry': True
            }), 400
        
        sim_iccid = sims[0].get('iccid')
        if not sim_iccid:
            return jsonify({
                'success': False,
                'error': 'ICCID not found. The order may still be processing.',
                'canRetry': True
            }), 400
        
        print(f"📱 Fetching SIM details for ICCID: {sim_iccid}")
        
        # Get SIM details
        sim_response = requests.get(
            f"{AIRALO_BASE_URL}/v2/sims/{sim_iccid}",
            headers=headers
        )
        
        if not sim_response.ok:
            return jsonify({
                'success': False,
                'error': 'Failed to fetch SIM details',
                'canRetry': True
            }), 400
        
        sim_details = sim_response.json()
        sim_data = sim_details.get('data', {})
        
        qr_code = sim_data.get('qr_code')
        activation_code = sim_data.get('activation_code')
        direct_apple_url = sim_data.get('direct_apple_installation_url')
        
        if not (qr_code or activation_code or direct_apple_url):
            return jsonify({
                'success': False,
                'error': 'QR code not available yet. Please try again in a few minutes.',
                'canRetry': True
            }), 400
        
        # Update order with QR code data
        qr_data = {
            'qrCode': qr_code or direct_apple_url,
            'activationCode': activation_code,
            'iccid': sim_iccid,
            'directAppleInstallationUrl': direct_apple_url,
            'qrCodeUrl': sim_data.get('qrcode_url'),
            'lpa': sim_data.get('lpa'),
            'smdpAddress': sim_data.get('smdp_address'),
            'status': 'active',
            'airaloSimDetails': sim_data,
            'qrCodeRetrievedAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        order_ref.update(qr_data)
        
        print(f"✅ QR code retrieved and saved successfully")
        
        return jsonify({
            'success': True,
            'qrCode': qr_code or direct_apple_url,
            'activationCode': activation_code,
            'iccid': sim_iccid,
            'directAppleInstallationUrl': direct_apple_url,
            'qrCodeUrl': sim_data.get('qrcode_url'),
            'lpa': sim_data.get('lpa'),
            'smdpAddress': sim_data.get('smdp_address'),
            'fromCache': False
        })
        
    except Exception as e:
        print(f"❌ Error getting QR code: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/sim-details', methods=['POST'])
def get_user_sim_details():
    """Get SIM details by ICCID for regular users"""
    try:
        # Authenticate user
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        iccid = data.get('iccid')
        
        if not iccid:
            return jsonify({'success': False, 'error': 'iccid is required'}), 400
        
        # CHECK TEST MODE: If ICCID starts with TEST_, return mock data
        if iccid.startswith('TEST_ICCID_') or iccid.startswith('8901260'):
            # Check if it's a test ICCID by looking at user's orders
            orders_ref = db.collection('orders').where('userId', '==', user['uid']).where('isTestMode', '==', True).limit(10)
            test_orders = list(orders_ref.stream())
            
            is_test = any(
                iccid in str(order.to_dict().get('orderData', {}))
                for order in test_orders
            )
            
            if is_test or iccid.startswith('TEST_ICCID_'):
                print(f"🧪 TEST MODE: Returning MOCK SIM details for ICCID: {iccid}")
                
                # Return mock SIM details
                mock_sim_details = {
                    'iccid': iccid,
                    'lpa': f'LPA:1$test.smdp.io$MATCH_TEST',
                    'matching_id': 'MATCH_TEST',
                    'activation_code': f'TEST_CODE_{iccid[-8:]}',
                    'qrcode': f'LPA:1$test.smdp.io$MATCH_TEST',
                    'qrcode_url': 'https://test.example.com/qr.png',
                    'apn_type': 'automatic',
                    'apn_value': None,
                    'is_roaming': True,
                    'confirmation_code': f'TEST_CONF_{iccid[-8:]}',
                    'smdp_address': 'test.smdp.io',
                    'manual_installation': {
                        'activation_code': f'TEST_CODE_{iccid[-8:]}',
                        'confirmation_code': f'TEST_CONF_{iccid[-8:]}',
                        'smdp_address': 'test.smdp.io'
                    }
                }
                
                return jsonify({'success': True, 'data': mock_sim_details, 'isTestMode': True})
        
        # LIVE MODE: Get real SIM details from Airalo
        print(f"💳 LIVE MODE: Fetching REAL SIM details for ICCID: {iccid}")
        
        # Get Airalo token
        token = get_airalo_token()
        if not token:
            return jsonify({'success': False, 'error': 'Failed to authenticate with Airalo'}), 500
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        # Get SIM details from Airalo
        response = requests.get(
            f"{AIRALO_BASE_URL}/v2/sims/{iccid}",
            headers=headers
        )
        
        if not response.ok:
            return jsonify({'success': False, 'error': 'Failed to fetch SIM details'}), 500
        
        sim_details = response.json()
        return jsonify({'success': True, 'data': sim_details.get('data', {})})
        
    except Exception as e:
        print(f"❌ Error getting SIM details: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/sim-usage', methods=['POST'])
def get_user_sim_usage():
    """Get SIM usage by ICCID for regular users"""
    try:
        # Authenticate user
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        iccid = data.get('iccid')
        
        if not iccid:
            return jsonify({'success': False, 'error': 'iccid is required'}), 400
        
        # CHECK TEST MODE: If ICCID starts with TEST_, return mock usage data
        if iccid.startswith('TEST_ICCID_') or iccid.startswith('8901260'):
            # Check if it's a test ICCID by looking at user's orders
            orders_ref = db.collection('orders').where('userId', '==', user['uid']).where('isTestMode', '==', True).limit(10)
            test_orders = list(orders_ref.stream())
            
            is_test = any(
                iccid in str(order.to_dict().get('orderData', {}))
                for order in test_orders
            )
            
            if is_test or iccid.startswith('TEST_ICCID_'):
                print(f"🧪 TEST MODE: Returning MOCK usage data for ICCID: {iccid}")
                
                import random
                from datetime import datetime, timedelta
                
                # Generate realistic mock usage data
                total_mb = 5120  # 5GB
                used_mb = random.randint(500, 2500)  # Random between 0.5GB - 2.5GB
                remaining_mb = total_mb - used_mb
                percentage_used = (used_mb / total_mb) * 100
                
                mock_usage_data = {
                    'data': {
                        'total': f'{total_mb} MB',
                        'total_mb': total_mb,
                        'used': f'{used_mb} MB',
                        'used_mb': used_mb,
                        'remaining': f'{remaining_mb} MB',
                        'remaining_mb': remaining_mb,
                        'percentage': round(percentage_used, 2),
                        'daily_usage': [
                            {
                                'date': (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'),
                                'usage_mb': random.randint(50, 300)
                            }
                            for i in range(7)
                        ],
                        'is_unlimited': False,
                        'validity_start': (datetime.now() - timedelta(days=3)).isoformat(),
                        'validity_end': (datetime.now() + timedelta(days=27)).isoformat(),
                        'status': 'active'
                    }
                }
                
                return jsonify({'success': True, 'data': mock_usage_data['data'], 'isTestMode': True})
        
        # LIVE MODE: Get real usage data from Airalo
        print(f"💳 LIVE MODE: Fetching REAL usage data for ICCID: {iccid}")
        
        # Get Airalo token
        token = get_airalo_token()
        if not token:
            return jsonify({'success': False, 'error': 'Failed to authenticate with Airalo'}), 500
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        # Get usage data from Airalo
        response = requests.get(
            f"{AIRALO_BASE_URL}/v2/sims/{iccid}/usage",
            headers=headers
        )
        
        if not response.ok:
            return jsonify({'success': False, 'error': 'Failed to fetch usage data'}), 500
        
        usage_data = response.json()
        return jsonify({'success': True, 'data': usage_data.get('data', {})})
        
    except Exception as e:
        print(f"❌ Error getting usage data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# PUBLIC Endpoints (no authentication required)
# These endpoints are for the public-facing frontend
# ============================================================================

@app.route('/api/public/countries', methods=['GET'])
def get_public_countries():
    """Get available countries - PUBLIC endpoint (no auth required)"""
    try:
        print(f"🌍 PUBLIC: Fetching countries from Firebase")
        
        countries_ref = db.collection('countries')
        countries_docs = countries_ref.stream()
        
        countries = []
        for doc in countries_docs:
            country_data = doc.to_dict()
            
            # Format country data for API response
            country = {
                'id': doc.id,
                'name': country_data.get('name'),
                'code': country_data.get('code'),
                'flag': country_data.get('flag'),
                'flagEmoji': country_data.get('flagEmoji'),
                'region': country_data.get('region'),
                'continent': country_data.get('continent')
            }
            countries.append(country)
        
        print(f"✅ Found {len(countries)} countries")
        
        return jsonify({
            'success': True,
            'data': {
                'countries': countries,
                'count': len(countries)
            }
        })
        
    except Exception as e:
        print(f"❌ Error fetching countries: {e}")
        return jsonify({'success': False, 'error': f'Failed to fetch countries: {str(e)}'}), 500

@app.route('/api/public/plans', methods=['GET'])
def get_public_plans():
    """Get all plans - PUBLIC endpoint (no auth required)"""
    try:
        print(f"📦 PUBLIC: Fetching plans from Firebase")
        
        plans_ref = db.collection('dataplans')
        
        # Get optional filters from query params
        country_code = request.args.get('country')
        plan_type_filter = request.args.get('type')  # global, regional, other
        limit = request.args.get('limit', type=int)
        
        # Add default limit to prevent memory issues
        if not limit:
            limit = 1000  # Default limit to prevent memory overload
        
        # Apply filters if provided
        if country_code:
            plans_ref = plans_ref.where('country_codes', 'array_contains', country_code)
        
        # Apply limit to Firestore query to reduce memory usage
        plans_ref = plans_ref.limit(limit + 100)  # Add buffer for filtering
        
        # Fetch plans
        plans_docs = plans_ref.stream()
        
        plans = []
        for doc in plans_docs:
            plan_data = doc.to_dict()
            
            # Only include enabled plans
            if plan_data.get('enabled', True) == False:
                continue
            
            # Extract validity from plan name/slug if not available in validity field
            validity = plan_data.get('validity')
            if not validity:
                # Try to extract from name like "1 GB - 7 Days" or slug like "plan-7days-1gb"
                name = plan_data.get('name', '')
                slug = plan_data.get('slug', '')
                
                # Look for patterns like "7 Days", "30 Days", etc. in name
                import re
                name_match = re.search(r'(\d+)\s*Days?', name)
                if name_match:
                    validity = int(name_match.group(1))
                else:
                    # Look for patterns like "7days", "30days" in slug
                    slug_match = re.search(r'(\d+)days?', slug)
                    if slug_match:
                        validity = int(slug_match.group(1))
            
            # Format plan data for API response
            # Get data capacity from 'data' field or 'capacity' field
            data_value = plan_data.get('data') or plan_data.get('capacity')
            
            # Categorize the plan (global, regional, or other)
            category = categorize_plan(plan_data)
            
            plan = {
                'id': doc.id,
                'slug': plan_data.get('slug'),
                'name': plan_data.get('name'),
                'title': plan_data.get('title', plan_data.get('name')),
                'price': float(plan_data.get('price', 0)),
                'data': data_value,  # Original field
                'capacity': data_value,  # Alias for mobile app compatibility
                'validity': validity,
                'validity_unit': plan_data.get('validity_unit', 'days'),
                'period': validity,  # Alias for mobile app compatibility (validity days)
                'countries': plan_data.get('country_codes', []),
                'country_codes': plan_data.get('country_codes', []),
                'country_ids': plan_data.get('country_ids', []),
                'operator': plan_data.get('operator', {}).get('title') if isinstance(plan_data.get('operator'), dict) else plan_data.get('operator'),
                'type': category,  # Use categorized type (global, regional, other) for frontend filtering
                'planType': plan_data.get('type', 'data'),  # MongoDB field - use original type (data, voice, sms, unlimited)
                'is_unlimited': plan_data.get('is_unlimited', False),
                'day': plan_data.get('day'),
                'amount': plan_data.get('amount'),
                'enabled': plan_data.get('enabled', True)
            }
            plans.append(plan)
            
            # Apply limit if specified
            if limit and len(plans) >= limit:
                break
        
        print(f"✅ Found {len(plans)} plans")
        
        return jsonify({
            'success': True,
            'data': {
                'plans': plans,
                'count': len(plans)
            }
        })
        
    except Exception as e:
        print(f"❌ Error fetching plans: {e}")
        return jsonify({'success': False, 'error': f'Failed to fetch plans: {str(e)}'}), 500

@app.route('/api/public/topups', methods=['GET'])
def get_public_topups():
    """Get all topup plans - PUBLIC endpoint (no auth required)"""
    try:
        print(f"📦 PUBLIC: Fetching topup plans from Firebase")
        
        topups_ref = db.collection('topups')
        
        # Get optional filters from query params
        country_code = request.args.get('country')
        limit = request.args.get('limit', type=int)
        
        # Add default limit to prevent memory issues
        if not limit:
            limit = 1000  # Default limit to prevent memory overload
        
        # Apply filters if provided
        if country_code:
            topups_ref = topups_ref.where('country_codes', 'array_contains', country_code)
        
        # Apply limit to Firestore query to reduce memory usage
        topups_ref = topups_ref.limit(limit + 100)  # Add buffer for filtering
        
        # Fetch topup plans
        topups_docs = topups_ref.stream()
        
        topups = []
        for doc in topups_docs:
            plan_data = doc.to_dict()
            
            # Only include enabled topup plans
            if plan_data.get('enabled', True) == False:
                continue
            
            # Only include actual topup packages
            if not plan_data.get('is_topup_package', False):
                continue
            
            # Extract validity from plan name/slug if not available in validity field
            validity = plan_data.get('validity')
            if not validity:
                # Try to extract from name like "1 GB - 7 Days" or slug like "plan-7days-1gb"
                name = plan_data.get('name', '')
                slug = plan_data.get('slug', '')
                
                # Look for patterns like "7 Days", "30 Days", etc. in name
                import re
                name_match = re.search(r'(\d+)\s*Days?', name)
                if name_match:
                    validity = int(name_match.group(1))
                else:
                    # Look for patterns like "7days", "30days" in slug
                    slug_match = re.search(r'(\d+)days?', slug)
                    if slug_match:
                        validity = int(slug_match.group(1))
            
            # Format topup plan data for API response
            # Get data capacity from 'data' field or 'capacity' field
            data_value = plan_data.get('data') or plan_data.get('capacity')
            
            # Categorize the topup plan (global, regional, or other)
            category = categorize_plan(plan_data)
            
            topup = {
                'id': doc.id,
                'slug': plan_data.get('slug'),
                'name': plan_data.get('name'),
                'title': plan_data.get('title', plan_data.get('name')),
                'price': float(plan_data.get('price', 0)),
                'data': data_value,  # Original field
                'capacity': data_value,  # Alias for mobile app compatibility
                'validity': validity,
                'validity_unit': plan_data.get('validity_unit', 'days'),
                'period': validity,  # Alias for mobile app compatibility (validity days)
                'countries': plan_data.get('country_codes', []),
                'country_codes': plan_data.get('country_codes', []),
                'country_ids': plan_data.get('country_ids', []),
                'operator': plan_data.get('operator', {}).get('title') if isinstance(plan_data.get('operator'), dict) else plan_data.get('operator'),
                'type': category,  # Use categorized type (global, regional, other) for frontend filtering
                'planType': 'topup',  # MongoDB field - always 'topup' for topup plans
                'category': category,  # MongoDB field - for categorization (global, regional, other)
                'is_unlimited': plan_data.get('is_unlimited', False),
                'is_topup_package': plan_data.get('is_topup_package', True),
                'day': plan_data.get('day'),
                'amount': plan_data.get('amount'),
                'enabled': plan_data.get('enabled', True)
            }
            topups.append(topup)
            
            # Apply limit if specified
            if limit and len(topups) >= limit:
                break
        
        print(f"✅ Found {len(topups)} topup plans")
        
        return jsonify({
            'success': True,
            'data': {
                'plans': topups,
                'count': len(topups)
            }
        })
        
    except Exception as e:
        print(f"❌ Error fetching topup plans: {e}")
        return jsonify({'success': False, 'error': f'Failed to fetch topup plans: {str(e)}'}), 500

# ============================================================================
# Package Sync Endpoints (Copy from Firebase)
# These endpoints copy packages from Firebase Firestore collections
# ============================================================================

def categorize_plan(plan_data):
    """Categorize a plan as global, regional, or other based on its properties"""
    plan_type = (plan_data.get('type') or '').lower()
    plan_region = (plan_data.get('region') or plan_data.get('region_slug') or '').lower()
    plan_name = (plan_data.get('name') or plan_data.get('title') or '').lower()
    plan_slug = (plan_data.get('slug') or '').lower()
    country_codes = plan_data.get('country_codes', []) or []
    
    # Check if it's a global package
    is_global = (
        plan_data.get('is_global') == True or
        plan_type == 'global' or
        plan_region == 'global' or
        plan_slug == 'global' or
        plan_name == 'global' or
        plan_slug.startswith('discover') or
        plan_name.startswith('discover')
    )
    
    # Check if it's a regional package
    regional_identifiers = [
        'asia', 'europe', 'africa', 'americas', 'middle-east', 'middle east',
        'oceania', 'caribbean', 'latin-america', 'latin america',
        'north-america', 'south-america', 'central-america',
        'eastern-europe', 'western-europe', 'scandinavia',
        'asean', 'gcc', 'european-union', 'eu', 'mena',
        'middle-east-and-north-africa', 'middle-east-north-africa',
        'euconnect', 'euroconnect'  # Add specific regional operators
    ]
    
    # Enhanced regional detection
    is_regional = (
        plan_data.get('is_regional') == True or
        plan_type == 'regional' or
        plan_slug in regional_identifiers or
        plan_name in regional_identifiers or
        (plan_region and plan_region != '' and plan_region != 'global' and plan_region in regional_identifiers) or
        # Check for regional operators in slug/name
        any(identifier in plan_slug for identifier in regional_identifiers) or
        any(identifier in plan_name for identifier in regional_identifiers) or
        # Plans with no country codes or N/A are likely regional
        (not country_codes or country_codes == ['N/A'] or country_codes == [None]) or
        # Plans with multiple countries (2+) are likely regional
        (isinstance(country_codes, list) and len(country_codes) >= 2)
    )
    
    if is_global:
        return 'global'
    elif is_regional:
        return 'regional'
    else:
        return 'other'

def _sync_packages_from_firebase():
    """Internal function to copy packages from Firebase dataplans collection"""
    print(f"🔄 Copying packages from Firebase dataplans collection")
    
    # Read all packages from dataplans collection
    plans_ref = db.collection('dataplans')
    plans_docs = plans_ref.stream()
    
    synced_count = 0
    global_count = 0
    regional_count = 0
    other_count = 0
    batch = db.batch()
    batch_count = 0
    MAX_BATCH_SIZE = 500
    
    for doc in plans_docs:
        try:
            plan_data = doc.to_dict()
            plan_id = doc.id
            
            # Skip parent containers (they don't have prices)
            if plan_data.get('is_parent', False):
                continue
            
            # Skip topup packages (they're in topups collection)
            if plan_data.get('is_topup_package', False):
                continue
            
            # Categorize the plan
            category = categorize_plan(plan_data)
            
            if category == 'global':
                global_count += 1
            elif category == 'regional':
                regional_count += 1
            else:
                other_count += 1
            
            # Copy package to dataplans collection (update existing or create new)
            plan_ref = db.collection('dataplans').document(plan_id)
            batch.set(plan_ref, plan_data, merge=True)
            batch_count += 1
            synced_count += 1
            
            if batch_count >= MAX_BATCH_SIZE:
                batch.commit()
                batch = db.batch()
                batch_count = 0
                
        except Exception as e:
            print(f"⚠️ Error processing package {doc.id}: {e}")
            continue
    
    # Commit remaining batch
    if batch_count > 0:
        batch.commit()
    
    print(f"✅ Successfully copied {synced_count} packages from Firebase")
    print(f"   - Global: {global_count}")
    print(f"   - Regional: {regional_count}")
    print(f"   - Other: {other_count}")
    
    return {
        'success': True,
        'message': f'Successfully copied {synced_count} packages from Firebase',
        'total_synced': synced_count,
        'global_count': global_count,
        'regional_count': regional_count,
        'other_count': other_count,
    }

@app.route('/api/sync-packages', methods=['POST'])
def sync_packages():
    """Copy packages from Firebase dataplans collection (sync from Firestore)"""
    try:
        # Authenticate user via Firebase ID token or API key
        auth_header = request.headers.get('Authorization', '')
        api_key = request.headers.get('X-API-Key', '')
        
        user = None
        if api_key:
            user = authenticate_api_key(api_key)
        elif auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized - API key or Firebase token required'}), 401
        
        result = _sync_packages_from_firebase()
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error copying packages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

def _sync_topup_packages_from_firebase():
    """Internal function to copy topup packages from Firebase topups collection"""
    print(f"🔄 Copying topup packages from Firebase topups collection")
    
    # Read all topup packages from topups collection
    topups_ref = db.collection('topups')
    topups_docs = topups_ref.stream()
    
    synced_count = 0
    topup_count = 0
    global_count = 0
    regional_count = 0
    other_count = 0
    batch = db.batch()
    batch_count = 0
    MAX_BATCH_SIZE = 500
    
    for doc in topups_docs:
        try:
            plan_data = doc.to_dict()
            plan_id = doc.id
            
            # Skip parent containers
            if plan_data.get('is_parent', False):
                continue
            
            # Only process topup packages
            if not plan_data.get('is_topup_package', False):
                continue
            
            topup_count += 1
            
            # Categorize the plan
            category = categorize_plan(plan_data)
            
            if category == 'global':
                global_count += 1
            elif category == 'regional':
                regional_count += 1
            else:
                other_count += 1
            
            # Copy topup package to topups collection (update existing or create new)
            plan_ref = db.collection('topups').document(plan_id)
            batch.set(plan_ref, plan_data, merge=True)
            batch_count += 1
            synced_count += 1
            
            if batch_count >= MAX_BATCH_SIZE:
                batch.commit()
                batch = db.batch()
                batch_count = 0
                
        except Exception as e:
            print(f"⚠️ Error processing topup package {doc.id}: {e}")
            continue
    
    # Commit remaining batch
    if batch_count > 0:
        batch.commit()
    
    print(f"✅ Successfully copied {synced_count} topup packages from Firebase")
    print(f"   - Total topup packages: {topup_count}")
    print(f"   - Global: {global_count}")
    print(f"   - Regional: {regional_count}")
    print(f"   - Other: {other_count}")
    
    return {
        'success': True,
        'message': f'Successfully copied {synced_count} topup packages from Firebase',
        'total_synced': synced_count,
        'topup_count': topup_count,
        'global_count': global_count,
        'regional_count': regional_count,
        'other_count': other_count,
    }

@app.route('/api/sync-topup-packages', methods=['POST'])
def sync_topup_packages():
    """Copy topup packages from Firebase topups collection (sync from Firestore)"""
    try:
        # Authenticate user via Firebase ID token or API key
        auth_header = request.headers.get('Authorization', '')
        api_key = request.headers.get('X-API-Key', '')
        
        user = None
        if api_key:
            user = authenticate_api_key(api_key)
        elif auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized - API key or Firebase token required'}), 401
        
        result = _sync_topup_packages_from_firebase()
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error copying topup packages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync-all-packages', methods=['POST'])
def sync_all_packages():
    """Copy both regular and topup packages from Firebase (convenience endpoint)"""
    try:
        # Authenticate user
        auth_header = request.headers.get('Authorization', '')
        api_key = request.headers.get('X-API-Key', '')
        
        user = None
        if api_key:
            user = authenticate_api_key(api_key)
        elif auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized - API key or Firebase token required'}), 401
        
        print(f"🔄 Copying all packages from Firebase (regular + topup)")
        
        # Copy regular packages
        regular_result = {'success': False, 'error': 'Not executed'}
        try:
            regular_result = _sync_packages_from_firebase()
        except Exception as e:
            regular_result = {'success': False, 'error': str(e)}
            print(f"❌ Error copying regular packages: {e}")
        
        # Copy topup packages
        topup_result = {'success': False, 'error': 'Not executed'}
        try:
            topup_result = _sync_topup_packages_from_firebase()
        except Exception as e:
            topup_result = {'success': False, 'error': str(e)}
            print(f"❌ Error copying topup packages: {e}")
        
        # Combine results
        combined_result = {
            'success': regular_result.get('success', False) and topup_result.get('success', False),
            'regular': {
                'success': regular_result.get('success', False),
                'total_synced': regular_result.get('total_synced', 0),
                'global_count': regular_result.get('global_count', 0),
                'regional_count': regular_result.get('regional_count', 0),
                'other_count': regular_result.get('other_count', 0),
                'error': regular_result.get('error')
            },
            'topup': {
                'success': topup_result.get('success', False),
                'total_synced': topup_result.get('total_synced', 0),
                'topup_count': topup_result.get('topup_count', 0),
                'global_count': topup_result.get('global_count', 0),
                'regional_count': topup_result.get('regional_count', 0),
                'other_count': topup_result.get('other_count', 0),
                'error': topup_result.get('error')
            },
            'total_synced': regular_result.get('total_synced', 0) + topup_result.get('total_synced', 0)
        }
        
        print(f"✅ Copy all completed:")
        print(f"   Regular: {combined_result['regular']['total_synced']} packages")
        print(f"   Topup: {combined_result['topup']['total_synced']} packages")
        print(f"   Total: {combined_result['total_synced']} packages")
        
        return jsonify(combined_result)
        
    except Exception as e:
        print(f"❌ Error copying all packages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('DEBUG', 'True').lower() == 'true'
    
    print(f"Starting server on {host}:{port}")
    print(f"Debug mode: {debug}")
    print(f"Firebase service account: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS', './esim-f0e3e-firebase-adminsdk-fbsvc-cc27060e04.json')}")
    
    app.run(host=host, port=port, debug=debug)
