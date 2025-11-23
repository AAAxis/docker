"""
Standalone Flask server for data usage/balance checks only
Simple, no circular imports, just works
"""
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import credentials, firestore, auth
import firebase_admin
from dotenv import load_dotenv
import requests
from airalo import Airalo

load_dotenv()

app = Flask(__name__)
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
AIRALO_BASE_URL = os.getenv('AIRALO_BASE_URL', 'https://partners-api.airalo.com')

alo = None
if AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET:
    try:
        alo = Airalo({
            "client_id": AIRALO_CLIENT_ID,
            "client_secret": AIRALO_CLIENT_SECRET,
        })
        print("✅ Airalo SDK initialized successfully")
    except Exception as e:
        print(f"⚠️ Airalo SDK initialization failed: {e}")
        alo = None

def authenticate_firebase_token(id_token):
    """Authenticate Firebase ID token"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'type': 'regular_user',
        }
    except Exception as e:
        print(f"Firebase token authentication error: {e}")
        return None

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'data-usage-server',
        'sdk_initialized': alo is not None
    })

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
        
        if not alo:
            return jsonify({'success': False, 'error': 'Airalo SDK not available'}), 503
        
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
        
    except Exception as e:
        print(f"❌ Error getting balance: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/mobile-data', methods=['POST'])
@app.route('/api/mobile-data', methods=['POST'])
def get_mobile_data():
    """Get mobile data usage/status for eSIM using Airalo SDK - Supports guest users"""
    try:
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
        
        data = request.get_json()
        iccid = data.get('iccid')
        order_id = data.get('orderId')
        
        # If orderId provided, get ICCID from order
        if order_id and not iccid:
            order_doc = db.collection('orders').document(order_id).get()
            if order_doc.exists:
                order_data = order_doc.to_dict()
                # Try both orderData.sims and airaloOrderData.sims
                order_sims = (order_data.get('orderData', {}).get('sims', []) or 
                             order_data.get('airaloOrderData', {}).get('sims', []))
                if order_sims:
                    iccid = order_sims[0].get('iccid')
        
        if not iccid:
            return jsonify({'success': False, 'error': 'iccid or orderId is required'}), 400
        
        print(f"🚀 Getting mobile data status via Airalo SDK for ICCID: {iccid}")
        
        if not alo:
            return jsonify({'success': False, 'error': 'Airalo SDK not available'}), 503
        
        try:
            print(f"📡 Querying Airalo directly for ICCID: {iccid}")
            
            sdk_response = None
            if hasattr(alo, 'get_sims'):
                try:
                    print(f"📡 Calling alo.get_sims(iccid={iccid})")
                    sdk_response = alo.get_sims(iccid=iccid)
                    print(f"✅ SDK Response: {sdk_response}")
                except Exception as e:
                    print(f"⚠️ get_sims failed: {e}")
                    import traceback
                    traceback.print_exc()
            
            if not sdk_response or not sdk_response.get('data'):
                print(f"🔍 Searching in Firestore for ICCID: {iccid}")
                
                # First, try api_usage collection
                api_usage_ref = db.collection('api_usage')
                api_usage_query = api_usage_ref.where('metadata.iccid', '==', iccid).limit(1)
                api_usage_docs = list(api_usage_query.stream())
                
                airalo_order_id = None
                
                if api_usage_docs:
                    api_usage_data = api_usage_docs[0].to_dict()
                    print(f"✅ Found api_usage document!")
                    print(f"   OrderId: {api_usage_data.get('orderId')}")
                    print(f"   Metadata: {api_usage_data.get('metadata')}")
                    print(f"   Document keys: {list(api_usage_data.keys())}")
                    
                    # Try to get airaloOrderId from api_usage first
                    airalo_order_id = api_usage_data.get('airaloOrderId')
                    print(f"   airaloOrderId from api_usage: {airalo_order_id} (type: {type(airalo_order_id)})")
                    
                    # If not found, try to get it from the orders collection using orderId
                    if not airalo_order_id and api_usage_data.get('orderId'):
                        order_id = api_usage_data.get('orderId')
                        print(f"🔍 Fetching order document: {order_id}")
                        order_doc = db.collection('orders').document(order_id).get()
                        if order_doc.exists:
                            order_data = order_doc.to_dict()
                            # Try both locations for airaloOrderId
                            airalo_order_id = (order_data.get('airaloOrderId') or 
                                             order_data.get('airaloOrderData', {}).get('id'))
                            # Also try to use order data directly
                            if order_data.get('airaloOrderData'):
                                sdk_response = {'data': order_data.get('airaloOrderData')}
                                print(f"✅ Using order data from Firestore orders collection")
                
                # If not found in api_usage, search in orders collection
                if not airalo_order_id:
                    print(f"🔍 Searching in orders collection for ICCID: {iccid}")
                    orders_ref = db.collection('orders')
                    orders_query = orders_ref.stream()
                    
                    for order_doc in orders_query:
                        order_data = order_doc.to_dict()
                        # Check airaloOrderData.sims for ICCID
                        airalo_order_data = order_data.get('airaloOrderData', {})
                        sims = airalo_order_data.get('sims', [])
                        
                        for sim in sims:
                            if sim.get('iccid') == iccid:
                                airalo_order_id = order_data.get('airaloOrderId') or airalo_order_data.get('id')
                                print(f"✅ Found order document with ICCID! Order ID: {airalo_order_id}")
                                # Use the order data directly if available
                                if airalo_order_data:
                                    sdk_response = {'data': airalo_order_data}
                                    print(f"✅ Using order data from Firestore")
                                break
                        
                        if airalo_order_id:
                            break
                
                # If we found an order ID but no SIM data yet, try to get SIM usage directly
                # Note: The order API doesn't return SIM details, so we skip it and go straight to SIM usage
                if airalo_order_id and (not sdk_response or not sdk_response.get('data')):
                    print(f"✅ Found Airalo order ID: {airalo_order_id}")
                    print(f"📡 Fetching SIM usage directly for ICCID: {iccid} (order API doesn't include SIM details)")
                    try:
                        token_response = requests.post(
                            f'{AIRALO_BASE_URL}/v2/token',
                            json={
                                'client_id': AIRALO_CLIENT_ID,
                                'client_secret': AIRALO_CLIENT_SECRET,
                                'grant_type': 'client_credentials'
                            },
                            timeout=30
                        )
                        
                        if token_response.status_code == 200:
                            try:
                                token_data = token_response.json()
                                access_token = token_data.get('data', {}).get('access_token')
                                
                                if access_token:
                                    # Get SIM usage directly - this is what we actually need
                                    sim_usage_response = requests.get(
                                        f'{AIRALO_BASE_URL}/v2/sims/{iccid}/usage',
                                        headers={'Authorization': f'Bearer {access_token}'},
                                        timeout=30
                                    )
                                    
                                    if sim_usage_response.status_code == 200:
                                        try:
                                            usage_data = sim_usage_response.json()
                                            print(f"✅ Got SIM usage data directly from API")
                                            if usage_data.get('data'):
                                                sdk_response = usage_data
                                                print(f"✅ SIM usage data retrieved successfully")
                                        except ValueError as json_error:
                                            print(f"⚠️ SIM usage API returned non-JSON response: {sim_usage_response.text[:200]}")
                                    else:
                                        print(f"⚠️ SIM usage API returned status {sim_usage_response.status_code}")
                                        if sim_usage_response.text.strip().startswith('<!DOCTYPE'):
                                            print(f"⚠️ SIM usage API returned HTML error page")
                                else:
                                    print(f"⚠️ No access token in token response")
                            except ValueError as json_error:
                                print(f"⚠️ Failed to parse token response as JSON: {token_response.text[:200]}")
                        else:
                            print(f"⚠️ Failed to get Airalo token: {token_response.status_code}")
                            
                    except Exception as e:
                        print(f"⚠️ Failed to fetch SIM usage: {e}")
                        import traceback
                        traceback.print_exc()
                
                if not airalo_order_id:
                    print(f"⚠️ No order found for ICCID: {iccid}")
                
                if not sdk_response or not sdk_response.get('data'):
                    return jsonify({
                        'success': False, 
                        'error': f'No data found for ICCID: {iccid}. The SIM may not exist or may not be accessible.'
                    }), 404
            
            if sdk_response and sdk_response.get('data'):
                response_data = sdk_response.get('data', {}) if isinstance(sdk_response, dict) else {}
                
                # Debug: log the response structure
                print(f"🔍 Processing response_data type: {type(response_data)}")
                if isinstance(response_data, dict):
                    print(f"🔍 Response keys: {list(response_data.keys())}")
                    print(f"🔍 Has 'sims' key: {'sims' in response_data}")
                
                sim_data = None
                
                # Check if this is SIM usage data (has 'remaining' and 'total' keys)
                if isinstance(response_data, dict) and 'remaining' in response_data and 'total' in response_data:
                    # This is SIM usage data from /v2/sims/{iccid}/usage endpoint
                    print(f"✅ Detected SIM usage data format")
                    sim_data = response_data
                elif isinstance(response_data, list) and len(response_data) > 0:
                    # If response_data is a list, check if it contains SIM objects
                    print(f"🔍 Response is a list with {len(response_data)} items")
                    sim_data = next((s for s in response_data if isinstance(s, dict) and s.get('iccid') == iccid), None)
                    if not sim_data and len(response_data) > 0:
                        # If first item is a dict, it might be a SIM object
                        first_item = response_data[0]
                        if isinstance(first_item, dict) and first_item.get('iccid') == iccid:
                            sim_data = first_item
                else:
                    # Try to get sims array from the response
                    sims = response_data.get('sims', [])
                    print(f"🔍 Found {len(sims)} SIM(s) in order response")
                    if sims:
                        print(f"🔍 SIM ICCIDs: {[s.get('iccid') for s in sims if isinstance(s, dict)]}")
                    sim_data = next((s for s in sims if isinstance(s, dict) and s.get('iccid') == iccid), None)
                    
                    # If sim_data not found, maybe the response_data itself is a SIM object
                    if not sim_data and isinstance(response_data, dict) and response_data.get('iccid') == iccid:
                        sim_data = response_data
                        print(f"🔍 Using response_data as SIM object")
                
                if sim_data:
                    # Handle different response formats
                    if 'remaining' in sim_data and 'total' in sim_data:
                        # SIM usage API format: remaining, total, expired_at, status
                        total_mb = float(sim_data.get('total', 0))
                        remaining_mb = float(sim_data.get('remaining', 0))
                        used_mb = total_mb - remaining_mb
                        usage_percentage = (used_mb / total_mb * 100) if total_mb > 0 else 0
                        
                        mobile_data_response = {
                            'iccid': iccid,
                            'status': sim_data.get('status', 'active').upper() if isinstance(sim_data.get('status'), str) else 'active',
                            'dataUsed': f'{int(used_mb)}MB',
                            'dataRemaining': f'{int(remaining_mb)}MB',
                            'dataTotal': f'{int(total_mb)}MB',
                            'usagePercentage': round(usage_percentage, 2),
                            'daysUsed': 0,  # Not available in usage API
                            'daysRemaining': 0,  # Not available in usage API
                            'expiresAt': sim_data.get('expired_at', ''),
                            'lastUpdated': '',
                        }
                    else:
                        # Legacy format: data_used, data_remaining, etc.
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
                else:
                    # SIM data not found in the response
                    print(f"⚠️ SIM data not found in API response for ICCID: {iccid}")
                    print(f"🔍 Response structure: {json.dumps(response_data, default=str, indent=2)[:500]}")
                    
                    # Try to fetch SIM usage directly using the SIM endpoint
                    # Note: airalo_order_id is defined in the outer scope above
                    try:
                        # Get access token
                        token_response = requests.post(
                            f'{AIRALO_BASE_URL}/v2/token',
                            json={
                                'client_id': AIRALO_CLIENT_ID,
                                'client_secret': AIRALO_CLIENT_SECRET,
                                'grant_type': 'client_credentials'
                            },
                            timeout=30
                        )
                        
                        if token_response.status_code == 200:
                            access_token = token_response.json().get('data', {}).get('access_token')
                            if access_token:
                                # Try to get SIM usage directly
                                print(f"🔄 Attempting to fetch SIM usage directly for ICCID: {iccid}")
                                sim_usage_response = requests.get(
                                    f'{AIRALO_BASE_URL}/v2/sims/{iccid}/usage',
                                    headers={'Authorization': f'Bearer {access_token}'},
                                    timeout=30
                                )
                                
                                if sim_usage_response.status_code == 200:
                                    try:
                                        usage_data = sim_usage_response.json()
                                        print(f"✅ Got SIM usage data directly from API")
                                        # Use the usage data if available
                                        if usage_data.get('data'):
                                            sim_data = usage_data.get('data')
                                            print(f"✅ Found SIM usage data, processing...")
                                            
                                            # Process the SIM usage data (format: remaining, total, expired_at, status)
                                            total_mb = float(sim_data.get('total', 0))
                                            remaining_mb = float(sim_data.get('remaining', 0))
                                            used_mb = total_mb - remaining_mb
                                            usage_percentage = (used_mb / total_mb * 100) if total_mb > 0 else 0
                                            
                                            mobile_data_response = {
                                                'iccid': iccid,
                                                'status': sim_data.get('status', 'active').upper() if isinstance(sim_data.get('status'), str) else 'active',
                                                'dataUsed': f'{int(used_mb)}MB',
                                                'dataRemaining': f'{int(remaining_mb)}MB',
                                                'dataTotal': f'{int(total_mb)}MB',
                                                'usagePercentage': round(usage_percentage, 2),
                                                'daysUsed': 0,  # Not available in usage API
                                                'daysRemaining': 0,  # Not available in usage API
                                                'expiresAt': sim_data.get('expired_at', ''),
                                                'lastUpdated': '',
                                            }
                                            
                                            print(f"✅ Mobile data status retrieved from SIM usage API")
                                            
                                            return jsonify({
                                                'success': True,
                                                'data': mobile_data_response,
                                                'isTestMode': False
                                            })
                                    except ValueError as json_err:
                                        print(f"⚠️ SIM usage API returned non-JSON response: {json_err}")
                                else:
                                    print(f"⚠️ SIM usage API returned status {sim_usage_response.status_code}")
                    except Exception as e:
                        print(f"⚠️ Failed to fetch SIM usage directly: {e}")
                    
                    # If we get here, we couldn't find SIM data
                    return jsonify({
                        'success': False,
                        'error': f'SIM data not found for ICCID: {iccid} in the order response.'
                    }), 404
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error getting mobile data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    """Return JSON 404 instead of HTML"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'message': f'The requested endpoint {request.path} was not found on this server.'
    }), 404

if __name__ == '__main__':
    import sys
    port = int(os.getenv('PORT', 5001))
    print("=" * 80)
    print(f"🚀 Starting Data Usage Server on port {port}")
    print("=" * 80)
    sys.stdout.flush()
    app.run(host='0.0.0.0', port=port, debug=False)

