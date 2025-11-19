import os
import json
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv
from flask_cors import CORS
from airalo import Airalo

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for frontend requests - allow all origins
CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
     allow_headers=["Content-Type", "Authorization", "X-API-Key"])

# Firebase Admin initialization
if not firebase_admin._apps:
    cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', './esim-f0e3e-firebase-adminsdk-fbsvc-cc27060e04.json')
    if not os.path.exists(cred_path):
        raise RuntimeError(f'Firebase service account file not found: {cred_path}')
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Initialize Airalo SDK
AIRALO_CLIENT_ID = os.getenv('AIRALO_CLIENT_ID')
AIRALO_CLIENT_SECRET = os.getenv('AIRALO_CLIENT_SECRET')

alo = None

def initialize_airalo_sdk():
    """Initialize Airalo SDK with retry logic"""
    import sys
    global alo
    if not AIRALO_CLIENT_ID or not AIRALO_CLIENT_SECRET:
        print("⚠️ WARNING: AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET not set in environment variables", flush=True)
        print("⚠️ Airalo SDK will not be available", flush=True)
        sys.stdout.flush()
        return False
    
    try:
        alo = Airalo({
            "client_id": AIRALO_CLIENT_ID,
            "client_secret": AIRALO_CLIENT_SECRET,
        })
        print("=" * 80, flush=True)
        print("🚀 AIRALO SDK SERVER - Using REAL Airalo API via Python SDK", flush=True)
        print("=" * 80, flush=True)
        print(f"✅ Airalo SDK initialized successfully", flush=True)
        print("=" * 80, flush=True)
        sys.stdout.flush()
        return True
    except Exception as e:
        print("=" * 80, flush=True)
        print("⚠️ WARNING: Airalo SDK initialization failed", flush=True)
        print(f"⚠️ Error: {str(e)}", flush=True)
        print("⚠️ Server will start but Airalo SDK features will be unavailable", flush=True)
        print("⚠️ SDK will retry initialization on next API call", flush=True)
        print("=" * 80, flush=True)
        sys.stdout.flush()
        sys.stderr.flush()
        alo = None
        return False

# Try to initialize SDK on startup
initialize_airalo_sdk()

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
        }
    except Exception as e:
        print(f"Authentication error: {e}")
        return None

def convert_sdk_order_to_response(sdk_response, package_id, quantity):
    """Convert Airalo SDK order response to our API format"""
    if not sdk_response or 'data' not in sdk_response:
        return None
    
    order_data = sdk_response['data']
    
    # Extract SIMs data
    sims = []
    if 'sims' in order_data:
        for sim in order_data['sims']:
            sims.append({
                'iccid': sim.get('iccid', ''),
                'lpa': sim.get('lpa', ''),
                'matching_id': sim.get('matching_id', ''),
                'activation_code': sim.get('activation_code', ''),
                'qrcode': sim.get('qrcode', ''),
                'qrcode_url': sim.get('qrcode_url', ''),
                'is_roaming': sim.get('is_roaming', False),
                'direct_apple_installation_url': sim.get('direct_apple_installation_url', ''),
            })
    
    # Extract country information from package/order data
    country_code = None
    country_name = None
    
    # Try to get country from package data
    if 'package' in order_data:
        package = order_data['package']
        if isinstance(package, dict):
            # Check for country in package
            if 'country' in package:
                country_info = package['country']
                if isinstance(country_info, dict):
                    country_code = country_info.get('code') or country_info.get('country_code')
                    country_name = country_info.get('name') or country_info.get('title')
                elif isinstance(country_info, str):
                    country_code = country_info
            # Check for country_code directly
            elif 'country_code' in package:
                country_code = package['country_code']
            # Check for countries array
            elif 'countries' in package and isinstance(package['countries'], list) and len(package['countries']) > 0:
                first_country = package['countries'][0]
                if isinstance(first_country, dict):
                    country_code = first_country.get('code') or first_country.get('country_code')
                    country_name = first_country.get('name') or first_country.get('title')
                elif isinstance(first_country, str):
                    country_code = first_country
    
    print(f"🌍 Extracted country from order: {country_name} ({country_code})")
    
    return {
        'data': {
            'id': order_data.get('id', ''),
            'package_id': package_id,
            'quantity': int(quantity),
            'type': order_data.get('type', 'sim'),
            'status': order_data.get('status', 'pending'),
            'price': float(order_data.get('price', 0)),
            'sims': sims,
            'created_at': order_data.get('created_at', ''),
            'package': order_data.get('package', {}),  # Include full package data
            'country_code': country_code,
            'country_name': country_name,
        }
    }

def convert_sdk_qr_to_response(sdk_response):
    """Convert Airalo SDK QR code response to our API format"""
    if not sdk_response or 'data' not in sdk_response:
        return None
    
    qr_data = sdk_response['data']
    
    return {
        'qrCode': qr_data.get('qr_code', ''),
        'lpa': qr_data.get('lpa', ''),
        'iccid': qr_data.get('iccid', ''),
        'activationCode': qr_data.get('activation_code', ''),
        'matchingId': qr_data.get('matching_id', ''),
        'smdpAddress': qr_data.get('smdp_address', ''),
        'qrCodeUrl': qr_data.get('qr_code_url', ''),
        'directAppleInstallationUrl': qr_data.get('direct_apple_installation_url', ''),
    }

# ============================================================================
# Health Check
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'mode': 'PRODUCTION',
        'message': 'Using Airalo Python SDK for real API operations',
        'sdk_initialized': alo is not None,
        'sdk_available': alo is not None
    })

# ============================================================================
# User Endpoints (Firebase Token Authentication)
# ============================================================================

