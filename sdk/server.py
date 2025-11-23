import os
import json
import re
import sys
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv
from flask_cors import CORS
from airalo import Airalo

# Load environment variables
load_dotenv()

# Create Flask app
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

alo = None

def initialize_airalo_sdk():
    """Initialize Airalo SDK with retry logic"""
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

@app.errorhandler(404)
def not_found(error):
    """Return JSON 404 instead of HTML"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'message': f'The requested endpoint {request.path} was not found on this server.'
    }), 404

# ============================================================================
# Package Routes - /api/packages, /api/sync-packages
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
            packages_response = None
            try:
                # Prioritize flat=False to get full nested structure with sub-packages (needed for global/regional prices)
                packages_response = alo.get_all_packages(flat=False)
                print(f"📦 get_all_packages(flat=False) response type: {type(packages_response)}")
            except Exception as no_flat_error:
                print(f"⚠️ get_all_packages(flat=False) failed: {no_flat_error}")
            
            if not packages_response:
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
                        return jsonify({
                            'success': False,
                            'error': f'Failed to get packages via Airalo SDK: {str(flat_error)}',
                        }), 500
            
            if not packages_response:
                return jsonify({
                    'success': False,
                    'error': 'Airalo SDK returned empty response',
                }), 500
            
            # Handle different response formats
            if isinstance(packages_response, list):
                packages_data = packages_response
                print(f"📦 SDK returned list directly with {len(packages_data)} items")
            elif isinstance(packages_response, dict):
                if 'data' in packages_response:
                    packages_data = packages_response['data']
                elif 'packages' in packages_response:
                    packages_data = packages_response['packages']
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Unexpected SDK response structure',
                        'debug_info': {
                            'response_keys': list(packages_response.keys()),
                        }
                    }), 500
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unexpected SDK response type: {type(packages_response).__name__}',
                }), 500
            
            if not isinstance(packages_data, list):
                if isinstance(packages_data, dict):
                    if 'packages' in packages_data:
                        packages_data = packages_data['packages']
                    elif 'data' in packages_data:
                        packages_data = packages_data['data']
                    else:
                        for key, value in packages_data.items():
                            if isinstance(value, list) and len(value) > 0:
                                packages_data = value
                                break
                
                if not isinstance(packages_data, list):
                    return jsonify({
                        'success': False, 
                        'error': f'Invalid packages data format: expected list, got {type(packages_data).__name__}',
                    }), 500
            
            print(f"📦 Received {len(packages_data)} packages from Airalo SDK")
            
            if len(packages_data) == 0:
                return jsonify({
                    'success': False,
                    'error': 'No packages found in Airalo SDK response.',
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
                    # Handle different package formats
                    if isinstance(pkg, str):
                        package_id = pkg
                        print(f"⚠️ Package {idx} is a string (ID only): {package_id}. Skipping - need full package data.")
                        continue
                    elif isinstance(pkg, dict):
                        package_id = (pkg.get('id') or 
                                     pkg.get('slug') or 
                                     pkg.get('package_id') or
                                     (pkg.get('data', {}).get('id') if isinstance(pkg.get('data'), dict) else None))
                        
                    if not package_id:
                        print(f"⚠️ Skipping package {idx}: No ID found. Keys: {list(pkg.keys())}")
                        continue
                    else:
                        print(f"⚠️ Skipping package {idx}: Unexpected type {type(pkg)}")
                        continue
                    
                    # Skip topup packages - they should not be synced to dataplans collection
                    # Topup packages are handled separately by the topup service
                    package_slug = str(package_id).lower()
                    package_name = (pkg.get('name') or pkg.get('title') or '').lower()
                    package_type = (pkg.get('type') or '').lower()
                    
                    is_topup_package = (
                        pkg.get('is_topup') == True or
                        pkg.get('topup') == True or
                        '-topup' in package_slug or
                        package_slug.endswith('-topup') or
                        'topup' in package_type or
                        'top-up' in package_type or
                        'topup' in package_name or
                        'top-up' in package_name
                    )
                    
                    if is_topup_package:
                        print(f"⏭️ Skipping topup package {idx}: {package_id} (topup packages are handled separately)")
                        continue
                    
                    # Extract country codes
                    country_codes = []
                    if isinstance(pkg, dict):
                        if isinstance(pkg.get('countries'), list):
                            country_codes = [c.get('country_code') or c.get('code') or c for c in pkg.get('countries', []) if c]
                        elif pkg.get('country_code'):
                            country_codes = [pkg.get('country_code')]
                        elif isinstance(pkg.get('country_codes'), list):
                            country_codes = pkg.get('country_codes')
                        elif pkg.get('country'):
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
                    
                    if category == 'global':
                        global_count += 1
                    elif category == 'regional':
                        regional_count += 1
                    else:
                        other_count += 1
                    
                    # Check for sub-packages (for global/regional parent packages)
                    sub_packages = []
                    if isinstance(pkg.get('packages'), list):
                        sub_packages = pkg.get('packages')
                    elif isinstance(pkg.get('sub_packages'), list):
                        sub_packages = pkg.get('sub_packages')
                    elif isinstance(pkg.get('children'), list):
                        sub_packages = pkg.get('children')
                    elif isinstance(pkg.get('operators'), list):
                        operators = pkg.get('operators', [])
                        for operator in operators:
                            if isinstance(operator, dict) and 'packages' in operator:
                                if isinstance(operator['packages'], list):
                                    sub_packages.extend(operator['packages'])
                    
                    # For global/regional packages with sub-packages, save each sub-package as a separate plan
                    if isinstance(sub_packages, list) and len(sub_packages) > 0 and (category == 'global' or category == 'regional'):
                        for sub_idx, sub_pkg in enumerate(sub_packages):
                            if not isinstance(sub_pkg, dict):
                                continue
                            
                            try:
                                sub_package_id = f"{package_id}_{sub_idx}"
                                if sub_pkg.get('id'):
                                    sub_package_id = f"{package_id}_{sub_pkg.get('id')}"
                                
                                # Skip topup sub-packages
                                sub_slug = (sub_package_id or sub_pkg.get('slug') or '').lower()
                                sub_type = (sub_pkg.get('type') or '').lower()
                                sub_is_topup = (
                                    sub_pkg.get('is_topup') == True or
                                    sub_pkg.get('topup') == True or
                                    '-topup' in sub_slug or
                                    sub_slug.endswith('-topup') or
                                    'topup' in sub_type or
                                    'top-up' in sub_type
                                )
                                
                                if sub_is_topup:
                                    print(f"⏭️ Skipping topup sub-package {sub_idx}: {sub_package_id}")
                                    continue
                                
                                # Extract price for this sub-package
                                sub_price_fields = [
                                    sub_pkg.get('price'),
                                    sub_pkg.get('retail_price'),
                                    sub_pkg.get('amount'),
                                    sub_pkg.get('cost'),
                                    sub_pkg.get('base_price'),
                                ]
                                
                                if isinstance(sub_pkg.get('pricing'), dict):
                                    pricing_obj = sub_pkg.get('pricing')
                                    sub_price_fields.extend([
                                        pricing_obj.get('price'),
                                        pricing_obj.get('retail_price'),
                                        pricing_obj.get('amount'),
                                    ])
                                
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
                                    continue
                                
                                sub_retail_price = round(sub_original_price * (1 + markup_percentage / 100), 2)
                                
                                sub_capacity = sub_pkg.get('capacity') or sub_pkg.get('amount') or sub_pkg.get('data') or 0
                                sub_period = sub_pkg.get('period') or sub_pkg.get('day') or sub_pkg.get('validity') or pkg.get('period') or 0
                                
                                parent_name = pkg.get('name') or pkg.get('title') or 'Regional'
                                sub_name = (sub_pkg.get('name') or 
                                           sub_pkg.get('title') or 
                                           f"{parent_name} - {sub_capacity}GB")
                                
                                sub_plan_ref = db.collection('dataplans').document(sub_package_id)
                                sub_plan_doc = {
                                    'slug': sub_package_id,
                                    'name': sub_name,
                                    'description': sub_pkg.get('description') or pkg.get('description') or '',
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
                                    'parent_package_id': package_id,
                                    'parent_category': category,
                                    'updated_at': firestore.SERVER_TIMESTAMP,
                                    'synced_at': firestore.SERVER_TIMESTAMP,
                                    'updated_by': 'sdk_sync',
                                    'provider': 'airalo',
                                    'enabled': True,
                                    'is_roaming': sub_pkg.get('is_roaming') or pkg.get('is_roaming', False),
                                }
                                
                                batch.set(sub_plan_ref, sub_plan_doc, merge=True)
                                batch_count += 1
                                synced_count += 1
                                
                                if batch_count >= MAX_BATCH_SIZE:
                                    batch.commit()
                                    batch = db.batch()
                                    batch_count = 0
                                    
                            except Exception as sub_pkg_error:
                                print(f"⚠️ Error processing sub-package {sub_idx}: {sub_pkg_error}")
                                continue
                        
                        # Save parent package as a container
                        parent_plan_ref = db.collection('dataplans').document(package_id)
                        parent_plan_doc = {
                            'slug': package_id,
                            'name': pkg.get('name') or pkg.get('title') or 'Unnamed Plan',
                            'description': pkg.get('description') or '',
                            'price': 0,
                            'original_price': 0,
                            'currency': pkg.get('currency', 'USD'),
                            'country_codes': country_codes,
                            'country_ids': country_codes,
                            'capacity': 0,
                            'period': 0,
                            'operator': pkg.get('operator') or '',
                            'status': 'active',
                            'type': category,
                            'is_global': category == 'global',
                            'is_regional': category == 'regional',
                            'region': pkg.get('region') or pkg.get('region_slug') or '',
                            'is_parent': True,
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
                        
                        if batch_count >= MAX_BATCH_SIZE:
                            batch.commit()
                            batch = db.batch()
                            batch_count = 0
                        
                        continue
                    
                    # Calculate price with markup
                    price_fields = [
                        pkg.get('price'),
                        pkg.get('retail_price'),
                        pkg.get('amount'),
                        pkg.get('cost'),
                        pkg.get('base_price'),
                    ]
                    
                    if isinstance(pkg.get('pricing'), dict):
                        pricing_obj = pkg.get('pricing')
                        price_fields.extend([
                            pricing_obj.get('price'),
                            pricing_obj.get('retail_price'),
                            pricing_obj.get('amount'),
                        ])
                    
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
                    
                    retail_price = round(original_price * (1 + markup_percentage / 100), 2)
                    
                    # Prepare Firestore document
                    plan_ref = db.collection('dataplans').document(package_id)
                    plan_doc = {
                        'slug': package_id,
                        'name': pkg.get('name') or pkg.get('title') or 'Unnamed Plan',
                        'description': pkg.get('description') or '',
                        'price': retail_price,
                        'original_price': original_price,
                        'currency': pkg.get('currency', 'USD'),
                        'country_codes': country_codes,
                        'country_ids': country_codes,
                        'capacity': pkg.get('capacity') or pkg.get('amount') or 0,
                        'period': pkg.get('period') or pkg.get('day') or 0,
                        'operator': pkg.get('operator') or '',
                        'status': 'active',
                        'type': category,
                        'is_global': category == 'global',
                        'is_regional': category == 'regional',
                        'region': pkg.get('region') or pkg.get('region_slug') or '',
                        'updated_at': firestore.SERVER_TIMESTAMP,
                        'synced_at': firestore.SERVER_TIMESTAMP,
                        'updated_by': 'sdk_sync',
                        'provider': 'airalo',
                        'enabled': True,
                        'is_roaming': pkg.get('is_roaming', False),
                    }
                    
                    batch.set(plan_ref, plan_doc, merge=True)
                    batch_count += 1
                    synced_count += 1
                    
                    if batch_count >= MAX_BATCH_SIZE:
                        batch.commit()
                        batch = db.batch()
                        batch_count = 0
                    
                except Exception as pkg_error:
                    print(f"⚠️ Error processing package {pkg.get('id', 'unknown')}: {pkg_error}")
                    continue
            
            # Commit remaining batch
            if batch_count > 0:
                batch.commit()
            
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
    """Sync ONLY topup packages from Airalo SDK to Firestore topups collection"""
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
        
        print(f"🚀 Syncing TOPUP packages via Airalo SDK for user {user.get('email', 'unknown')}")
        
        try:
            # Get all packages using Airalo SDK
            packages_response = None
            try:
                packages_response = alo.get_all_packages(flat=False)
                print(f"📦 get_all_packages(flat=False) response type: {type(packages_response)}")
            except Exception as no_flat_error:
                print(f"⚠️ get_all_packages(flat=False) failed: {no_flat_error}")
            
            if not packages_response:
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
                        return jsonify({
                            'success': False,
                            'error': f'Failed to get packages via Airalo SDK: {str(flat_error)}',
                        }), 500
            
            if not packages_response:
                return jsonify({
                    'success': False,
                    'error': 'Airalo SDK returned empty response',
                }), 500
            
            # Handle different response formats
            if isinstance(packages_response, list):
                packages_data = packages_response
                print(f"📦 SDK returned list directly with {len(packages_data)} items")
            elif isinstance(packages_response, dict):
                if 'data' in packages_response:
                    packages_data = packages_response['data']
                elif 'packages' in packages_response:
                    packages_data = packages_response['packages']
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Unexpected SDK response structure',
                    }), 500
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unexpected SDK response type: {type(packages_response).__name__}',
                }), 500
            
            if not isinstance(packages_data, list):
                if isinstance(packages_data, dict):
                    if 'packages' in packages_data:
                        packages_data = packages_data['packages']
                    elif 'data' in packages_data:
                        packages_data = packages_data['data']
                    else:
                        for key, value in packages_data.items():
                            if isinstance(value, list) and len(value) > 0:
                                packages_data = value
                                break
                
                if not isinstance(packages_data, list):
                    return jsonify({
                        'success': False, 
                        'error': f'Invalid packages data format: expected list, got {type(packages_data).__name__}',
                    }), 500
            
            print(f"📦 Received {len(packages_data)} packages from Airalo SDK")
            
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
            topup_count = 0
            checked_count = 0
            batch = db.batch()
            batch_count = 0
            MAX_BATCH_SIZE = 500  # Firestore batch limit
            
            for idx, pkg in enumerate(packages_data):
                try:
                    # Handle different package formats
                    if isinstance(pkg, str):
                        package_id = pkg
                        print(f"⚠️ Package {idx} is a string (ID only): {package_id}. Skipping - need full package data.")
                        continue
                    elif isinstance(pkg, dict):
                        package_id = (pkg.get('id') or 
                                     pkg.get('slug') or 
                                     pkg.get('package_id') or
                                     (pkg.get('data', {}).get('id') if isinstance(pkg.get('data'), dict) else None))
                        
                        if not package_id:
                            continue
                    else:
                        continue
                    
                    checked_count += 1
                    
                    # Check if this is a topup package - ONLY sync topup packages
                    package_slug = str(package_id).lower()
                    package_name = (pkg.get('name') or pkg.get('title') or '').lower()
                    package_type = (pkg.get('type') or '').lower()
                    
                    # Debug: Log first 10 packages to understand structure
                    if checked_count <= 10:
                        print(f"🔍 Checking package {checked_count}:")
                        print(f"   ID: {package_id}")
                        print(f"   Slug: {package_slug}")
                        print(f"   Name: {package_name}")
                        print(f"   Type: {package_type}")
                        print(f"   Keys: {list(pkg.keys())[:15]}")
                        print(f"   is_topup: {pkg.get('is_topup')}")
                        print(f"   topup: {pkg.get('topup')}")
                    
                    is_topup_package = (
                        pkg.get('is_topup') == True or
                        pkg.get('topup') == True or
                        '-topup' in package_slug or
                        package_slug.endswith('-topup') or
                        'topup' in package_type or
                        'top-up' in package_type or
                        'topup' in package_name or
                        'top-up' in package_name
                    )
                    
                    if checked_count <= 10:
                        print(f"   Detected as topup: {is_topup_package}")
                    
                    # Check sub-packages FIRST (before skipping parent) - they might contain topup packages
                    # Extract country codes and categorize (needed for sub-package processing)
                    country_codes = []
                    if isinstance(pkg, dict):
                        if isinstance(pkg.get('countries'), list):
                            country_codes = [c.get('country_code') or c.get('code') or c for c in pkg.get('countries', []) if c]
                        elif pkg.get('country_code'):
                            country_codes = [pkg.get('country_code')]
                        elif isinstance(pkg.get('country_codes'), list):
                            country_codes = pkg.get('country_codes')
                        elif pkg.get('country'):
                            country = pkg.get('country')
                            if isinstance(country, dict):
                                country_codes = [country.get('code') or country.get('country_code')]
                            elif isinstance(country, str):
                                country_codes = [country]
                    
                    plan_data = {
                        'country_codes': country_codes,
                        'type': pkg.get('type', ''),
                        'region': pkg.get('region', '') or pkg.get('region_slug', ''),
                        'name': pkg.get('name') or pkg.get('title', '')
                    }
                    category = categorize_plan(plan_data)
                    
                    # Check sub-packages for ALL packages (not just topup ones)
                    sub_packages = []
                    if isinstance(pkg.get('packages'), list):
                        sub_packages = pkg.get('packages')
                    elif isinstance(pkg.get('sub_packages'), list):
                        sub_packages = pkg.get('sub_packages')
                    elif isinstance(pkg.get('children'), list):
                        sub_packages = pkg.get('children')
                    elif isinstance(pkg.get('operators'), list):
                        operators = pkg.get('operators', [])
                        for operator in operators:
                            if isinstance(operator, dict) and 'packages' in operator:
                                if isinstance(operator['packages'], list):
                                    sub_packages.extend(operator['packages'])
                    
                    # Process sub-packages if they exist (they might be topup even if parent isn't)
                    has_topup_subpackages = False
                    if isinstance(sub_packages, list) and len(sub_packages) > 0:
                        if checked_count <= 10:
                            print(f"   Found {len(sub_packages)} sub-packages - checking for topup...")
                        # Sub-package processing will happen below, set flag to skip parent if we process sub-packages
                        has_topup_subpackages = True  # We'll check this in the sub-package loop
                    
                    # Skip non-topup packages (but only if they don't have sub-packages to check)
                    if not is_topup_package and not has_topup_subpackages:
                        continue
                    
                    # If parent is topup package, process it
                    if is_topup_package:
                        topup_count += 1
                        print(f"✅ Found topup package {idx}: {package_id}")
                    
                    # Extract country codes
                    country_codes = []
                    if isinstance(pkg, dict):
                        if isinstance(pkg.get('countries'), list):
                            country_codes = [c.get('country_code') or c.get('code') or c for c in pkg.get('countries', []) if c]
                        elif pkg.get('country_code'):
                            country_codes = [pkg.get('country_code')]
                        elif isinstance(pkg.get('country_codes'), list):
                            country_codes = pkg.get('country_codes')
                        elif pkg.get('country'):
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
                    
                    # Check for sub-packages (for global/regional parent packages)
                    sub_packages = []
                    if isinstance(pkg.get('packages'), list):
                        sub_packages = pkg.get('packages')
                    elif isinstance(pkg.get('sub_packages'), list):
                        sub_packages = pkg.get('sub_packages')
                    elif isinstance(pkg.get('children'), list):
                        sub_packages = pkg.get('children')
                    elif isinstance(pkg.get('operators'), list):
                        operators = pkg.get('operators', [])
                        for operator in operators:
                            if isinstance(operator, dict) and 'packages' in operator:
                                if isinstance(operator['packages'], list):
                                    sub_packages.extend(operator['packages'])
                    
                    if topup_count <= 5 and len(sub_packages) > 0:
                        print(f"   Found {len(sub_packages)} sub-packages")
                    
                    # For global/regional packages with sub-packages, save each topup sub-package
                    # Also check regular packages for nested topup packages
                    if isinstance(sub_packages, list) and len(sub_packages) > 0:
                        if topup_count <= 5:
                            print(f"   Checking {len(sub_packages)} sub-packages for topup packages...")
                        
                        for sub_idx, sub_pkg in enumerate(sub_packages):
                            if not isinstance(sub_pkg, dict):
                                continue
                            
                            try:
                                # Check if sub-package is a topup package
                                sub_id = sub_pkg.get('id') or sub_pkg.get('slug') or ''
                                sub_slug = str(sub_id).lower()
                                sub_name = (sub_pkg.get('name') or sub_pkg.get('title') or '').lower()
                                sub_type = (sub_pkg.get('type') or '').lower()
                                
                                if topup_count <= 5 and sub_idx < 3:
                                    print(f"      Sub-package {sub_idx}: id={sub_id}, slug={sub_slug}, type={sub_type}")
                                
                                sub_is_topup = (
                                    sub_pkg.get('is_topup') == True or
                                    sub_pkg.get('topup') == True or
                                    '-topup' in sub_slug or
                                    sub_slug.endswith('-topup') or
                                    'topup' in sub_type or
                                    'top-up' in sub_type or
                                    'topup' in sub_name or
                                    'top-up' in sub_name
                                )
                                
                                if topup_count <= 5 and sub_idx < 3:
                                    print(f"         Detected as topup: {sub_is_topup}")
                                
                                # Skip non-topup sub-packages
                                if not sub_is_topup:
                                    continue
                                
                                sub_package_id = f"{package_id}_{sub_idx}"
                                if sub_pkg.get('id'):
                                    sub_package_id = f"{package_id}_{sub_pkg.get('id')}"
                                
                                # Extract price for this sub-package
                                sub_price_fields = [
                                    sub_pkg.get('price'),
                                    sub_pkg.get('retail_price'),
                                    sub_pkg.get('amount'),
                                    sub_pkg.get('cost'),
                                    sub_pkg.get('base_price'),
                                ]
                                
                                if isinstance(sub_pkg.get('pricing'), dict):
                                    pricing_obj = sub_pkg.get('pricing')
                                    sub_price_fields.extend([
                                        pricing_obj.get('price'),
                                        pricing_obj.get('retail_price'),
                                        pricing_obj.get('amount'),
                                    ])
                                
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
                                    continue
                                
                                sub_retail_price = round(sub_original_price * (1 + markup_percentage / 100), 2)
                                
                                sub_capacity = sub_pkg.get('capacity') or sub_pkg.get('amount') or sub_pkg.get('data') or 0
                                sub_period = sub_pkg.get('period') or sub_pkg.get('day') or sub_pkg.get('validity') or pkg.get('period') or 0
                                
                                parent_name = pkg.get('name') or pkg.get('title') or 'Regional'
                                sub_name = (sub_pkg.get('name') or 
                                           sub_pkg.get('title') or 
                                           f"{parent_name} - {sub_capacity}GB")
                                
                                # Save to topups collection
                                sub_plan_ref = db.collection('topups').document(sub_package_id)
                                sub_plan_doc = {
                                    'slug': sub_package_id,
                                    'name': sub_name,
                                    'description': sub_pkg.get('description') or pkg.get('description') or '',
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
                                    'parent_package_id': package_id,
                                    'parent_category': category,
                                    'updated_at': firestore.SERVER_TIMESTAMP,
                                    'synced_at': firestore.SERVER_TIMESTAMP,
                                    'updated_by': 'sdk_sync',
                                    'provider': 'airalo',
                                    'enabled': True,
                                    'is_roaming': sub_pkg.get('is_roaming') or pkg.get('is_roaming', False),
                                    'is_topup_package': True,
                                    'available_for_topup': True,
                                    'available_for_purchase': False,
                                }
                                
                                batch.set(sub_plan_ref, sub_plan_doc, merge=True)
                                batch_count += 1
                                synced_count += 1
                                
                                if batch_count >= MAX_BATCH_SIZE:
                                    batch.commit()
                                    batch = db.batch()
                                    batch_count = 0
                                    
                            except Exception as sub_pkg_error:
                                print(f"⚠️ Error processing topup sub-package {sub_idx}: {sub_pkg_error}")
                                continue
                        
                        continue
                    
                    # Calculate price with markup
                    price_fields = [
                        pkg.get('price'),
                        pkg.get('retail_price'),
                        pkg.get('amount'),
                        pkg.get('cost'),
                        pkg.get('base_price'),
                    ]
                    
                    if isinstance(pkg.get('pricing'), dict):
                        pricing_obj = pkg.get('pricing')
                        price_fields.extend([
                            pricing_obj.get('price'),
                            pricing_obj.get('retail_price'),
                            pricing_obj.get('amount'),
                        ])
                    
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
                    
                    retail_price = round(original_price * (1 + markup_percentage / 100), 2)
                    
                    # Save to topups collection (not dataplans)
                    plan_ref = db.collection('topups').document(package_id)
                    plan_doc = {
                        'slug': package_id,
                        'name': pkg.get('name') or pkg.get('title') or 'Unnamed Plan',
                        'description': pkg.get('description') or '',
                        'price': retail_price,
                        'original_price': original_price,
                        'currency': pkg.get('currency', 'USD'),
                        'country_codes': country_codes,
                        'country_ids': country_codes,
                        'capacity': pkg.get('capacity') or pkg.get('amount') or 0,
                        'period': pkg.get('period') or pkg.get('day') or 0,
                        'operator': pkg.get('operator') or '',
                        'status': 'active',
                        'type': category,
                        'is_global': category == 'global',
                        'is_regional': category == 'regional',
                        'region': pkg.get('region') or pkg.get('region_slug') or '',
                        'updated_at': firestore.SERVER_TIMESTAMP,
                        'synced_at': firestore.SERVER_TIMESTAMP,
                        'updated_by': 'sdk_sync',
                        'provider': 'airalo',
                        'enabled': True,
                        'is_roaming': pkg.get('is_roaming', False),
                        'is_topup_package': True,
                        'available_for_topup': True,
                        'available_for_purchase': False,
                    }
                    
                    batch.set(plan_ref, plan_doc, merge=True)
                    batch_count += 1
                    synced_count += 1
                    
                    if batch_count >= MAX_BATCH_SIZE:
                        batch.commit()
                        batch = db.batch()
                        batch_count = 0
                    
                except Exception as pkg_error:
                    print(f"⚠️ Error processing topup package {pkg.get('id', 'unknown')}: {pkg_error}")
                    continue
            
            # Commit remaining batch
            if batch_count > 0:
                batch.commit()
            
            print(f"✅ Successfully synced {synced_count} topup packages to Firestore topups collection")
            print(f"   - Total packages checked: {checked_count}")
            print(f"   - Total topup packages found: {topup_count}")
            print(f"   - Total packages synced: {synced_count}")
            
            if topup_count == 0 and checked_count > 0:
                print(f"⚠️ WARNING: No topup packages detected out of {checked_count} checked packages")
                print(f"   This might mean:")
                print(f"   1. Topup packages use a different identifier pattern")
                print(f"   2. Topup packages are nested deeper in the structure")
                print(f"   3. Topup packages need to be synced from a different endpoint")
                # Log sample package structure for debugging
                if len(packages_data) > 0:
                    sample = packages_data[0]
                    if isinstance(sample, dict):
                        print(f"   Sample package keys: {list(sample.keys())[:20]}")
                        print(f"   Sample package ID: {sample.get('id')}")
                        print(f"   Sample package slug: {sample.get('slug')}")
                        print(f"   Sample package name: {sample.get('name') or sample.get('title')}")
                        print(f"   Sample package type: {sample.get('type')}")
            
            # Create sync log
            log_ref = db.collection('sync_logs').document()
            log_ref.set({
                'timestamp': firestore.SERVER_TIMESTAMP,
                'plans_synced': synced_count,
                'topup_count': topup_count,
                'status': 'completed',
                'source': 'sdk_sync',
                'sync_type': 'topup_packages_sync',
                'provider': 'airalo',
                'user_email': user.get('email', 'unknown')
            })
            
            return jsonify({
                'success': True,
                'message': f'Successfully synced {synced_count} topup packages',
                'total_synced': synced_count,
                'topup_count': topup_count,
            })
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error syncing topup packages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# Order Routes - /api/user/order, /api/user/qr-code, /api/orders
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
        
        print(f"🚀 Creating order via Airalo SDK")
        print(f"  User: {user['email']} ({user['uid']})")
        print(f"  Package: {package_id}")
        print(f"  Quantity: {quantity}")
        
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
            
            db.collection('api_usage').add(api_usage_data)
            
            # Also add to user subcollection
            try:
                user_api_usage_ref = db.collection('business_users').document(user['uid']).collection('api_usage')
                user_api_usage_ref.add(api_usage_data)
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
            
            # Try to get QR code from order data first
            order_sims = None
            if 'orderData' in order_data and isinstance(order_data['orderData'], dict):
                order_sims = order_data['orderData'].get('sims', [])
            elif 'sims' in order_data:
                order_sims = order_data['sims']
            
            direct_qr = order_data.get('qrCode') or order_data.get('qrcode') or order_data.get('lpa')
            
            if order_sims and len(order_sims) > 0:
                sim_data = order_sims[0]
                qr_data = {
                    'qrCode': sim_data.get('qrcode', '') or sim_data.get('qrCode', ''),
                    'qrCodeUrl': sim_data.get('qrcode_url', '') or sim_data.get('qrCodeUrl', ''),
                    'lpa': sim_data.get('lpa', ''),
                    'iccid': sim_data.get('iccid', ''),
                    'activationCode': sim_data.get('activation_code', '') or sim_data.get('activationCode', ''),
                    'matchingId': sim_data.get('matching_id', '') or sim_data.get('matchingId', ''),
                }
                
                if qr_data.get('qrCode') or qr_data.get('lpa'):
                    return jsonify({
                        'success': True,
                        **qr_data,
                        'isTestMode': False
                    })
            
            if direct_qr:
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
                if hasattr(alo, 'get_order'):
                    order_response = alo.get_order(airalo_order_id)
                    
                    if order_response:
                        order_info = None
                        if isinstance(order_response, dict):
                            if 'data' in order_response:
                                order_info = order_response['data']
                            else:
                                order_info = order_response
                        
                        if order_info:
                            sims = order_info.get('sims', [])
                            
                            if sims and len(sims) > 0:
                                sim_data = sims[0]
                                qr_data = {
                                    'qrCode': sim_data.get('qrcode', '') or sim_data.get('qrCode', ''),
                                    'qrCodeUrl': sim_data.get('qrcode_url', '') or sim_data.get('qrCodeUrl', ''),
                                    'lpa': sim_data.get('lpa', ''),
                                    'iccid': sim_data.get('iccid', ''),
                                    'activationCode': sim_data.get('activation_code', '') or sim_data.get('activationCode', ''),
                                    'matchingId': sim_data.get('matching_id', '') or sim_data.get('matchingId', ''),
                                }
                                
                                if qr_data.get('qrCode') or qr_data.get('lpa'):
                                    # Update Firestore order with QR code
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
                                    except Exception as update_error:
                                        print(f"⚠️ Could not update Firestore: {update_error}")
                                    
                                    qr_found = True
                                    return jsonify({
                                        'success': True,
                                        **qr_data,
                                        'isTestMode': False
                                    })
            except Exception as api_error:
                print(f"❌ Error fetching from Airalo API: {api_error}")
            
            # Try alternative SDK methods
            if not qr_found:
                sdk_response = None
                
                try:
                    if hasattr(alo, 'get_qr_code'):
                        sdk_response = alo.get_qr_code(airalo_order_id)
                except Exception as e:
                    print(f"❌ get_qr_code failed: {e}")
                
                if not sdk_response:
                    try:
                        if hasattr(alo, 'get_qrcode'):
                            sdk_response = alo.get_qrcode(airalo_order_id)
                    except Exception as e:
                        print(f"❌ get_qrcode failed: {e}")
                
                if sdk_response:
                    qr_data = convert_sdk_qr_to_response(sdk_response)
                    if qr_data:
                        return jsonify({
                            'success': True,
                            **qr_data,
                            'isTestMode': False
                        })
            
            return jsonify({
                'success': False, 
                'error': 'QR code not available. The QR code was not found in order data and could not be retrieved from Airalo API.'
            }), 404
            
        except Exception as sdk_error:
            print(f"❌ Airalo SDK error: {sdk_error}")
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error getting QR code: {e}")
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

# ============================================================================
# Usage Routes - /api/user/balance (balance only, no datacheck)
# ============================================================================

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
# Main Application Entry Point
# ============================================================================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    print(f"", flush=True)
    print(f"=" * 80, flush=True)
    print(f"🚀 Starting Airalo SDK server on port {port}", flush=True)
    print(f"🚀 Using REAL Airalo API operations via Python SDK", flush=True)
    print(f"=" * 80, flush=True)
    
    # Debug: List all registered routes
    print(f"📋 Registered routes:", flush=True)
    route_count = 0
    for rule in app.url_map.iter_rules():
        methods = ', '.join(rule.methods - {'HEAD', 'OPTIONS'})
        print(f"   {rule.rule} [{methods}]", flush=True)
        route_count += 1
    print(f"📊 Total routes: {route_count}", flush=True)
    print(f"=" * 80, flush=True)
    print(f"", flush=True)
    
    sys.stdout.flush()
    sys.stderr.flush()
    app.run(host='0.0.0.0', port=port, debug=False)
