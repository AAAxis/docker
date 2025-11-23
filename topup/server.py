"""
Standalone Flask server for topup operations only
Simple, no circular imports, just works
"""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import credentials, firestore, auth
import firebase_admin
from dotenv import load_dotenv
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
        'service': 'topup-server',
        'sdk_initialized': alo is not None
    })

@app.route('/api/user/topup', methods=['POST'])
def create_topup():
    """Create topup for existing eSIM using Airalo SDK"""
    try:
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
        
        orders_ref = db.collection('orders')
        orders = orders_ref.stream()
        
        for order_doc in orders:
            order_data = order_doc.to_dict()
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
                break
        
        # Also check user subcollections if we have auth
        if not order_user_email:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                id_token = auth_header[7:]
                user = authenticate_firebase_token(id_token)
                if user:
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
        
        if not alo:
            return jsonify({'success': False, 'error': 'Airalo SDK not available'}), 503
        
        try:
            print(f"📡 Calling alo.topup({package_id}, {iccid})")
            sdk_response = alo.topup(package_id, iccid)
            print(f"📡 SDK Response: {sdk_response}")
            
            if not sdk_response:
                return jsonify({'success': False, 'error': 'Failed to create topup via Airalo SDK'}), 500
            
            print(f"✅ Topup created successfully")
            
            # Save topup to Firestore
            topup_data = {
                'iccid': iccid,
                'packageId': package_id,
                'topupData': sdk_response.get('data', {}),
                'createdAt': firestore.SERVER_TIMESTAMP,
                'mode': 'production',
                'isTestMode': False
            }
            
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
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Airalo SDK error: {str(sdk_error)}'}), 500
        
    except Exception as e:
        print(f"❌ Error creating topup: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/topup-packages', methods=['POST'])
def get_topup_packages():
    """Get topup-compatible packages for an existing eSIM by ICCID"""
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
        
        if not iccid:
            return jsonify({'success': False, 'error': 'iccid is required'}), 400
        
        print(f"🚀 Getting topup-compatible packages for ICCID: {iccid}")
        
        # Find order to get country codes
        order_country_codes = []
        order_carrier = None
        
        print(f"🔍 Looking up order by ICCID: {iccid}")
        
        orders_ref = db.collection('orders')
        orders = orders_ref.stream()
        
        for order_doc in orders:
            order_data = order_doc.to_dict()
            found_iccid = (
                order_data.get('iccid') or
                order_data.get('esimData', {}).get('iccid') or
                (order_data.get('airaloOrderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('airaloOrderData', {}).get('sims') else None) or
                (order_data.get('orderData', {}).get('sims', [{}])[0].get('iccid') if order_data.get('orderData', {}).get('sims') else None) or
                (order_data.get('sims', [{}])[0].get('iccid') if order_data.get('sims') else None)
            )
            
            if found_iccid and str(found_iccid).strip() == str(iccid).strip():
                print(f"✅ Found order for ICCID: {iccid}")
                
                order_country_codes = (
                    order_data.get('countryCode') or 
                    order_data.get('country_code') or 
                    order_data.get('countryCodes') or 
                    order_data.get('country_codes') or 
                    []
                )
                
                if isinstance(order_country_codes, str):
                    order_country_codes = [order_country_codes]
                elif not isinstance(order_country_codes, list):
                    order_country_codes = []
                
                airalo_data = order_data.get('airaloOrderData', {})
                if airalo_data.get('country_code'):
                    country_code = airalo_data['country_code']
                    if country_code not in order_country_codes:
                        order_country_codes.append(country_code)
                
                if airalo_data.get('package'):
                    pkg_data = airalo_data['package']
                    if isinstance(pkg_data, dict):
                        pkg_country_code = pkg_data.get('country_code') or pkg_data.get('countryCode')
                        if pkg_country_code and pkg_country_code not in order_country_codes:
                            order_country_codes.append(pkg_country_code)
                        order_carrier = pkg_data.get('operator') or pkg_data.get('operator_title')
                
                print(f"   Country codes: {order_country_codes}")
                print(f"   Carrier: {order_carrier}")
                break
        
        # Check user collection if no country codes found
        if not order_country_codes and user:
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
                    airalo_data = order_data.get('airaloOrderData', {})
                    if airalo_data.get('country_code'):
                        order_country_codes = [airalo_data['country_code']]
                    break
        
        if not alo:
            return jsonify({'success': False, 'error': 'Airalo SDK not available'}), 503
        
        try:
            # Get all packages from Airalo SDK
            print(f"📦 Fetching packages from Airalo SDK...")
            packages_response = None
            
            try:
                packages_response = alo.get_all_packages(flat=False)
            except:
                try:
                    packages_response = alo.get_all_packages()
                except:
                    packages_response = alo.get_all_packages(flat=True)
            
            if not packages_response:
                return jsonify({'success': False, 'error': 'Airalo SDK returned empty response'}), 500
            
            # Extract packages list
            if isinstance(packages_response, list):
                all_packages = packages_response
            elif isinstance(packages_response, dict):
                all_packages = packages_response.get('data') or packages_response.get('packages') or []
            else:
                return jsonify({'success': False, 'error': 'Unexpected SDK response format'}), 500
            
            if not isinstance(all_packages, list):
                return jsonify({'success': False, 'error': 'Invalid packages data format'}), 500
            
            print(f"📦 Found {len(all_packages)} total packages")
            
            # Normalize country codes
            order_country_codes_normalized = [str(c).upper().strip() for c in order_country_codes if c]
            
            # Filter compatible packages
            compatible_packages = []
            
            for pkg in all_packages:
                if not isinstance(pkg, dict):
                    continue
                
                # Get package country codes
                pkg_country_codes = []
                if isinstance(pkg.get('countries'), list):
                    pkg_country_codes = [
                        c.get('country_code') or c.get('code') or str(c) 
                        for c in pkg.get('countries', []) 
                        if c
                    ]
                elif pkg.get('country_code'):
                    pkg_country_codes = [pkg.get('country_code')]
                elif isinstance(pkg.get('country_codes'), list):
                    pkg_country_codes = [str(c) for c in pkg.get('country_codes') if c]
                
                pkg_country_codes = [str(c).upper().strip() for c in pkg_country_codes if c]
                
                # Filter by country codes if we have them
                if order_country_codes_normalized:
                    has_matching_country = any(
                        code in pkg_country_codes or 
                        any(code in str(pc).upper() for pc in pkg_country_codes)
                        for code in order_country_codes_normalized
                    )
                    if not has_matching_country:
                        continue
                
                package_id = pkg.get('id') or pkg.get('slug')
                if not package_id:
                    continue
                
                price = (
                    pkg.get('price') or 
                    pkg.get('retail_price') or 
                    pkg.get('amount') or 
                    pkg.get('cost') or
                    0
                )
                
                data_amount = (
                    pkg.get('capacity') or 
                    pkg.get('amount') or 
                    pkg.get('data') or 
                    'N/A'
                )
                
                validity = (
                    pkg.get('period') or 
                    pkg.get('day') or 
                    pkg.get('days') or
                    pkg.get('validity') or 
                    'N/A'
                )
                
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
                    'operator': pkg.get('operator') or order_carrier,
                    'description': pkg.get('description') or pkg.get('short_info') or ''
                })
            
            # Sort by price
            compatible_packages.sort(key=lambda x: x.get('price', 0))
            
            print(f"✅ Found {len(compatible_packages)} topup-compatible packages")
            
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

@app.route('/api/sync-topup-packages', methods=['OPTIONS'])
def sync_topup_packages_options():
    """Handle CORS preflight requests"""
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response, 200

@app.route('/api/cleanup-topup-packages', methods=['POST'])
def cleanup_topup_packages():
    """Cleanup endpoint: Remove all packages without '-topup' suffix from topups collection"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        id_token = auth_header[7:]
        user = authenticate_firebase_token(id_token)
        
        if not user:
            return jsonify({'success': False, 'error': 'Authentication failed'}), 401
        
        print("=" * 80)
        print("🧹 CLEANUP TOPUP PACKAGES - Removing non-topup packages")
        print("=" * 80)
        
        MAX_BATCH_SIZE = 500
        cleanup_count = 0
        cleanup_batch = db.batch()
        cleanup_batch_count = 0
        
        try:
            all_topups = db.collection('topups').stream()
            for doc in all_topups:
                doc_data = doc.to_dict()
                slug = (doc_data.get('slug', '') or '').lower()
                doc_id = doc.id.lower()
                
                has_topup_in_slug = '-topup' in slug or slug.endswith('-topup')
                has_topup_in_id = '-topup' in doc_id or doc_id.endswith('-topup')
                
                if not (has_topup_in_slug or has_topup_in_id):
                    cleanup_batch.delete(doc.reference)
                    cleanup_batch_count += 1
                    cleanup_count += 1
                    
                    if cleanup_batch_count >= MAX_BATCH_SIZE:
                        cleanup_batch.commit()
                        cleanup_batch = db.batch()
                        cleanup_batch_count = 0
            
            if cleanup_batch_count > 0:
                cleanup_batch.commit()
            
            print(f"✅ Cleanup complete: Removed {cleanup_count} non-topup packages")
            print("=" * 80)
            
            return jsonify({
                'success': True,
                'removed': cleanup_count,
                'message': f'Removed {cleanup_count} non-topup packages from topups collection'
            })
            
        except Exception as cleanup_error:
            print(f"❌ Cleanup error: {cleanup_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(cleanup_error)}), 500
        
    except Exception as e:
        print(f"❌ Error in cleanup: {e}")
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
    port = int(os.getenv('PORT', 5002))
    print("=" * 80)
    print(f"🚀 Starting Topup Server on port {port}")
    print("=" * 80)
    sys.stdout.flush()
    app.run(host='0.0.0.0', port=port, debug=False)