@app.route('/api/user/order', methods=['POST'])
def create_user_order():
    """Create eSIM order using Airalo SDK"""
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
        print(f"🚀 Creating REAL order via Airalo SDK")
        print(f"{'='*80}")
        print(f"  User: {user['email']} ({user['uid']})")
        print(f"  Package: {package_id}")
        print(f"  Quantity: {quantity}")
        print(f"  To Email: {to_email}")
        print(f"{'='*80}")
        print(f"")
        
        # Create order using Airalo SDK
        try:
            sdk_response = alo.create_order(
                package_id=package_id,
                quantity=int(quantity),
                to_email=to_email
            )
            
            if not sdk_response:
                return jsonify({'success': False, 'error': 'Failed to create order via Airalo SDK'}), 500
            
            # Convert SDK response to our format
            order_result = convert_sdk_order_to_response(sdk_response, package_id, quantity)
            
            if not order_result:
                return jsonify({'success': False, 'error': 'Invalid response from Airalo SDK'}), 500
            
            airalo_order_id = order_result['data']['id']
            order_data = order_result['data']
            
            print(f"✅ Order created successfully: {airalo_order_id}")
            
            # Save order to Firestore
            firestore_order_data = {
                'userId': user['uid'],
                'userEmail': user['email'],
                'airaloOrderId': airalo_order_id,
                'packageId': package_id,
                'quantity': quantity,
                'status': order_data.get('status', 'pending'),
                'price': order_data.get('price', 0),
                'orderData': order_data,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'mode': 'production',
                'isTestMode': False
            }
            
            order_ref = db.collection('orders').add(firestore_order_data)
            order_id = order_ref[1].id
            
            # Log to api_usage for business dashboard
            api_usage_data = {
                'userId': user['uid'],
                'userEmail': user['email'],
                'endpoint': '/api/user/order',
                'method': 'POST',
                'mode': 'production',
                'packageId': package_id,
                'packageName': package_id,
                'orderId': order_id,
                'airaloOrderId': airalo_order_id,
                'amount': order_data.get('price', 0),
                'status': order_data.get('status', 'pending'),
                'isTestOrder': False,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'metadata': {
                    'quantity': quantity,
                    'iccid': order_data.get('sims', [{}])[0].get('iccid', '') if order_data.get('sims') else ''
                }
            }
            
            # Add to api_usage collection
            db.collection('api_usage').add(api_usage_data)
            print(f"✅ Logged to global api_usage collection")
            
            # Also add to user subcollection
            try:
                user_api_usage_ref = db.collection('business_users').document(user['uid']).collection('api_usage')
                user_api_usage_ref.add(api_usage_data)
                print(f"✅ Logged to user subcollection")
            except Exception as subcollection_error:
                print(f"⚠️ Warning: Could not save to user subcollection: {subcollection_error}")
            
            return jsonify({
                'success': True,
                'orderId': order_id,
                'airaloOrderId': airalo_order_id,
                'orderData': order_data,
                'isTestMode': False
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error creating order: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/qr-code', methods=['POST'])
def get_user_qr_code():
    """Get QR code using Airalo SDK"""
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
        
        print(f"🚀 Getting QR code via Airalo SDK for order: {order_id}")
        
        try:
            # Get order details first to get the matching_id
            order_doc = db.collection('orders').document(order_id).get()
            if not order_doc.exists:
                return jsonify({'success': False, 'error': 'Order not found'}), 404
            
            order_data = order_doc.to_dict()
            airalo_order_id = order_data.get('airaloOrderId')
            
            if not airalo_order_id:
                return jsonify({'success': False, 'error': 'Airalo order ID not found'}), 400
            
            # Try to get QR code from order data first (check multiple possible locations)
            print(f"🔍 Checking order data structure...")
            print(f"📦 Order data keys: {list(order_data.keys())}")
            
            # Check different possible locations for QR code data
            order_sims = None
            if 'orderData' in order_data and isinstance(order_data['orderData'], dict):
                order_sims = order_data['orderData'].get('sims', [])
            elif 'sims' in order_data:
                order_sims = order_data['sims']
            
            # Also check if QR code is stored directly in order
            direct_qr = order_data.get('qrCode') or order_data.get('qrcode') or order_data.get('lpa')
            
            if order_sims and len(order_sims) > 0:
                # QR code is already in the order data
                sim_data = order_sims[0]
                print(f"📱 Found SIM data in order: {list(sim_data.keys())}")
                qr_data = {
                    'qrCode': sim_data.get('qrcode', '') or sim_data.get('qrCode', ''),
                    'qrCodeUrl': sim_data.get('qrcode_url', '') or sim_data.get('qrCodeUrl', ''),
                    'lpa': sim_data.get('lpa', ''),
                    'iccid': sim_data.get('iccid', ''),
                    'activationCode': sim_data.get('activation_code', '') or sim_data.get('activationCode', ''),
                    'matchingId': sim_data.get('matching_id', '') or sim_data.get('matchingId', ''),
                }
                
                if qr_data.get('qrCode') or qr_data.get('lpa'):
                    print(f"✅ QR code found in order SIM data")
                    return jsonify({
                        'success': True,
                        **qr_data,
                        'isTestMode': False
                    })
            
            # Check for direct QR code in order
            if direct_qr:
                print(f"✅ QR code found directly in order data")
                return jsonify({
                    'success': True,
                    'qrCode': direct_qr,
                    'lpa': direct_qr if 'LPA:' in str(direct_qr) else '',
                    'iccid': order_data.get('iccid', ''),
                    'isTestMode': False
                })
            
            # If QR code not in order data, try to fetch from Airalo API
            print(f"🔄 QR code not in Firestore, attempting to fetch from Airalo API...")
            qr_found = False
            
            try:
                # Try to get order details from Airalo API using get_order
                if hasattr(alo, 'get_order'):
                    print(f"📡 Calling alo.get_order({airalo_order_id})")
                    order_response = alo.get_order(airalo_order_id)
                    print(f"📡 Order response received: {type(order_response)}")
                    
                    if order_response:
                        # Handle different response formats
                        order_info = None
                        if isinstance(order_response, dict):
                            if 'data' in order_response:
                                order_info = order_response['data']
                            else:
                                order_info = order_response
                        
                        if order_info:
                            sims = order_info.get('sims', [])
                            print(f"📱 Found {len(sims)} SIM(s) in order response")
                            
                            if sims and len(sims) > 0:
                                sim_data = sims[0]
                                print(f"📱 SIM data keys: {list(sim_data.keys())}")
                                
                                qr_data = {
                                    'qrCode': sim_data.get('qrcode', '') or sim_data.get('qrCode', ''),
                                    'qrCodeUrl': sim_data.get('qrcode_url', '') or sim_data.get('qrCodeUrl', ''),
                                    'lpa': sim_data.get('lpa', ''),
                                    'iccid': sim_data.get('iccid', ''),
                                    'activationCode': sim_data.get('activation_code', '') or sim_data.get('activationCode', ''),
                                    'matchingId': sim_data.get('matching_id', '') or sim_data.get('matchingId', ''),
                                }
                                
                                if qr_data.get('qrCode') or qr_data.get('lpa'):
                                    print(f"✅ QR code found in Airalo API order response")
                                    # Update Firestore order with QR code for future use
                                    try:
                                        order_ref = db.collection('orders').document(order_id)
                                        if 'orderData' not in order_data:
                                            order_ref.update({
                                                'orderData': {'sims': sims}
                                            })
                                        else:
                                            order_ref.update({
                                                'orderData.sims': sims
                                            })
                                        print(f"✅ Updated Firestore order with QR code data")
                                    except Exception as update_error:
                                        print(f"⚠️ Could not update Firestore: {update_error}")
                                    
                                    qr_found = True
                                    return jsonify({
                                        'success': True,
                                        **qr_data,
                                        'isTestMode': False
                                    })
                else:
                    print(f"⚠️ Airalo SDK does not have get_order method")
            except Exception as api_error:
                print(f"❌ Error fetching from Airalo API: {api_error}")
                import traceback
                traceback.print_exc()
            
            # Try alternative SDK methods if get_order didn't work
            if not qr_found:
                print(f"🔄 Trying alternative SDK methods...")
                sdk_response = None
                
                # Try get_qr_code
                try:
                    if hasattr(alo, 'get_qr_code'):
                        print(f"📡 Trying alo.get_qr_code({airalo_order_id})")
                        sdk_response = alo.get_qr_code(airalo_order_id)
                        if sdk_response:
                            print(f"✅ Got response from get_qr_code")
                except Exception as e:
                    print(f"❌ get_qr_code failed: {e}")
                
                # Try get_qrcode (alternative naming)
                if not sdk_response:
                    try:
                        if hasattr(alo, 'get_qrcode'):
                            print(f"📡 Trying alo.get_qrcode({airalo_order_id})")
                            sdk_response = alo.get_qrcode(airalo_order_id)
                            if sdk_response:
                                print(f"✅ Got response from get_qrcode")
                    except Exception as e:
                        print(f"❌ get_qrcode failed: {e}")
                
                # If we got a response, convert and return
                if sdk_response:
                    qr_data = convert_sdk_qr_to_response(sdk_response)
                    if qr_data:
                        return jsonify({
                            'success': True,
                            **qr_data,
                            'isTestMode': False
                        })
            
            # Final fallback - return error
            print(f"❌ QR code not found in any location")
            return jsonify({
                'success': False, 
                'error': 'QR code not available. The QR code was not found in order data and could not be retrieved from Airalo API. QR codes are typically available immediately after order creation. Please try again later or contact support.'
            }), 404
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error getting QR code: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/balance', methods=['GET'])
def get_user_balance():
    """Get user balance using Airalo SDK"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid authorization header'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        print(f"🚀 Getting balance via Airalo SDK for user {user['email']}")
        
        try:
            # Get balance using Airalo SDK
            sdk_response = alo.get_balance()
            
            if not sdk_response or 'data' not in sdk_response:
                return jsonify({'success': False, 'error': 'Failed to get balance via Airalo SDK'}), 500
            
            balance_data = sdk_response['data']
            balance = float(balance_data.get('balance', 0))
            minimum_required = float(balance_data.get('minimum_required', 4.0))
            
            return jsonify({
                'success': True,
                'balance': balance,
                'hasInsufficientFunds': balance < minimum_required,
                'minimumRequired': minimum_required,
                'mode': 'production'
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error getting balance: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# Business API Endpoints (API Key Authentication)
# ============================================================================

@app.route('/api/packages', methods=['GET'])
def get_packages():
    """Get packages list using Airalo SDK"""
    try:
        # Check for API key
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'Missing API key'}), 401
        
        # Authenticate API key
        user = authenticate_api_key(api_key)
        if not user:
            return jsonify({'success': False, 'error': 'Invalid API key'}), 401
        
        print(f"🚀 Getting packages via Airalo SDK for user {user['email']}")
        
        try:
            # Get all packages using Airalo SDK
            # Use flat=True to get a flat list of all packages
            packages = alo.get_all_packages(flat=True)
            
            if not packages or 'data' not in packages:
                return jsonify({'success': False, 'error': 'Failed to get packages via Airalo SDK'}), 500
            
            return jsonify(packages)
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error getting packages: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def categorize_plan(plan_data):
    """Categorize a plan as global, regional, or other based on its properties"""
    country_codes = plan_data.get('country_codes', []) or plan_data.get('country_ids', []) or []
    plan_type = plan_data.get('type', '').lower()
    plan_region = plan_data.get('region', '').lower() or plan_data.get('region_slug', '').lower()
    plan_name = (plan_data.get('name', '') or plan_data.get('title', '') or '').lower()
    plan_slug = (plan_data.get('slug', '') or '').lower()
    
    # Check if it's a global package (VERY STRICT - only based on type/region OR known global identifiers)
    is_global = (
        plan_type == 'global' or
        plan_region == 'global' or
        plan_slug == 'global' or
        plan_name == 'global' or
        plan_slug.startswith('discover') or  # Discover/Discover+ are Airalo's global packages
        plan_name.startswith('discover')
    )
    
    # Check if it's a regional package (check against known regional slugs/names)
    regional_identifiers = [
        'asia', 'europe', 'africa', 'americas', 'middle-east', 'middle east',
        'oceania', 'caribbean', 'latin-america', 'latin america',
        'north-america', 'south-america', 'central-america',
        'eastern-europe', 'western-europe', 'scandinavia',
        'asean', 'gcc', 'european-union', 'eu', 'mena',
        'middle-east-and-north-africa', 'middle-east-north-africa'
    ]
    
    is_regional = (
        plan_type == 'regional' or
        plan_slug in regional_identifiers or
        plan_name in regional_identifiers or
        (plan_region and plan_region != '' and plan_region != 'global' and plan_region in regional_identifiers)
    )
    
    if is_global:
        return 'global'
    elif is_regional:
        return 'regional'
    else:
        return 'other'

@app.route('/api/sync-packages', methods=['OPTIONS'])
def sync_packages_options():
    """Handle CORS preflight requests"""
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response, 200

@app.route('/api/sync-packages', methods=['POST'])
def sync_packages():
    """Sync packages from Airalo SDK to Firestore with global/regional categorization"""
    import sys
    try:
        # Check if Airalo SDK is available, try to reinitialize if not
        if alo is None:
            print("🔄 Attempting to reinitialize Airalo SDK...", flush=True)
            sys.stdout.flush()
            if initialize_airalo_sdk():
                print("✅ Airalo SDK reinitialized successfully", flush=True)
                sys.stdout.flush()
            else:
                print("❌ Airalo SDK reinitialization failed - Airalo API still unavailable", flush=True)
                sys.stderr.flush()
                return jsonify({
                    'success': False, 
                    'error': 'Airalo SDK is not available. The Airalo API appears to be down (502 Bad Gateway). Please try again later.'
                }), 503
        
        # Check for API key or Firebase token
        api_key = request.headers.get('X-API-Key')
        auth_header = request.headers.get('Authorization', '')
        
        user = None
        if api_key:
            user = authenticate_api_key(api_key)
        elif auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Unauthorized - API key or Firebase token required'}), 401
        
        print(f"🚀 Syncing packages via Airalo SDK for user {user.get('email', 'unknown')}")
        
        try:
            # Get all packages using Airalo SDK
            # Try without flat=True first (to get full package objects)
            packages_response = None
            try:
                # Prioritize flat=False to get full nested structure with sub-packages (needed for global/regional prices)
                packages_response = alo.get_all_packages(flat=False)
                print(f"📦 get_all_packages(flat=False) response type: {type(packages_response)}")
            except Exception as no_flat_error:
                print(f"⚠️ get_all_packages(flat=False) failed: {no_flat_error}")
                # Try without flat parameter
            try:
                packages_response = alo.get_all_packages()
                print(f"📦 get_all_packages() response type: {type(packages_response)}")
                # Check if we got strings instead of dicts
                if isinstance(packages_response, dict) and 'data' in packages_response:
                    sample = packages_response['data'][0] if isinstance(packages_response['data'], list) and len(packages_response['data']) > 0 else None
                    if sample and isinstance(sample, str):
                        print(f"⚠️ get_all_packages() returned strings, trying with flat=True")
                        # Try with flat=True as last resort
                        try:
                            packages_response = alo.get_all_packages(flat=True)
                            print(f"📦 get_all_packages(flat=True) response type: {type(packages_response)}")
                        except Exception as flat_error:
                            print(f"❌ get_all_packages(flat=True) also failed: {flat_error}")
            except Exception as default_error:
                print(f"⚠️ get_all_packages() failed: {default_error}")
                # Last resort: try flat=True
                try:
                    packages_response = alo.get_all_packages(flat=True)
                    print(f"📦 get_all_packages(flat=True) response type: {type(packages_response)}")
                except Exception as flat_error:
                    print(f"❌ get_all_packages(flat=True) also failed: {flat_error}")
                    return jsonify({
                        'success': False,
                        'error': f'Failed to get packages via Airalo SDK: {str(flat_error)}',
                        'debug_info': {
                            'no_flat_error': str(no_flat_error),
                            'flat_error': str(flat_error)
                        }
                    }), 500
            
            if not packages_response:
                return jsonify({
                    'success': False,
                    'error': 'Airalo SDK returned empty response',
                    'debug_info': {
                        'response': None
                    }
                }), 500
            
            # Handle different response formats
            if isinstance(packages_response, list):
                # SDK returned a list directly
                packages_data = packages_response
                print(f"📦 SDK returned list directly with {len(packages_data)} items")
            elif isinstance(packages_response, dict):
                # Check for 'data' key
                if 'data' in packages_response:
                    packages_data = packages_response['data']
                elif 'packages' in packages_response:
                    packages_data = packages_response['packages']
                else:
                    # Return the whole response structure for debugging
                    return jsonify({
                        'success': False,
                        'error': 'Unexpected SDK response structure',
                        'debug_info': {
                            'response_keys': list(packages_response.keys()),
                            'response_sample': str(packages_response)[:1000]
                        }
                    }), 500
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unexpected SDK response type: {type(packages_response).__name__}',
                    'debug_info': {
                        'response_type': type(packages_response).__name__,
                        'response_sample': str(packages_response)[:500]
                    }
                }), 500
            
            # Debug: Log the structure we received
            print(f"📦 SDK Response type: {type(packages_response)}")
            if isinstance(packages_response, dict):
                print(f"📦 SDK Response keys: {list(packages_response.keys())}")
            print(f"📦 Packages data type: {type(packages_data)}")
            print(f"📦 Packages data length: {len(packages_data) if isinstance(packages_data, list) else 'N/A'}")
            
            if not isinstance(packages_data, list):
                # Try to extract packages from nested structure
                if isinstance(packages_data, dict):
                    # Check if packages are nested in the response
                    if 'packages' in packages_data:
                        packages_data = packages_data['packages']
                    elif 'data' in packages_data:
                        packages_data = packages_data['data']
                    else:
                        # Try to find any list in the response
                        for key, value in packages_data.items():
                            if isinstance(value, list) and len(value) > 0:
                                print(f"📦 Found list in key '{key}' with {len(value)} items")
                                packages_data = value
                                break
                
                if not isinstance(packages_data, list):
                    print(f"❌ Invalid packages data format. Expected list, got {type(packages_data)}")
                    print(f"📦 Sample data: {str(packages_data)[:500]}")
                    return jsonify({
                        'success': False, 
                        'error': f'Invalid packages data format: expected list, got {type(packages_data).__name__}',
                        'debug_info': {
                            'response_type': type(packages_response).__name__,
                            'data_type': type(packages_data).__name__,
                            'sample_keys': list(packages_data.keys())[:10] if isinstance(packages_data, dict) else None
                        }
                    }), 500
            
            print(f"📦 Received {len(packages_data)} packages from Airalo SDK")
            
            if len(packages_data) == 0:
                print(f"⚠️ Warning: No packages found in SDK response")
                return jsonify({
                    'success': False,
                    'error': 'No packages found in Airalo SDK response. The SDK may be returning an empty list.',
                    'debug_info': {
                        'response_structure': list(packages_response.keys()) if isinstance(packages_response, dict) else 'N/A'
                    }
                }), 500
            
            # Get markup percentage from Firestore config (default 17%)
            markup_percentage = 17
            try:
                markup_config = db.collection('config').document('pricing').get()
                if markup_config.exists:
                    markup_data = markup_config.to_dict()
                    markup_percentage = markup_data.get('markup_percentage', 17)
            except Exception as e:
                print(f"⚠️ Could not load markup config, using default 17%: {e}")
            
            print(f"💰 Using markup percentage: {markup_percentage}%")
            
            # Process and save packages
            synced_count = 0
            global_count = 0
            regional_count = 0
            other_count = 0
            batch = db.batch()
            batch_count = 0
            MAX_BATCH_SIZE = 500  # Firestore batch limit
            
            for idx, pkg in enumerate(packages_data):
                try:
                    # Debug first 5 packages to understand structure - CHECK ALL FIELDS FOR TOPUP
                    if idx < 5:
                        print(f"\n{'='*80}")
                        print(f"📦 PACKAGE {idx} FULL STRUCTURE (CHECKING FOR TOPUP FIELDS):")
                        print(f"{'='*80}")
                        print(f"Type: {type(pkg)}")
                        if isinstance(pkg, dict):
                            print(f"ALL KEYS: {list(pkg.keys())}")
                            print(f"ID: {pkg.get('id')}")
                            print(f"Slug: {pkg.get('slug')}")
                            print(f"Name/Title: {pkg.get('name') or pkg.get('title')}")
                            print(f"Type field: {pkg.get('type')}")
                            print(f"Region field: {pkg.get('region')}")
                            print(f"Region slug: {pkg.get('region_slug')}")
                            print(f"Country codes: {pkg.get('country_codes')}")
                            print(f"Countries: {pkg.get('countries')}")
                            print(f"Price: {pkg.get('price')}")
                            # CHECK FOR TOPUP-RELATED FIELDS
                            print(f"🔍 TOPUP FIELDS CHECK:")
                            print(f"   is_topup: {pkg.get('is_topup')}")
                            print(f"   topup: {pkg.get('topup')}")
                            print(f"   isTopup: {pkg.get('isTopup')}")
                            print(f"   topup_enabled: {pkg.get('topup_enabled')}")
                            print(f"   can_topup: {pkg.get('can_topup')}")
                            print(f"   supports_topup: {pkg.get('supports_topup')}")
                            print(f"   package_type: {pkg.get('package_type')}")
                            print(f"   category: {pkg.get('category')}")
                            print(f"Has 'packages' key: {'packages' in pkg}")
                            print(f"Has 'sub_packages' key: {'sub_packages' in pkg}")
                            if 'packages' in pkg:
                                print(f"Packages value type: {type(pkg.get('packages'))}")
                                if isinstance(pkg.get('packages'), list):
                                    print(f"Number of sub-packages: {len(pkg.get('packages'))}")
                            print(f"Full package JSON: {json.dumps(pkg, indent=2, default=str)[:1000]}")
                        print(f"{'='*80}\n")
                    
                    # Handle different package formats
                    if isinstance(pkg, str):
                        # Package is just a string (ID or slug) - need to fetch full details
                        package_id = pkg
                        print(f"⚠️ Package {idx} is a string (ID only): {package_id}. Skipping - need full package data.")
                        # TODO: Could fetch individual package details here if SDK supports it
                        continue
                    elif isinstance(pkg, dict):
                        # Extract package data - try multiple possible fields
                        package_id = (pkg.get('id') or 
                                     pkg.get('slug') or 
                                     pkg.get('package_id') or
                                     (pkg.get('data', {}).get('id') if isinstance(pkg.get('data'), dict) else None))
                        
                        if not package_id:
                            print(f"⚠️ Skipping package {idx}: No ID found. Keys: {list(pkg.keys())}")
                            continue
                    else:
                        print(f"⚠️ Skipping package {idx}: Unexpected type {type(pkg)}. Value: {str(pkg)[:100]}")
                        continue
                    
                    # Extract country codes - handle various formats (only if pkg is dict)
                    country_codes = []
                    if isinstance(pkg, dict):
                        if isinstance(pkg.get('countries'), list):
                            country_codes = [c.get('country_code') or c.get('code') or c for c in pkg.get('countries', []) if c]
                        elif pkg.get('country_code'):
                            country_codes = [pkg.get('country_code')]
                        elif isinstance(pkg.get('country_codes'), list):
                            country_codes = pkg.get('country_codes')
                        elif pkg.get('country'):
                            # Single country object
                            country = pkg.get('country')
                            if isinstance(country, dict):
                                country_codes = [country.get('code') or country.get('country_code')]
                            elif isinstance(country, str):
                                country_codes = [country]
                    
                    # Prepare plan data for categorization
                    plan_data = {
                        'country_codes': country_codes,
                        'type': pkg.get('type', ''),
                        'region': pkg.get('region', '') or pkg.get('region_slug', ''),
                        'name': pkg.get('name', '') or pkg.get('title', '')
                    }
                    
                    # Categorize the plan
                    category = categorize_plan(plan_data)
                    
                    # Debug: Log all packages with their category
                    if idx < 20:  # Log first 20 packages to find global
                        print(f"📋 Package {idx}: '{pkg.get('name') or pkg.get('title')}' (slug: {pkg.get('slug')}) → Category: {category}")
                        print(f"   type={pkg.get('type')}, region={pkg.get('region')}, slug={pkg.get('slug')}")
                    
                    if category == 'global':
                        global_count += 1
                        print(f"🌍 GLOBAL package found: '{pkg.get('name') or pkg.get('title')}' (slug: {pkg.get('slug')})")
                    elif category == 'regional':
                        regional_count += 1
                    else:
                        other_count += 1
                    
                    # Calculate price with markup - check multiple possible price fields
                    # Try various price field names that Airalo SDK might use
                    price_fields = [
                        pkg.get('price'),
                        pkg.get('retail_price'),
                        pkg.get('amount'),
                        pkg.get('cost'),
                        pkg.get('base_price'),
                        pkg.get('starting_price'),
                        pkg.get('min_price'),
                        pkg.get('pricing', {}).get('price') if isinstance(pkg.get('pricing'), dict) else None,
                        pkg.get('pricing', {}).get('retail_price') if isinstance(pkg.get('pricing'), dict) else None,
                        pkg.get('pricing', {}).get('amount') if isinstance(pkg.get('pricing'), dict) else None,
                        pkg.get('pricing', {}).get('base_price') if isinstance(pkg.get('pricing'), dict) else None,
                        pkg.get('pricing', {}).get('starting_price') if isinstance(pkg.get('pricing'), dict) else None,
                        pkg.get('pricing', {}).get('min_price') if isinstance(pkg.get('pricing'), dict) else None,
                    ]
                    
                    # Check for sub-packages that might have prices (for global/regional parent packages)
                    # According to Airalo SDK docs, global/regional packages have nested packages array
                    sub_packages = []
                    
                    # Try multiple ways to get sub-packages
                    if isinstance(pkg.get('packages'), list):
                        sub_packages = pkg.get('packages')
                    elif isinstance(pkg.get('sub_packages'), list):
                        sub_packages = pkg.get('sub_packages')
                    elif isinstance(pkg.get('children'), list):
                        sub_packages = pkg.get('children')
                    elif isinstance(pkg.get('operators'), list):
                        # Extract packages from operators array (for regional/global packages)
                        operators = pkg.get('operators', [])
                        for operator in operators:
                            if isinstance(operator, dict) and 'packages' in operator:
                                if isinstance(operator['packages'], list):
                                    sub_packages.extend(operator['packages'])
                    elif isinstance(pkg.get('data'), list):
                        # When flat=False, packages might be in data array
                        sub_packages = pkg.get('data')
                    elif isinstance(pkg.get('data'), dict):
                        # Check if data is a dict with packages inside
                        if 'packages' in pkg.get('data'):
                            sub_packages = pkg.get('data').get('packages', [])
                        elif 'data' in pkg.get('data'):
                            # Nested data structure
                            nested_data = pkg.get('data').get('data')
                            if isinstance(nested_data, list):
                                sub_packages = nested_data
                    
                    # Debug: Log sub-packages found for global/regional
                    if (category == 'global' or category == 'regional') and len(sub_packages) > 0:
                        print(f"🔍 {category.upper()} package '{pkg.get('name') or pkg.get('title')}' has {len(sub_packages)} sub-packages")
                        if len(sub_packages) > 0 and isinstance(sub_packages[0], dict):
                            print(f"   First sub-package keys: {list(sub_packages[0].keys())}")
                            print(f"   First sub-package sample: {str(sub_packages[0])[:300]}")
                    
                    # For global/regional packages with sub-packages, save each sub-package as a separate plan
                    if isinstance(sub_packages, list) and len(sub_packages) > 0 and (category == 'global' or category == 'regional'):
                        print(f"📦 Processing {len(sub_packages)} sub-packages for {category} package '{pkg.get('name') or pkg.get('title')}'")
                        
                        for idx, sub_pkg in enumerate(sub_packages):
                            if not isinstance(sub_pkg, dict):
                                continue
                            
                            try:
                                # Generate unique ID for sub-package
                                sub_package_id = f"{package_id}_{idx}"
                                if sub_pkg.get('id'):
                                    sub_package_id = f"{package_id}_{sub_pkg.get('id')}"
                                
                                # Extract price for this sub-package
                                sub_price_fields = [
                                    sub_pkg.get('price'),
                                    sub_pkg.get('retail_price'),
                                    sub_pkg.get('amount'),
                                    sub_pkg.get('cost'),
                                    sub_pkg.get('base_price'),
                                    sub_pkg.get('starting_price'),
                                    sub_pkg.get('min_price'),
                                ]
                                
                                # Check nested pricing object
                                if isinstance(sub_pkg.get('pricing'), dict):
                                    pricing_obj = sub_pkg.get('pricing')
                                    sub_price_fields.extend([
                                        pricing_obj.get('price'),
                                        pricing_obj.get('retail_price'),
                                        pricing_obj.get('amount'),
                                        pricing_obj.get('base_price'),
                                        pricing_obj.get('starting_price'),
                                        pricing_obj.get('min_price'),
                                    ])
                                
                                # Check data object
                                if isinstance(sub_pkg.get('data'), dict):
                                    data_obj = sub_pkg.get('data')
                                    sub_price_fields.extend([
                                        data_obj.get('price'),
                                        data_obj.get('retail_price'),
                                        data_obj.get('amount'),
                                        data_obj.get('cost'),
                                    ])
                                
                                # Find first valid price
                                sub_original_price = 0
                                for sub_price in sub_price_fields:
                                    if sub_price is not None:
                                        try:
                                            sub_price_value = float(sub_price)
                                            if sub_price_value > 0:
                                                sub_original_price = sub_price_value
                                                break
                                        except (ValueError, TypeError):
                                            continue
                                
                                if sub_original_price == 0:
                                    print(f"⚠️ Sub-package {idx} has no valid price, skipping")
                                    continue
                                
                                sub_retail_price = round(sub_original_price * (1 + markup_percentage / 100), 2)
                                
                                # Get data amount for this sub-package
                                sub_capacity = sub_pkg.get('capacity') or sub_pkg.get('amount') or sub_pkg.get('data') or 0
                                sub_period = sub_pkg.get('period') or sub_pkg.get('day') or sub_pkg.get('validity') or pkg.get('period') or 0
                                
                                # Create unique name for sub-package - prefer sub_pkg title, then construct from parent name
                                parent_name = pkg.get('name') or pkg.get('title') or 'Regional'
                                sub_name = (sub_pkg.get('name') or 
                                           sub_pkg.get('title') or 
                                           f"{parent_name} - {sub_capacity}GB")
                                
                                # Prepare Firestore document for sub-package
                                sub_plan_ref = db.collection('dataplans').document(sub_package_id)
                                sub_plan_doc = {
                                    'slug': sub_package_id,
                                    'name': sub_name,
                                    'description': sub_pkg.get('description') or pkg.get('description') or pkg.get('short_info') or '',
                                    'price': sub_retail_price,
                                    'original_price': sub_original_price,
                                    'currency': sub_pkg.get('currency') or pkg.get('currency', 'USD'),
                                    'country_codes': country_codes,
                                    'country_ids': country_codes,
                                    'capacity': sub_capacity,
                                    'period': sub_period,
                                    'operator': sub_pkg.get('operator') or pkg.get('operator') or '',
                                    'status': 'active',
                                    'type': category,
                                    'is_global': category == 'global',
                                    'is_regional': category == 'regional',
                                    'region': pkg.get('region') or pkg.get('region_slug') or '',
                                    'parent_package_id': package_id,  # Link to parent package
                                    'updated_at': firestore.SERVER_TIMESTAMP,
                                    'synced_at': firestore.SERVER_TIMESTAMP,
                                    'updated_by': 'sdk_sync',
                                    'provider': 'airalo',
                                    'enabled': True,
                                    'is_roaming': sub_pkg.get('is_roaming') or pkg.get('is_roaming', False),
                                    'data': sub_pkg.get('data') or pkg.get('data', ''),
                                    'voice': sub_pkg.get('voice') or pkg.get('voice'),
                                    'text': sub_pkg.get('text') or pkg.get('text'),
                                }
                                
                                batch.set(sub_plan_ref, sub_plan_doc, merge=True)
                                batch_count += 1
                                synced_count += 1
                                
                                print(f"  ✅ Sub-package {idx}: {sub_name} - ${sub_retail_price} ({sub_capacity}GB, {sub_period}d)")
                                
                                # Commit batch if it reaches the limit
                                if batch_count >= MAX_BATCH_SIZE:
                                    batch.commit()
                                    print(f"✅ Committed batch of {batch_count} packages")
                                    batch = db.batch()
                                    batch_count = 0
                                    
                            except Exception as sub_pkg_error:
                                print(f"⚠️ Error processing sub-package {idx}: {sub_pkg_error}")
                                continue
                        
                        # Now save the parent package itself (without price, as it's a container)
                        print(f"✅ Processed {category} package '{pkg.get('name')}' with {len(sub_packages)} sub-packages")
                        
                        # Save parent package as a container/grouping package
                        parent_plan_ref = db.collection('dataplans').document(package_id)
                        parent_plan_doc = {
                            'slug': package_id,
                            'name': pkg.get('name') or pkg.get('title') or 'Unnamed Plan',
                            'description': pkg.get('description') or pkg.get('short_info') or '',
                            'price': 0,  # Parent package has no direct price
                            'original_price': 0,
                            'currency': pkg.get('currency', 'USD'),
                            'country_codes': country_codes,
                            'country_ids': country_codes,
                            'capacity': 0,  # Parent has no direct capacity
                            'period': 0,  # Parent has no direct period
                            'operator': pkg.get('operator') or '',
                            'status': 'active',
                            'type': category,
                            'is_global': category == 'global',
                            'is_regional': category == 'regional',
                            'region': pkg.get('region') or pkg.get('region_slug') or '',
                            'is_parent': True,  # Mark as parent package
                            'child_count': len(sub_packages),
                            'updated_at': firestore.SERVER_TIMESTAMP,
                            'synced_at': firestore.SERVER_TIMESTAMP,
                            'updated_by': 'sdk_sync',
                            'provider': 'airalo',
                            'enabled': True,
                        }
                        
                        batch.set(parent_plan_ref, parent_plan_doc, merge=True)
                        batch_count += 1
                        synced_count += 1
                        
                        # Commit batch if it reaches the limit
                        if batch_count >= MAX_BATCH_SIZE:
                            batch.commit()
                            print(f"✅ Committed batch of {batch_count} packages")
                            batch = db.batch()
                            batch_count = 0
                        
                        continue  # Skip to next package (already processed this one)
                    
                    # Also check if there's a price_range or price_info object
                    if isinstance(pkg.get('price_range'), dict):
                        price_range = pkg.get('price_range')
                        price_fields.extend([
                            price_range.get('min'),
                            price_range.get('max'),
                            price_range.get('starting'),
                            price_range.get('base'),
                        ])
                    
                    if isinstance(pkg.get('price_info'), dict):
                        price_info = pkg.get('price_info')
                        price_fields.extend([
                            price_info.get('price'),
                            price_info.get('retail_price'),
                            price_info.get('amount'),
                            price_info.get('min_price'),
                            price_info.get('starting_price'),
                        ])
                    
                    # Find first non-zero, non-None price
                    original_price = 0
                    for price_field in price_fields:
                        if price_field is not None:
                            try:
                                price_value = float(price_field)
                                if price_value > 0:
                                    original_price = price_value
                                    break
                            except (ValueError, TypeError):
                                continue
                    
                    # Debug logging for global/regional packages with missing prices
                    if original_price == 0 and (category == 'global' or category == 'regional'):
                        print(f"⚠️ {category.upper()} package '{pkg.get('name') or pkg.get('title')}' (ID: {package_id}) has no price found")
                        print(f"   Available keys: {list(pkg.keys())}")
                        print(f"   Price fields checked: price={pkg.get('price')}, retail_price={pkg.get('retail_price')}, amount={pkg.get('amount')}, cost={pkg.get('cost')}")
                        if 'pricing' in pkg:
                            print(f"   Pricing object: {pkg.get('pricing')}")
                        if sub_packages:
                            print(f"   Sub-packages found: {len(sub_packages)} (but no prices extracted)")
                            if len(sub_packages) > 0 and isinstance(sub_packages[0], dict):
                                print(f"   First sub-package keys: {list(sub_packages[0].keys())}")
                                print(f"   First sub-package full structure: {json.dumps(sub_packages[0], indent=2, default=str)[:1000]}")
                        else:
                            print(f"   ⚠️ No sub-packages found! This might be why price is missing.")
                            print(f"   Package structure: {json.dumps({k: str(v)[:100] for k, v in list(pkg.items())[:10]}, indent=2)}")
                    
                    retail_price = round(original_price * (1 + markup_percentage / 100), 2)
                    
                    # Detect if this is a topup-specific package
                    # Check multiple indicators:
                    # 1. Slug patterns (e.g., "ruski-telecom-in-7days-1gb" - "in" might indicate topup)
                    # 2. Type field
                    # 3. Name/title patterns
                    # 4. Explicit topup flags
                    package_slug = package_id.lower()
                    package_name = (pkg.get('name') or pkg.get('title') or '').lower()
                    package_type = (pkg.get('type') or '').lower()
                    
                    # Check for topup indicators
                    is_topup_package = False
                    topup_indicators = []
                    
                    # Check explicit flags
                    if pkg.get('is_topup') == True or pkg.get('topup') == True:
                        is_topup_package = True
                        topup_indicators.append('explicit_flag')
                    
                    # Check type field
                    if 'topup' in package_type or 'top-up' in package_type:
                        is_topup_package = True
                        topup_indicators.append('type_field')
                    
                    # Check slug patterns for topup detection
                    # Regional/Global packages often have slugs like "africa_hello-africa-30days-3gb-topup"
                    # Country packages DON'T have "-topup" suffix, so only check for regional/global
                    if category == 'regional' or category == 'global':
                        # Regional/Global packages with "-topup" in slug are topup packages
                        if '-topup' in package_slug or '-topup-' in package_slug or package_slug.endswith('-topup'):
                            is_topup_package = True
                            topup_indicators.append('slug_pattern_regional_topup')
                        # Also check for "-in-" or "-for-" patterns in regional/global packages
                        elif '-in-' in package_slug or '-for-' in package_slug:
                            is_topup_package = True
                            topup_indicators.append('slug_pattern_regional')
                    # Country packages: don't check slug patterns (they don't have "-topup" suffix)
                    # Country packages are topup-compatible if they have country codes, but not marked as "topup packages"
                    
                    # Check name patterns
                    if 'topup' in package_name or 'top-up' in package_name or 'add-on' in package_name:
                        is_topup_package = True
                        topup_indicators.append('name_pattern')
                    
                    # Log topup detection for first few packages or all topup packages
                    if synced_count < 20 or is_topup_package:
                        print(f"🔍 Topup Detection for '{pkg.get('name') or pkg.get('title')}' (slug: {package_id}):")
                        print(f"   Category: {category}")
                        print(f"   is_topup flag: {pkg.get('is_topup')}")
                        print(f"   topup flag: {pkg.get('topup')}")
                        print(f"   type: {package_type}")
                        print(f"   slug: {package_slug}")
                        print(f"   name: {package_name}")
                        print(f"   Detected as topup: {is_topup_package}")
                        if topup_indicators:
                            print(f"   Indicators: {', '.join(topup_indicators)}")
                        if is_topup_package:
                            print(f"   ✅ This is a TOPUP package (slug contains/ends with '-topup')")
                        print(f"   All package keys: {list(pkg.keys())[:20]}")
                    
                    # Determine availability based on package type
                    # IMPORTANT: Purchase and Topup packages are DIFFERENT:
                    # - Purchase packages: Regular packages (e.g., "africa_hello-africa-30days-1gb")
                    # - Topup packages: Have "-topup" suffix (e.g., "africa_hello-africa-30days-1gb-topup")
                    # 
                    # Packages CANNOT be both purchase AND topup - they are separate packages
                    if is_topup_package:
                        # This is a TOPUP package (has "-topup" suffix)
                        available_for_purchase = False  # Topup packages are NOT for purchase
                        available_for_topup = True  # Topup packages are for topup
                        print(f"   ✅ TOPUP package - available_for_topup=True, available_for_purchase=False")
                    else:
                        # This is a PURCHASE package (no "-topup" suffix)
                        available_for_purchase = True  # Purchase packages are for purchase
                        available_for_topup = False  # Purchase packages are NOT for topup (they have separate topup versions)
                        print(f"   ✅ PURCHASE package - available_for_purchase=True, available_for_topup=False")
                    
                    if is_topup_package:
                        print(f"   ✅ Marked as TOPUP package (slug has '-topup' suffix)")
                    if len(country_codes) > 0:
                        print(f"   ✅ Package with {len(country_codes)} country codes - available_for_topup={available_for_topup}")
                    else:
                        print(f"   ⚠️ Package has no country codes - NOT available for topup")
                    
                    # Prepare Firestore document
                    plan_ref = db.collection('dataplans').document(package_id)
                    
                    # Check if plan already exists to preserve admin settings
                    existing_plan = plan_ref.get()
                    existing_available_for_purchase = available_for_purchase
                    existing_available_for_topup = available_for_topup
                    existing_is_topup_package = is_topup_package
                    
                    if existing_plan.exists:
                        existing_data = existing_plan.to_dict()
                        # Preserve admin-set purchase availability if it exists
                        if 'available_for_purchase' in existing_data and not is_topup_package:
                            existing_available_for_purchase = existing_data['available_for_purchase']
                        
                        # CRITICAL: Purchase and Topup are MUTUALLY EXCLUSIVE
                        # - Topup packages (with "-topup" suffix): available_for_topup=True, available_for_purchase=False
                        # - Purchase packages (no "-topup" suffix): available_for_purchase=True, available_for_topup=False
                        # Only preserve admin settings if they don't conflict with package type
                        if is_topup_package:
                            # This is a topup package - enforce topup-only
                            existing_available_for_purchase = False
                            existing_available_for_topup = True
                            print(f"   📝 Enforcing TOPUP package: available_for_topup=True, available_for_purchase=False")
                        else:
                            # This is a purchase package - enforce purchase-only (unless admin overrode)
                            if 'available_for_purchase' in existing_data:
                                existing_available_for_purchase = existing_data['available_for_purchase']
                            else:
                                existing_available_for_purchase = True  # Default to purchase
                            
                            # Purchase packages are NOT for topup (they have separate topup versions)
                            existing_available_for_topup = False
                            print(f"   📝 Enforcing PURCHASE package: available_for_purchase={existing_available_for_purchase}, available_for_topup=False")
                        
                        # Preserve is_topup_package flag if it was manually set
                        if 'is_topup_package' in existing_data:
                            existing_is_topup_package = existing_data['is_topup_package']
                            # If it was manually set as topup, ensure availability matches (both purchase and topup)
                            if existing_is_topup_package:
                                existing_available_for_purchase = True  # Topup packages can be purchased
                                existing_available_for_topup = True  # Topup packages are for topup
                    
                    plan_doc = {
                        'slug': package_id,
                        'name': pkg.get('name') or pkg.get('title') or 'Unnamed Plan',
                        'description': pkg.get('description') or pkg.get('short_info') or '',
                        'price': retail_price,
                        'original_price': original_price,
                        'currency': pkg.get('currency', 'USD'),
                        'country_codes': country_codes,
                        'country_ids': country_codes,  # For compatibility
                        'capacity': pkg.get('capacity') or pkg.get('amount') or 0,
                        'period': pkg.get('period') or pkg.get('day') or 0,
                        'operator': pkg.get('operator') or '',
                        'status': 'active',
                        'type': category,  # Add categorization
                        'is_global': category == 'global',
                        'is_regional': category == 'regional',
                        'region': pkg.get('region') or pkg.get('region_slug') or '',
                        'updated_at': firestore.SERVER_TIMESTAMP,
                        'synced_at': firestore.SERVER_TIMESTAMP,
                        'updated_by': 'sdk_sync',
                        'provider': 'airalo',
                        'enabled': True,  # Default to enabled
                        # Purchase/Topup availability - preserve admin settings if they exist
                        'available_for_purchase': existing_available_for_purchase,
                        'available_for_topup': existing_available_for_topup,
                        # Mark if this is a topup-specific package (use detected or existing value)
                        'is_topup_package': existing_is_topup_package if existing_plan.exists else is_topup_package,
                        # Topup compatibility - all packages are topup-compatible if they have country codes
                        'is_topup_compatible': len(country_codes) > 0,
                        'topup_compatible': True,  # Alias for easier querying
                        # Additional fields
                        'is_roaming': pkg.get('is_roaming', False),
                        'data': pkg.get('data', ''),
                        'data_amount': pkg.get('capacity') or pkg.get('amount') or pkg.get('data') or '',
                        'validity': pkg.get('period') or pkg.get('day') or pkg.get('validity') or pkg.get('days') or '',
                        'days': pkg.get('days') or pkg.get('day') or pkg.get('period') or 0,
                        'voice': pkg.get('voice'),
                        'text': pkg.get('text'),
                    }
                    
                    batch.set(plan_ref, plan_doc, merge=True)
                    batch_count += 1
                    synced_count += 1
                    
                    # Commit batch if it reaches the limit
                    if batch_count >= MAX_BATCH_SIZE:
                        batch.commit()
                        print(f"✅ Committed batch of {batch_count} packages")
                        batch = db.batch()
                        batch_count = 0
                    
                except Exception as pkg_error:
                    print(f"⚠️ Error processing package {pkg.get('id', 'unknown')}: {pkg_error}")
                    continue
            
            # Commit remaining batch
            if batch_count > 0:
                batch.commit()
                print(f"✅ Committed final batch of {batch_count} packages")
            print(f"✅ Successfully synced {synced_count} packages to Firestore")
            print(f"   - Global: {global_count}")
            print(f"   - Regional: {regional_count}")
            print(f"   - Other: {other_count}")
            
            # Create sync log
            log_ref = db.collection('sync_logs').document()
            log_ref.set({
                'timestamp': firestore.SERVER_TIMESTAMP,
                'plans_synced': synced_count,
                'global_count': global_count,
                'regional_count': regional_count,
                'other_count': other_count,
                'status': 'completed',
                'source': 'sdk_sync',
                'sync_type': 'packages_sync',
                'provider': 'airalo',
                'user_email': user.get('email', 'unknown')
            })
            
            return jsonify({
                'success': True,
                'message': f'Successfully synced {synced_count} packages',
                'total_synced': synced_count,
                'global_count': global_count,
                'regional_count': regional_count,
                'other_count': other_count,
                'details': {
                    'plans_synced': synced_count,
                    'categorization': {
                        'global': global_count,
                        'regional': regional_count,
                        'other': other_count
                    }
                }
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error syncing packages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync-topup-packages', methods=['OPTIONS'])
def sync_topup_packages_options():
    """Handle CORS preflight requests"""
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response, 200

@app.route('/api/sync-topup-packages', methods=['POST'])
def sync_topup_packages():
    """
    Sync ONLY topup packages (packages with '-topup' suffix) from Airalo SDK
    This endpoint filters and syncs only topup-specific packages
    """
    try:
        # Optional authentication
        user = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            try:
                user = authenticate_firebase_token(id_token)
                if user:
                    print(f"🔐 Authenticated user: {user.get('email')}")
            except Exception as auth_error:
                print(f"⚠️ Authentication failed: {auth_error}")
                return jsonify({'success': False, 'error': 'Authentication failed'}), 401
        
        if not user:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        print("=" * 80)
        print("🔄 SYNC TOPUP PACKAGES STARTED")
        print("=" * 80)
        
        # Get all packages from Airalo SDK
        print(f"📦 Fetching packages from Airalo SDK...")
        packages_response = None
        
        try:
            packages_response = alo.get_all_packages()
            print(f"📦 get_all_packages() response type: {type(packages_response)}")
        except Exception as default_error:
            print(f"⚠️ get_all_packages() failed: {default_error}")
            try:
                packages_response = alo.get_all_packages(flat=True)
                print(f"📦 get_all_packages(flat=True) response type: {type(packages_response)}")
            except Exception as flat_error:
                print(f"❌ get_all_packages(flat=True) also failed: {flat_error}")
                return jsonify({'success': False, 'error': f'Failed to get packages from Airalo SDK: {str(flat_error)}'}), 500
        
        if not packages_response:
            print(f"❌ Airalo SDK returned empty response")
            return jsonify({'success': False, 'error': 'Airalo SDK returned empty response'}), 500
        
        # Handle different response formats
        packages_data = None
        if isinstance(packages_response, list):
            packages_data = packages_response
        elif isinstance(packages_response, dict):
            if 'packages' in packages_response:
                packages_data = packages_response['packages']
            elif 'data' in packages_response:
                packages_data = packages_response['data']
            else:
                # Try to find any list in the response
                for key, value in packages_response.items():
                    if isinstance(value, list) and len(value) > 0:
                        packages_data = value
                        print(f"📦 Found list in key '{key}' with {len(value)} items")
                        break
        
        if not packages_data:
            return jsonify({'success': False, 'error': f'Invalid packages data format: expected list or dict, got {type(packages_response).__name__}'}), 500
        
        if not isinstance(packages_data, list):
            return jsonify({'success': False, 'error': f'Invalid packages data format: expected list, got {type(packages_data).__name__}'}), 500
        
        print(f"📦 Received {len(packages_data)} total packages from Airalo SDK")
        
        # FILTER: Only process packages with '-topup' in slug
        topup_packages = []
        for pkg in packages_data:
            if isinstance(pkg, dict):
                package_id = (pkg.get('id') or pkg.get('slug') or '').lower()
                if '-topup' in package_id or package_id.endswith('-topup'):
                    topup_packages.append(pkg)
        
        print(f"✅ Filtered {len(topup_packages)} topup packages (with '-topup' suffix)")
        
        if len(topup_packages) == 0:
            return jsonify({
                'success': True,
                'total_synced': 0,
                'topup_count': 0,
                'message': 'No topup packages found (packages with "-topup" suffix)'
            })
        
        # Get markup percentage from Firestore config (default 17%)
        markup_percentage = 17
        try:
            markup_config = db.collection('config').document('pricing').get()
            if markup_config.exists:
                markup_data = markup_config.to_dict()
                markup_percentage = markup_data.get('markup_percentage', 17)
        except Exception as e:
            print(f"⚠️ Could not load markup config, using default 17%: {e}")
        
        print(f"💰 Using markup percentage: {markup_percentage}%")
        
        # Process and save ONLY topup packages
        synced_count = 0
        batch = db.batch()
        batch_count = 0
        MAX_BATCH_SIZE = 500
        
        for idx, pkg in enumerate(topup_packages):
            try:
                if not isinstance(pkg, dict):
                    continue
                
                package_id = (pkg.get('id') or pkg.get('slug') or '').lower()
                if not package_id or '-topup' not in package_id:
                    continue  # Skip if not a topup package
                
                # Extract country codes
                country_codes = []
                if isinstance(pkg.get('countries'), list):
                    country_codes = [c.get('country_code') or c.get('code') or c for c in pkg.get('countries', []) if c]
                elif pkg.get('country_code'):
                    country_codes = [pkg.get('country_code')]
                elif isinstance(pkg.get('country_codes'), list):
                    country_codes = pkg.get('country_codes')
                
                # Get price
                original_price = 0
                price_fields = [
                    pkg.get('price'), pkg.get('retail_price'), pkg.get('amount'),
                    pkg.get('cost'), pkg.get('base_price')
                ]
                for price in price_fields:
                    if price is not None:
                        try:
                            price_value = float(price)
                            if price_value > 0:
                                original_price = price_value
                                break
                        except (ValueError, TypeError):
                            continue
                
                if original_price == 0:
                    print(f"⚠️ Skipping topup package {package_id}: No valid price")
                    continue
                
                retail_price = round(original_price * (1 + markup_percentage / 100), 2)
                
                # Prepare Firestore document - TOPUP PACKAGE
                plan_ref = db.collection('dataplans').document(package_id)
                plan_doc = {
                    'slug': package_id,
                    'name': pkg.get('name') or pkg.get('title') or 'Unnamed Plan',
                    'description': pkg.get('description') or pkg.get('short_info') or '',
                    'price': retail_price,
                    'original_price': original_price,
                    'currency': pkg.get('currency', 'USD'),
                    'country_codes': country_codes,
                    'country_ids': country_codes,
                    'capacity': pkg.get('capacity') or pkg.get('amount') or 0,
                    'period': pkg.get('period') or pkg.get('day') or 0,
                    'operator': pkg.get('operator') or '',
                    'status': 'active',
                    'type': 'topup',  # Mark as topup type
                    'is_topup_package': True,  # Explicitly mark as topup package
                    'available_for_purchase': False,  # Topup packages are NOT for purchase
                    'available_for_topup': True,  # Topup packages are for topup
                    'updated_at': firestore.SERVER_TIMESTAMP,
                    'synced_at': firestore.SERVER_TIMESTAMP,
                    'updated_by': 'sdk_sync_topup',
                    'provider': 'airalo',
                    'enabled': True,
                    'is_topup_compatible': len(country_codes) > 0,
                    'topup_compatible': True,
                }
                
                batch.set(plan_ref, plan_doc, merge=True)
                batch_count += 1
                synced_count += 1
                
                # Commit batch if it reaches the limit
                if batch_count >= MAX_BATCH_SIZE:
                    batch.commit()
                    print(f"✅ Committed batch of {batch_count} topup packages")
                    batch = db.batch()
                    batch_count = 0
                
            except Exception as pkg_error:
                print(f"⚠️ Error processing topup package {idx}: {pkg_error}")
                continue
        
        # Commit remaining batch
        if batch_count > 0:
            batch.commit()
            print(f"✅ Committed final batch of {batch_count} topup packages")
        
        print(f"✅ Successfully synced {synced_count} topup packages")
        print("=" * 80)
        print("🔄 SYNC TOPUP PACKAGES COMPLETED")
        print("=" * 80)
        
        return jsonify({
            'success': True,
            'total_synced': synced_count,
            'topup_count': synced_count,
            'message': f'Successfully synced {synced_count} topup packages'
        })
        
    except Exception as e:
        print(f"❌ Error syncing topup packages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Create order using Airalo SDK (API key auth)"""
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
        to_email = data.get('to_email', user.get('email'))
        
        if not package_id:
            return jsonify({'success': False, 'error': 'package_id is required'}), 400
        
        print(f"🚀 Creating order via Airalo SDK for user {user['email']}")
        
        try:
            # Create order using Airalo SDK
            sdk_response = alo.create_order(
                package_id=package_id,
                quantity=int(quantity),
                to_email=to_email
            )
            
            if not sdk_response:
                return jsonify({'success': False, 'error': 'Failed to create order via Airalo SDK'}), 500
            
            # Convert SDK response to our format
            order_result = convert_sdk_order_to_response(sdk_response, package_id, quantity)
            
            if not order_result:
                return jsonify({'success': False, 'error': 'Invalid response from Airalo SDK'}), 500
            
            return jsonify({
                'success': True,
                **order_result,
                'isTestMode': False
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error creating order: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/topup', methods=['POST'])
def create_topup():
    """Create topup for existing eSIM using Airalo SDK"""
    try:
        # Get request data
        data = request.get_json()
        iccid = data.get('iccid')
        package_id = data.get('package_id')
        
        if not iccid:
            return jsonify({'success': False, 'error': 'iccid is required'}), 400
        
        if not package_id:
            return jsonify({'success': False, 'error': 'package_id is required'}), 400
        
        # Look up order by ICCID to get user email/info
        order_user_email = None
        order_user_id = None
        
        print(f"🔍 Looking up order by ICCID: {iccid}")
        
        # Search in global orders collection
        orders_ref = db.collection('orders')
        orders = orders_ref.stream()
        
        for order_doc in orders:
            order_data = order_doc.to_dict()
            
            # Check various locations for ICCID
            found_iccid = (
                order_data.get('iccid') or
                order_data.get('esimData', {}).get('iccid') or
                (order_data.get('airaloOrderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('airaloOrderData', {}).get('sims') else None) or
                (order_data.get('orderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('orderData', {}).get('sims') else None) or
                (order_data.get('sims', [{}])[0].get('iccid') if order_data.get('sims') else None)
            )
            
            if found_iccid and str(found_iccid).strip() == str(iccid).strip():
                order_user_email = order_data.get('userEmail') or order_data.get('customerEmail')
                order_user_id = order_data.get('userId')
                print(f"✅ Found order for ICCID: {iccid}")
                print(f"   Order user email: {order_user_email}")
                print(f"   Order user ID: {order_user_id}")
                break
        
        # Also check user subcollections if we have a user ID from auth
        if not order_user_email:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                id_token = auth_header[7:]
                user = authenticate_firebase_token(id_token)
                if user:
                    # Search in user's esims subcollection
                    user_esims_ref = db.collection('users').document(user['uid']).collection('esims')
                    user_orders = user_esims_ref.stream()
                    
                    for order_doc in user_orders:
                        order_data = order_doc.to_dict()
                        found_iccid = (
                            order_data.get('iccid') or
                            order_data.get('esimData', {}).get('iccid') or
                            (order_data.get('airaloOrderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('airaloOrderData', {}).get('sims') else None) or
                            (order_data.get('orderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('orderData', {}).get('sims') else None)
                        )
                        
                        if found_iccid and str(found_iccid).strip() == str(iccid).strip():
                            order_user_email = user['email']
                            order_user_id = user['uid']
                            print(f"✅ Found order in user subcollection for ICCID: {iccid}")
                            break
        
        print(f"")
        print(f"{'='*80}")
        print(f"🚀 Creating TOPUP via Airalo SDK")
        print(f"{'='*80}")
        if order_user_email:
            print(f"  User (from order): {order_user_email} ({order_user_id or 'N/A'})")
        else:
            print(f"  User: Not found in orders (proceeding anyway)")
        print(f"  ICCID: {iccid}")
        print(f"  Package: {package_id}")
        print(f"{'='*80}")
        print(f"")
        
        try:
            # Create topup using Airalo SDK
            # Use the correct topup method: topup(package_id, iccid)
            print(f"📡 Calling alo.topup({package_id}, {iccid})")
            sdk_response = alo.topup(package_id, iccid)
            print(f"📡 SDK Response: {sdk_response}")
            
            if not sdk_response:
                return jsonify({'success': False, 'error': 'Failed to create topup via Airalo SDK'}), 500
            
            print(f"✅ Topup created successfully")
            
            # Save topup to Firestore with user info from order lookup
            topup_data = {
                'iccid': iccid,
                'packageId': package_id,
                'topupData': sdk_response.get('data', {}),
                'createdAt': firestore.SERVER_TIMESTAMP,
                'mode': 'production',
                'isTestMode': False
            }
            
            # Add user info from order lookup if found
            if order_user_email:
                topup_data['userEmail'] = order_user_email
            if order_user_id:
                topup_data['userId'] = order_user_id
            
            topup_ref = db.collection('topups').add(topup_data)
            topup_id = topup_ref[1].id
            
            return jsonify({
                'success': True,
                'topupId': topup_id,
                'topupData': sdk_response.get('data', {}),
                'isTestMode': False
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error creating topup: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/topup-packages', methods=['POST'])
def get_topup_packages():
    """Get topup-compatible packages for an existing eSIM by ICCID"""
    import sys
    print("=" * 80, flush=True)
    print("📦 TOPUP PACKAGES REQUEST STARTED", flush=True)
    print("=" * 80, flush=True)
    try:
        # Optional authentication - allow both authenticated and guest users
        user = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            try:
                user = authenticate_firebase_token(id_token)
                if user:
                    print(f"🔐 Authenticated user: {user.get('email')}", flush=True)
            except Exception as auth_error:
                print(f"⚠️ Authentication failed, continuing as guest: {auth_error}", flush=True)
        
        if not user:
            print(f"👤 Processing request as guest user", flush=True)
        
        # Get request data
        data = request.get_json()
        iccid = data.get('iccid')
        
        if not iccid:
            print(f"❌ ERROR: ICCID is required", flush=True)
            return jsonify({'success': False, 'error': 'iccid is required'}), 400
        
        print(f"🚀 Getting topup-compatible packages for ICCID: {iccid}", flush=True)
        
        # Find the order associated with this ICCID to get country/carrier info
        order_country_codes = []
        order_carrier = None
        
        print(f"🔍 Looking up order by ICCID: {iccid}", flush=True)
        
        # Search in global orders collection
        orders_ref = db.collection('orders')
        orders = orders_ref.stream()
        orders_checked = 0
        
        for order_doc in orders:
            orders_checked += 1
            order_data = order_doc.to_dict()
            
            # Check various locations for ICCID
            found_iccid = (
                order_data.get('iccid') or
                order_data.get('esimData', {}).get('iccid') or
                (order_data.get('airaloOrderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('airaloOrderData', {}).get('sims') else None) or
                (order_data.get('orderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('orderData', {}).get('sims') else None) or
                (order_data.get('sims', [{}])[0].get('iccid') if order_data.get('sims') else None)
            )
            
            if found_iccid and str(found_iccid).strip() == str(iccid).strip():
                print(f"✅ Found order for ICCID: {iccid} (checked {orders_checked} orders)", flush=True)
                
                # Extract country codes from order - check multiple possible field names
                order_country_codes = (
                    order_data.get('countryCode') or 
                    order_data.get('country_code') or 
                    order_data.get('countryCodes') or 
                    order_data.get('country_codes') or 
                    []
                )
                
                # Handle different data types
                if isinstance(order_country_codes, str):
                    order_country_codes = [order_country_codes]
                elif not isinstance(order_country_codes, list):
                    order_country_codes = []
                
                # Debug: Log what fields exist
                print(f"   Order data keys: {list(order_data.keys())[:10]}...", flush=True)
                print(f"   Initial country codes: {order_country_codes}", flush=True)
                
                # Also try to get from airaloOrderData
                airalo_data = order_data.get('airaloOrderData', {})
                if airalo_data:
                    print(f"   airaloOrderData keys: {list(airalo_data.keys())[:10]}...", flush=True)
                    if airalo_data.get('country_code'):
                        country_code = airalo_data['country_code']
                        if country_code not in order_country_codes:
                            order_country_codes.append(country_code)
                            print(f"   Added from airaloOrderData.country_code: {country_code}", flush=True)
                
                # Try to extract from package data
                if airalo_data.get('package'):
                    pkg_data = airalo_data['package']
                    if isinstance(pkg_data, dict):
                        pkg_country_code = pkg_data.get('country_code') or pkg_data.get('countryCode')
                        if pkg_country_code and pkg_country_code not in order_country_codes:
                            order_country_codes.append(pkg_country_code)
                            print(f"   Added from package.country_code: {pkg_country_code}", flush=True)
                
                # Try to get from orderResult
                order_result = order_data.get('orderResult', {})
                if order_result.get('country_code'):
                    country_code = order_result['country_code']
                    if country_code not in order_country_codes:
                        order_country_codes.append(country_code)
                        print(f"   Added from orderResult.country_code: {country_code}", flush=True)
                
                # Get package info to determine carrier
                package_info = airalo_data.get('package', {})
                if isinstance(package_info, dict):
                    order_carrier = package_info.get('operator') or package_info.get('operator_title')
                
                print(f"   Final country codes extracted: {order_country_codes}", flush=True)
                print(f"   Carrier: {order_carrier}", flush=True)
                break
        
        # If no order found, try user subcollections
        if not order_country_codes and user:
            print(f"🔍 No country codes from global orders, checking user collection...", flush=True)
            user_esims_ref = db.collection('users').document(user['uid']).collection('esims')
            user_orders = user_esims_ref.stream()
            
            for order_doc in user_orders:
                order_data = order_doc.to_dict()
                found_iccid = (
                    order_data.get('iccid') or
                    order_data.get('esimData', {}).get('iccid') or
                    (order_data.get('airaloOrderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('airaloOrderData', {}).get('sims') else None) or
                    (order_data.get('orderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('orderData', {}).get('sims') else None)
                )
                
                if found_iccid and str(found_iccid).strip() == str(iccid).strip():
                    print(f"✅ Found order in user collection for ICCID: {iccid}", flush=True)
                    
                    # Extract country codes from order - check multiple possible field names
                    order_country_codes = (
                        order_data.get('countryCode') or 
                        order_data.get('country_code') or 
                        order_data.get('countryCodes') or 
                        order_data.get('country_codes') or 
                        []
                    )
                    
                    # Handle different data types
                    if isinstance(order_country_codes, str):
                        order_country_codes = [order_country_codes]
                    elif not isinstance(order_country_codes, list):
                        order_country_codes = []
                    
                    airalo_data = order_data.get('airaloOrderData', {})
                    if airalo_data.get('country_code'):
                        country_code = airalo_data['country_code']
                        if country_code not in order_country_codes:
                            order_country_codes.append(country_code)
                            print(f"   Added from user collection airaloOrderData.country_code: {country_code}", flush=True)
                    
                    # Try to extract from package data
                    if airalo_data.get('package'):
                        pkg_data = airalo_data['package']
                        if isinstance(pkg_data, dict):
                            pkg_country_code = pkg_data.get('country_code') or pkg_data.get('countryCode')
                            if pkg_country_code and pkg_country_code not in order_country_codes:
                                order_country_codes.append(pkg_country_code)
                                print(f"   Added from user collection package.country_code: {pkg_country_code}", flush=True)
                    
                    # Try to get from orderResult
                    order_result = order_data.get('orderResult', {})
                    if order_result.get('country_code'):
                        country_code = order_result['country_code']
                        if country_code not in order_country_codes:
                            order_country_codes.append(country_code)
                            print(f"   Added from user collection orderResult.country_code: {country_code}", flush=True)
                    
                    print(f"   Country codes extracted from user collection: {order_country_codes}", flush=True)
                    break
        
        try:
            # Get all packages from Airalo SDK
            print(f"📦 Fetching packages from Airalo SDK...", flush=True)
            packages_response = None
            
            # Try different methods to get packages (same as sync-packages endpoint)
            try:
                packages_response = alo.get_all_packages(flat=False)
                print(f"📦 get_all_packages(flat=False) response type: {type(packages_response)}", flush=True)
            except Exception as no_flat_error:
                print(f"⚠️ get_all_packages(flat=False) failed: {no_flat_error}", flush=True)
            
            if not packages_response:
                try:
                    packages_response = alo.get_all_packages()
                    print(f"📦 get_all_packages() response type: {type(packages_response)}", flush=True)
                except Exception as default_error:
                    print(f"⚠️ get_all_packages() failed: {default_error}", flush=True)
                    try:
                        packages_response = alo.get_all_packages(flat=True)
                        print(f"📦 get_all_packages(flat=True) response type: {type(packages_response)}", flush=True)
                    except Exception as flat_error:
                        print(f"❌ get_all_packages(flat=True) also failed: {flat_error}", flush=True)
                        return jsonify({'success': False, 'error': f'Failed to get packages from Airalo SDK: {str(flat_error)}'}), 500
            
            if not packages_response:
                print(f"❌ Airalo SDK returned empty response", flush=True)
                return jsonify({'success': False, 'error': 'Airalo SDK returned empty response'}), 500
            
            # Handle different response formats (same logic as sync-packages)
            if isinstance(packages_response, list):
                # SDK returned a list directly
                all_packages = packages_response
                print(f"📦 SDK returned list directly with {len(all_packages)} items", flush=True)
            elif isinstance(packages_response, dict):
                # Check for 'data' key
                print(f"📦 SDK response dict keys: {list(packages_response.keys())}", flush=True)
                if 'data' in packages_response:
                    all_packages = packages_response['data']
                    print(f"📦 Extracted {len(all_packages)} packages from 'data' key", flush=True)
                    # Debug: Show structure of first package
                    if len(all_packages) > 0:
                        print(f"📦 First package type: {type(all_packages[0])}", flush=True)
                        if isinstance(all_packages[0], dict):
                            print(f"📦 First package keys: {list(all_packages[0].keys())[:20]}", flush=True)
                            print(f"📦 First package sample: {str(all_packages[0])[:500]}", flush=True)
                elif 'packages' in packages_response:
                    all_packages = packages_response['packages']
                    print(f"📦 Extracted {len(all_packages)} packages from 'packages' key", flush=True)
                else:
                    print(f"❌ Unexpected SDK response structure. Keys: {list(packages_response.keys())}", flush=True)
                    print(f"📦 Full response sample: {str(packages_response)[:1000]}", flush=True)
                    return jsonify({
                        'success': False,
                        'error': 'Unexpected SDK response structure',
                        'debug_info': {
                            'response_keys': list(packages_response.keys()),
                            'response_sample': str(packages_response)[:1000]
                        }
                    }), 500
            else:
                print(f"❌ Unexpected SDK response type: {type(packages_response).__name__}", flush=True)
                return jsonify({
                    'success': False,
                    'error': f'Unexpected SDK response type: {type(packages_response).__name__}',
                    'debug_info': {
                        'response_type': type(packages_response).__name__,
                        'response_sample': str(packages_response)[:500]
                    }
                }), 500
            
            if not isinstance(all_packages, list):
                print(f"❌ Invalid packages data format: expected list, got {type(all_packages).__name__}", flush=True)
                return jsonify({
                    'success': False,
                    'error': f'Invalid packages data format: expected list, got {type(all_packages).__name__}'
                }), 500
            
            print(f"📦 Found {len(all_packages)} total packages", flush=True)
            print(f"🔍 Filtering with country codes: {order_country_codes}", flush=True)
            
            # Normalize order country codes once
            order_country_codes_normalized = [str(c).upper().strip() for c in order_country_codes if c]
            print(f"🔍 Normalized country codes: {order_country_codes_normalized}", flush=True)
            
            # Log warning if no country codes found (only once)
            if not order_country_codes_normalized:
                print(f"⚠️ No country codes found for ICCID {iccid}, showing all packages as fallback", flush=True)
            
            # Filter packages that are compatible with the eSIM's country/carrier
            compatible_packages = []
            packages_checked = 0
            packages_filtered_out = 0
            
            for pkg in all_packages:
                packages_checked += 1
                if not isinstance(pkg, dict):
                    continue
                
                # Get package country codes - check multiple possible formats
                pkg_country_codes = []
                
                # Try countries array format
                if isinstance(pkg.get('countries'), list):
                    pkg_country_codes = [
                        c.get('country_code') or c.get('code') or str(c) 
                        for c in pkg.get('countries', []) 
                        if c
                    ]
                # Try single country_code field
                elif pkg.get('country_code'):
                    pkg_country_codes = [pkg.get('country_code')]
                # Try country_codes array
                elif isinstance(pkg.get('country_codes'), list):
                    pkg_country_codes = [str(c) for c in pkg.get('country_codes') if c]
                # Try countryCode (camelCase)
                elif pkg.get('countryCode'):
                    country_code = pkg.get('countryCode')
                    pkg_country_codes = [country_code] if isinstance(country_code, str) else list(country_code) if isinstance(country_code, list) else []
                
                # Normalize package country codes (uppercase, strip whitespace)
                pkg_country_codes = [str(c).upper().strip() for c in pkg_country_codes if c]
                
                # Debug: Log first few packages to understand structure
                if packages_checked <= 5:
                    print(f"📦 Package {packages_checked}: id={pkg.get('id')}, slug={pkg.get('slug')}, name={pkg.get('name') or pkg.get('title')}", flush=True)
                    print(f"   Package country codes: {pkg_country_codes}", flush=True)
                    print(f"   Package countries field: {pkg.get('countries')}", flush=True)
                    print(f"   Package country_code field: {pkg.get('country_code')}", flush=True)
                    print(f"   Package keys: {list(pkg.keys())[:10]}", flush=True)
                
                # Check if package shares any country codes with the eSIM
                # If we have country codes from the order, filter by them
                # If not, show all packages (fallback behavior)
                if order_country_codes_normalized:
                    has_matching_country = any(
                        code in pkg_country_codes or 
                        any(code in str(pc).upper() for pc in pkg_country_codes)
                        for code in order_country_codes_normalized
                    )
                    if not has_matching_country:
                        packages_filtered_out += 1
                        if packages_checked <= 10:
                            print(f"   ❌ Filtered out (no match): {pkg.get('name') or pkg.get('title')} - package codes: {pkg_country_codes}, order codes: {order_country_codes_normalized}", flush=True)
                        continue
                    else:
                        print(f"   ✅ MATCHED PACKAGE: {pkg.get('name') or pkg.get('title')} - package codes: {pkg_country_codes}", flush=True)
                        print(f"   ✅ Continuing to extract package details...", flush=True)
                
                # Extract package details
                package_id = pkg.get('id') or pkg.get('slug')
                if not package_id:
                    if packages_checked <= 10:
                        print(f"   ⚠️ Skipping package (no ID/slug): {list(pkg.keys())[:5]}", flush=True)
                    continue
                
                # Get price - check multiple possible fields
                price = (
                    pkg.get('price') or 
                    pkg.get('retail_price') or 
                    pkg.get('amount') or 
                    pkg.get('cost') or
                    pkg.get('base_price') or
                    (pkg.get('pricing', {}).get('price') if isinstance(pkg.get('pricing'), dict) else None) or
                    (pkg.get('pricing', {}).get('retail_price') if isinstance(pkg.get('pricing'), dict) else None) or
                    0
                )
                
                # Get data amount - check multiple possible fields
                data_amount = (
                    pkg.get('capacity') or 
                    pkg.get('amount') or 
                    pkg.get('data') or 
                    pkg.get('data_amount') or
                    pkg.get('data_capacity') or
                    'N/A'
                )
                
                # Get validity/period - check multiple possible fields
                validity = (
                    pkg.get('period') or 
                    pkg.get('day') or 
                    pkg.get('days') or
                    pkg.get('validity') or 
                    pkg.get('duration') or
                    'N/A'
                )
                
                # Debug: Log EVERY matched package details (force output)
                import sys
                print("=" * 80, flush=True)
                print(f"📦 PROCESSING MATCHED PACKAGE #{len(compatible_packages) + 1}", flush=True)
                print("=" * 80, flush=True)
                print(f"Package ID: {package_id}", flush=True)
                print(f"Name: {pkg.get('name') or pkg.get('title')}", flush=True)
                print(f"Price check: price={pkg.get('price')}, retail_price={pkg.get('retail_price')}, amount={pkg.get('amount')}, cost={pkg.get('cost')}", flush=True)
                print(f"Data check: capacity={pkg.get('capacity')}, amount={pkg.get('amount')}, data={pkg.get('data')}, data_amount={pkg.get('data_amount')}", flush=True)
                print(f"Validity check: period={pkg.get('period')}, day={pkg.get('day')}, days={pkg.get('days')}, validity={pkg.get('validity')}", flush=True)
                print(f"ALL KEYS: {list(pkg.keys())}", flush=True)
                print(f"EXTRACTED: price={price}, data={data_amount}, validity={validity}", flush=True)
                print("=" * 80, flush=True)
                sys.stdout.flush()
                
                compatible_packages.append({
                    'slug': package_id,
                    'package_id': package_id,
                    'name': pkg.get('name') or pkg.get('title') or f'{data_amount} - {validity}',
                    'title': pkg.get('name') or pkg.get('title') or f'{data_amount} - {validity}',
                    'price': float(price) if price else 0,
                    'data': data_amount,
                    'data_amount': data_amount,
                    'validity': validity,
                    'period': validity,
                    'days': validity if isinstance(validity, (int, float)) else None,
                    'country_codes': pkg_country_codes,
                    'country_code': pkg_country_codes[0] if pkg_country_codes else None,
                    'country_name': pkg.get('country_name'),
                    'operator': pkg.get('operator') or order_carrier,
                    'description': pkg.get('description') or pkg.get('short_info') or ''
                })
                
                print(f"✅ Added package to compatible_packages. Total now: {len(compatible_packages)}", flush=True)
                sys.stdout.flush()
            
            print(f"✅ Found {len(compatible_packages)} topup-compatible packages", flush=True)
            print(f"📊 Stats: Checked {packages_checked} packages, filtered out {packages_filtered_out}, matched {len(compatible_packages)}", flush=True)
            
            # Sort by price
            compatible_packages.sort(key=lambda x: x.get('price', 0))
            
            print(f"📦 Returning {len(compatible_packages)} packages to client", flush=True)
            print("=" * 80, flush=True)
            print("📦 TOPUP PACKAGES REQUEST COMPLETED", flush=True)
            print("=" * 80, flush=True)
            
            return jsonify({
                'success': True,
                'packages': compatible_packages,
                'total': len(compatible_packages),
                'iccid': iccid,
                'country_codes': order_country_codes
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error getting topup packages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/mobile-data', methods=['POST'])
def get_mobile_data():
    """Get mobile data usage/status for eSIM using Airalo SDK - Supports guest users"""
    try:
        # Optional authentication - allow both authenticated and guest users
        user = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header[7:]
            try:
                user = authenticate_firebase_token(id_token)
                if user:
                    print(f"🔐 Authenticated user: {user.get('email')}")
            except Exception as auth_error:
                print(f"⚠️ Authentication failed, continuing as guest: {auth_error}")
        
        if not user:
            print(f"👤 Processing request as guest user")
        
        # Get request data
        data = request.get_json()
        iccid = data.get('iccid')
        order_id = data.get('orderId')  # Optional: can use order_id to find iccid
        
        # If order_id provided, get iccid from order
        if order_id and not iccid:
            order_doc = db.collection('orders').document(order_id).get()
            if order_doc.exists:
                order_data = order_doc.to_dict()
                order_sims = order_data.get('orderData', {}).get('sims', [])
                if order_sims:
                    iccid = order_sims[0].get('iccid')
        
        if not iccid:
            return jsonify({'success': False, 'error': 'iccid or orderId is required'}), 400
        
        print(f"🚀 Getting mobile data status via Airalo SDK for ICCID: {iccid}")
        
        try:
            # The Airalo SDK doesn't have a direct method to get SIM usage by ICCID
            # We need to get the SIM data from the order information in our database
            
            # First, try to find the order that contains this ICCID
            print(f"🔍 Searching for order with ICCID: {iccid}")
            
            # Search in global orders collection
            orders_ref = db.collection('orders')
            orders_query = orders_ref.where('iccid', '==', iccid).limit(1)
            orders_docs = list(orders_query.stream())
            
            if not orders_docs:
                # Try searching in airaloOrderData.sims array
                all_orders = orders_ref.stream()
                order_doc = None
                for order in all_orders:
                    order_data = order.to_dict()
                    airalo_data = order_data.get('airaloOrderData', {})
                    sims = airalo_data.get('sims', [])
                    for sim in sims:
                        if sim.get('iccid') == iccid:
                            order_doc = order
                            break
                    if order_doc:
                        break
                
                if not order_doc:
                    return jsonify({
                        'success': False, 
                        'error': f'Order not found for ICCID: {iccid}'
                    }), 404
            else:
                order_doc = orders_docs[0]
            
            order_data = order_doc.to_dict()
            airalo_order_id = order_data.get('airaloOrderId')
            
            if not airalo_order_id:
                return jsonify({
                    'success': False,
                    'error': 'Airalo order ID not found for this ICCID'
                }), 404
            
            print(f"📡 Found Airalo order ID: {airalo_order_id}")
            
            # Try to get updated order information from Airalo
            sdk_response = None
            if hasattr(alo, 'get_order'):
                try:
                    print(f"📡 Calling alo.get_order({airalo_order_id})")
                    sdk_response = alo.get_order(airalo_order_id)
                except Exception as e:
                    print(f"⚠️ get_order failed: {e}")
            
            # If we have SDK response, extract SIM data
            if sdk_response:
                order_info = sdk_response.get('data', {}) if isinstance(sdk_response, dict) else {}
                sims = order_info.get('sims', [])
                
                # Find the specific SIM by ICCID
                sim_data = next((s for s in sims if s.get('iccid') == iccid), None)
                
                if sim_data:
                    mobile_data_response = {
                        'iccid': iccid,
                        'status': sim_data.get('status', 'active'),
                        'dataUsed': sim_data.get('data_used', '0MB'),
                        'dataRemaining': sim_data.get('data_remaining', 'N/A'),
                        'dataTotal': sim_data.get('data_total', 'N/A'),
                        'usagePercentage': sim_data.get('usage_percentage', 0),
                        'daysUsed': sim_data.get('days_used', 0),
                        'daysRemaining': sim_data.get('days_remaining', 0),
                        'expiresAt': sim_data.get('expires_at', ''),
                        'lastUpdated': sim_data.get('last_updated', ''),
                    }
                    
                    print(f"✅ Mobile data status retrieved from Airalo API")
                    
                    return jsonify({
                        'success': True,
                        'data': mobile_data_response,
                        'isTestMode': False
                    })
            
            # Fallback: Use data from our database
            print(f"⚠️ Using cached data from database")
            
            # Don't try to serialize the entire order_data with timestamps
            # Just log what we need
            print(f"📦 Order ID: {order_data.get('orderId')}, Plan: {order_data.get('planName')}")
            
            airalo_data = order_data.get('airaloOrderData', {})
            sims = airalo_data.get('sims', [])
            sim_data = next((s for s in sims if s.get('iccid') == iccid), None)
            
            if not sim_data:
                return jsonify({
                    'success': False,
                    'error': 'SIM data not found'
                }), 404
            
            print(f"📱 SIM found with ICCID: {iccid}")
            
            # Extract package info from multiple sources
            package_info = airalo_data.get('package', {})
            package_data = package_info if isinstance(package_info, dict) else {}
            
            # Debug: Print what we have
            print(f"🔍 DEBUG - sim_data keys: {list(sim_data.keys()) if sim_data else 'None'}")
            print(f"🔍 DEBUG - package_data keys: {list(package_data.keys()) if package_data else 'None'}")
            
            # Try to get plan name from multiple sources
            plan_name = (
                order_data.get('planName') or 
                order_data.get('packageName') or
                package_data.get('title') or
                package_data.get('operator_title') or
                sim_data.get('package_name') or
                'Unknown Plan'
            )
            
            print(f"📦 Plan name: {plan_name}")
            
            # Extract data amount (e.g., "1 GB", "3 GB", etc.)
            # Try multiple possible locations in the data structure
            data_amount = (
                sim_data.get('data') or
                sim_data.get('amount') or
                package_data.get('data') or
                package_data.get('amount') or
                package_data.get('data_amount') or
                order_data.get('planData', {}).get('data') or
                'N/A'
            )
            
            # If still N/A, try to extract from plan name (e.g., "1 GB - 7 Days")
            if data_amount == 'N/A' and plan_name and plan_name != 'Unknown Plan':
                import re
                # Try to match patterns like "1 GB", "500 MB", "3GB", etc.
                match = re.search(r'(\d+\.?\d*\s*(?:GB|MB|TB))', plan_name, re.IGNORECASE)
                if match:
                    data_amount = match.group(1).strip()
                    print(f"📊 Extracted data from plan name: {data_amount}")
            
            print(f"📊 Final data amount: {data_amount}")
            
            # Extract validity days
            validity_days = (
                package_data.get('validity') or
                sim_data.get('validity') or
                package_data.get('day') or
                0
            )
            
            # Extract operator
            operator = (
                package_data.get('operator') or
                sim_data.get('operator_name') or
                package_data.get('operator_title') or
                'N/A'
            )
            
            # Convert expiry date to string if it's a Firestore timestamp
            expiry_date = sim_data.get('valid_until', sim_data.get('expire_date', ''))
            if expiry_date and hasattr(expiry_date, 'isoformat'):
                # It's a datetime object, convert to ISO format string
                expiry_date = expiry_date.isoformat()
            elif expiry_date and not isinstance(expiry_date, str):
                # Try to convert to string
                expiry_date = str(expiry_date)
            
            mobile_data_response = {
                'iccid': iccid,
                'status': sim_data.get('status', 'active'),
                'dataUsed': '0 MB',  # We don't have real-time usage
                'dataRemaining': data_amount,
                'dataTotal': data_amount,
                'usagePercentage': 0,
                'daysUsed': 0,
                'daysRemaining': int(validity_days) if validity_days else 0,
                'expiresAt': expiry_date,
                'lastUpdated': '',
                # Additional info
                'packageName': plan_name,
                'operator': operator,
                'isUnlimited': package_data.get('is_unlimited', False),
                'type': package_data.get('type', sim_data.get('type', 'data')),
            }
            
            print(f"✅ Mobile data status retrieved from database cache")
            print(f"📊 Response data prepared successfully")
            
            return jsonify({
                'success': True,
                'data': mobile_data_response,
                'isTestMode': False,
                'cached': True
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error getting mobile data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    import sys
    port = int(os.getenv('PORT', 5000))
    print(f"", flush=True)
    print(f"=" * 80, flush=True)
    print(f"🚀 Starting Airalo SDK server on port {port}", flush=True)
    print(f"🚀 Using REAL Airalo API operations via Python SDK", flush=True)
    print(f"=" * 80, flush=True)
    print(f"", flush=True)
    sys.stdout.flush()
    sys.stderr.flush()
    app.run(host='0.0.0.0', port=port, debug=False)
