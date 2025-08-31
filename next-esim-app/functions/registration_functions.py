from firebase_functions import https_fn
from firebase_admin import firestore
from datetime import datetime, timedelta
import secrets
import string

def get_db():
    """Lazy initialization of Firestore client"""
    return firestore.client()

@https_fn.on_call()
def generate_registration_code(req: https_fn.CallableRequest) -> any:
    """
    Generate a new registration code with 2-month expiry
    Can be called by admin to create codes
    """
    try:
        # In production, you might want to add admin authentication here
        # For now, allowing any authenticated user to generate codes
        
        data = req.data
        email = data.get('email')  # Optional: bind code to specific email
        
        # Generate unique code
        code = generate_unique_code()
        
        # Set expiry to 2 months from now
        expiry_date = datetime.utcnow() + timedelta(days=60)  # 2 months
        
        # Store in Firestore
        db = get_db()
        code_doc = {
            'code': code,
            'email': email,  # Can be None for general codes
            'is_used': False,
            'expires_at': expiry_date,
            'used_by_user_id': None,
            'used_at': None,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        # Use code as document ID for easy lookup
        db.collection('registrationCodes').document(code).set(code_doc)
        
        return {
            'success': True,
            'code': code,
            'expires_at': expiry_date.isoformat(),
            'email': email
        }
        
    except Exception as e:
        print(f"❌ Error generating registration code: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f'Error generating registration code: {str(e)}'
        )

@https_fn.on_call()
def validate_registration_code(req: https_fn.CallableRequest) -> any:
    """
    Validate registration code during user registration
    """
    try:
        data = req.data
        code = data.get('code', '').upper().strip()
        email = data.get('email', '').lower().strip()
        
        if not code or not email:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message='Code and email are required'
            )
        
        db = get_db()
        
        # Get the registration code document
        code_ref = db.collection('registrationCodes').document(code)
        code_doc = code_ref.get()
        
        if not code_doc.exists:
            return {
                'valid': False,
                'error': 'Invalid registration code'
            }
        
        code_data = code_doc.to_dict()
        
        # Check if already used
        if code_data.get('is_used', False):
            return {
                'valid': False,
                'error': 'Registration code has already been used'
            }
        
        # Check if expired
        expires_at = code_data.get('expires_at')
        if expires_at and expires_at < datetime.utcnow():
            return {
                'valid': False,
                'error': 'Registration code has expired'
            }
        
        # Check email restriction
        code_email = code_data.get('email')
        if code_email and code_email != email:
            return {
                'valid': False,
                'error': 'Registration code is not valid for this email address'
            }
        
        # Check if this email has already used any registration code
        existing_usage = db.collection('registrationCodes').where(
            'used_by_email', '==', email
        ).where('is_used', '==', True).limit(1).get()
        
        if len(existing_usage) > 0:
            return {
                'valid': False,
                'error': 'This email address has already been used with a registration code'
            }
        
        return {
            'valid': True,
            'code': code,
            'expires_at': expires_at.isoformat() if expires_at else None
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        print(f"❌ Error validating registration code: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f'Error validating registration code: {str(e)}'
        )

@https_fn.on_call()
def mark_registration_code_used(req: https_fn.CallableRequest) -> any:
    """
    Mark registration code as used after successful user registration
    """
    try:
        # Require authentication for this function
        if not req.auth or not req.auth.uid:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                message='User must be authenticated'
            )
        
        data = req.data
        code = data.get('code', '').upper().strip()
        email = data.get('email', '').lower().strip()
        
        if not code or not email:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message='Code and email are required'
            )
        
        db = get_db()
        
        # Update the registration code
        code_ref = db.collection('registrationCodes').document(code)
        code_ref.update({
            'is_used': True,
            'used_by_user_id': req.auth.uid,
            'used_by_email': email,
            'used_at': firestore.SERVER_TIMESTAMP
        })
        
        return {
            'success': True,
            'message': 'Registration code marked as used'
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        print(f"❌ Error marking registration code as used: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f'Error marking registration code as used: {str(e)}'
        )

def generate_unique_code():
    """Generate a unique 8-character registration code"""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))

@https_fn.on_call()
def cleanup_expired_codes(req: https_fn.CallableRequest) -> any:
    """
    Clean up expired registration codes (admin function)
    """
    try:
        db = get_db()
        now = datetime.utcnow()
        
        # Find expired codes
        expired_codes = db.collection('registrationCodes').where(
            'expires_at', '<', now
        ).where('is_used', '==', False).get()
        
        deleted_count = 0
        for doc in expired_codes:
            doc.reference.delete()
            deleted_count += 1
        
        return {
            'success': True,
            'deleted_count': deleted_count,
            'message': f'Cleaned up {deleted_count} expired registration codes'
        }
        
    except Exception as e:
        print(f"❌ Error cleaning up expired codes: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f'Error cleaning up expired codes: {str(e)}'
        )
