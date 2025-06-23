import os
import json
import traceback
from datetime import datetime
import time
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
from flask_cors import CORS
import stripe
import os
import random
import re
from flask import Flask, render_template, request, jsonify
from flask_mail import Mail, Message
import psycopg2
from psycopg2.extras import RealDictCursor



# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, template_folder='templates')

# Database configuration
# Matches docker-compose.yml PostgreSQL service configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:theholylabs123@postgres:5432/email_management')

# Alternative: You can also set individual components (matches docker-compose.yml)
DB_HOST = os.getenv('DB_HOST', 'postgres')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'email_management')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'theholylabs123')

# Build connection string if DATABASE_URL not provided
if not os.getenv('DATABASE_URL'):
    DATABASE_URL = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

def get_db_connection():
    """Get database connection with improved error handling"""
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except psycopg2.OperationalError as e:
        app.logger.error(f"Database connection error: {str(e)}")
        app.logger.error("Please check your PostgreSQL connection settings:")
        app.logger.error(f"Current DATABASE_URL: {DATABASE_URL}")
        return None
    except Exception as e:
        app.logger.error(f"Unexpected database error: {str(e)}")
        return None

def init_email_config_table():
    """Initialize email config table if not exists"""
    try:
        conn = get_db_connection()
        if not conn:
            app.logger.error("Cannot initialize email_config table: database connection failed")
            return False
            
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS email_config (
                id SERIAL PRIMARY KEY,
                mail_server VARCHAR(255) DEFAULT 'smtp.gmail.com',
                mail_port INTEGER DEFAULT 587,
                mail_use_tls BOOLEAN DEFAULT TRUE,
                mail_use_ssl BOOLEAN DEFAULT FALSE,
                mail_username VARCHAR(255),
                mail_password VARCHAR(255),
                mail_default_sender VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Insert default config if table is empty
        cur.execute("SELECT COUNT(*) FROM email_config")
        count = cur.fetchone()['count']
        
        if count == 0:
            app.logger.info("No email configuration found in database. Please configure email settings via /email-config")
        
        conn.commit()
        cur.close()
        conn.close()
        app.logger.info("Email config table initialized successfully")
        return True
    except Exception as e:
        app.logger.error(f"Error initializing email config table: {str(e)}")
        app.logger.error(f"Exception type: {type(e).__name__}")
        return False

def init_api_keys_table():
    """Initialize API keys table if not exists"""
    try:
        conn = get_db_connection()
        if not conn:
            app.logger.error("Cannot initialize api_keys table: database connection failed")
            return False
            
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id SERIAL PRIMARY KEY,
                openai_api_key VARCHAR(500),
                telegram_bot_token VARCHAR(500),
                telegram_chat_id VARCHAR(100),
                stripe_live_key VARCHAR(500),
                stripe_test_key VARCHAR(500),
                stripe_mode VARCHAR(20) DEFAULT 'test',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Insert default config if table is empty
        cur.execute("SELECT COUNT(*) FROM api_keys")
        count = cur.fetchone()['count']
        
        if count == 0:
            app.logger.info("No API keys found in database. Please configure API keys via /api-keys")
        
        conn.commit()
        cur.close()
        conn.close()
        app.logger.info("API keys table initialized successfully")
        return True
    except Exception as e:
        app.logger.error(f"Error initializing API keys table: {str(e)}")
        app.logger.error(f"Exception type: {type(e).__name__}")
        return False



def init_email_templates_table():
    """Initialize email templates table if not exists"""
    try:
        conn = get_db_connection()
        if not conn:
            app.logger.error("Cannot initialize email_templates table: database connection failed")
            return False
            
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS email_templates (
                id SERIAL PRIMARY KEY,
                route_name VARCHAR(100) UNIQUE NOT NULL,
                subject_template TEXT NOT NULL,
                html_template TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # No default templates - all templates must be created manually via the interface
        app.logger.info("Email templates table initialized. Create templates via /email-templates interface.")
        
        conn.commit()
        cur.close()
        conn.close()
        app.logger.info("Email templates table initialized successfully")
        return True
    except Exception as e:
        app.logger.error(f"Error initializing email templates table: {str(e)}")
        app.logger.error(f"Exception type: {type(e).__name__}")
        return False

# Initialize database tables on startup with error handling
try:
    app.logger.info("Initializing database tables...")
    init_email_config_table()
    init_api_keys_table()
    init_email_templates_table()
    app.logger.info("Database tables initialized successfully!")
except Exception as e:
    app.logger.error(f"Failed to initialize database tables: {str(e)}")
    app.logger.error("Please check your PostgreSQL connection and ensure the database exists.")

def load_email_config_from_db():
    """Load email configuration from database"""
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM email_config ORDER BY id DESC LIMIT 1")
            config = cur.fetchone()
            cur.close()
            conn.close()
            
            if config:
                app.config['MAIL_SERVER'] = config['mail_server']
                app.config['MAIL_PORT'] = config['mail_port']
                app.config['MAIL_USE_TLS'] = config['mail_use_tls']
                app.config['MAIL_USE_SSL'] = config['mail_use_ssl']
                app.config['MAIL_USERNAME'] = config['mail_username']
                app.config['MAIL_PASSWORD'] = config['mail_password']
                app.config['MAIL_DEFAULT_SENDER'] = config['mail_default_sender']
                app.logger.info("Email configuration loaded from database")
                return True
    except Exception as e:
        app.logger.error(f"Error loading email config from database: {str(e)}")
    
    # No email configuration available - requires manual setup
    app.logger.warning("No email configuration found. Email functionality disabled until configured via /email-config")
    return False

def load_api_keys_from_db():
    """Load API keys from database"""
    global OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
    
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM api_keys ORDER BY id DESC LIMIT 1")
            keys = cur.fetchone()
            cur.close()
            conn.close()
            
            if keys:
                OPENAI_API_KEY = keys['openai_api_key']
                TELEGRAM_BOT_TOKEN = keys['telegram_bot_token']
                TELEGRAM_CHAT_ID = keys['telegram_chat_id']
                
                # Debug logging to verify values are loaded
                app.logger.info(f"API keys loaded from database:")
                app.logger.info(f"- OpenAI API Key: {'✓ Set' if OPENAI_API_KEY else '✗ Missing'}")
                app.logger.info(f"- Telegram Bot Token: {'✓ Set' if TELEGRAM_BOT_TOKEN else '✗ Missing'}")
                app.logger.info(f"- Telegram Chat ID: {'✓ Set' if TELEGRAM_CHAT_ID else '✗ Missing'}")
                
                # Set Stripe key based on mode
                if keys['stripe_mode'] == 'live':
                    stripe.api_key = keys['stripe_live_key']
                else:
                    stripe.api_key = keys['stripe_test_key']
                
                return True
    except Exception as e:
        app.logger.error(f"Error loading API keys from database: {str(e)}")
    
    # No API keys available - requires manual setup
    app.logger.warning("No API keys found. API functionality disabled until configured via /api-keys")
    return False

# Global variables (will be loaded from database)
OPENAI_API_KEY = None
TELEGRAM_BOT_TOKEN = None
TELEGRAM_CHAT_ID = None

# Load configurations from database
load_email_config_from_db()
load_api_keys_from_db()

# Initialize Mail with loaded configuration
mail = Mail(app)

# Configure CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")  # Absolute path
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the 'uploads' directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def send_email_from_template(route_name, recipient_email, template_data):
    """
    Send email using template from database
    
    Args:
        route_name: Route name (e.g., 'resume', 'subscribe') to find template for
        recipient_email: Email address to send to
        template_data: Dictionary with data to replace in template
    
    Returns:
        tuple: (success: bool, message: str)
    """
    # Check if email configuration is available
    if not app.config.get('MAIL_USERNAME'):
        return False, "Email configuration not found. Please configure email settings via /email-config"
    
    try:
        conn = get_db_connection()
        if not conn:
            return False, "Database connection failed"
        
        cur = conn.cursor()
        
        # Get the template for this route
        cur.execute("""
            SELECT subject_template, html_template
            FROM email_templates 
            WHERE route_name = %s
            LIMIT 1
        """, (route_name,))
        
        template = cur.fetchone()
        cur.close()
        conn.close()
        
        if not template:
            return False, f"No active template found for route '{route_name}'"
        
        # Format the subject and HTML with provided data
        subject = template['subject_template'].format(**template_data)
        html_content = template['html_template'].format(**template_data)
        
        # Create and send email
        msg = Message(
            subject=subject,
            sender=("Dmytro Polskoy | Theholylabs", app.config['MAIL_USERNAME']),
            recipients=[recipient_email]
        )
        msg.html = html_content
        
        mail.send(msg)
        return True, f"Email sent successfully to {recipient_email}"
        
    except KeyError as e:
        return False, f"Missing template variable: {str(e)}"
    except Exception as e:
        return False, f"Error sending email: {str(e)}"


@app.route('/api/openai', methods=['POST'])
def proxy_openai():
    if not OPENAI_API_KEY:
        return jsonify({"error": "OpenAI API key not configured. Please configure via /api-keys"}), 503
    
    try:
        # Directly forward the request to OpenAI
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            },
            json=request.json,
            timeout=60
        )

        # Forward the exact response from OpenAI
        return jsonify(response.json()), response.status_code

    except requests.RequestException as e:
        app.logger.error(f"OpenAI API error: {str(e)}")
        return jsonify({"error": "Failed to contact OpenAI API"}), 500
    


@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    app.logger.info("Received file upload request")
    
    if 'file' not in request.files:
        app.logger.error("No file part in request")
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        app.logger.error("No selected file")
        return jsonify({"error": "No selected file"}), 400

    # Secure the filename and save the file
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    try:
        file.save(filepath)
        app.logger.info(f"File saved at {filepath}")
    except Exception as e:
        app.logger.error(f"Error saving file: {str(e)}")
        return jsonify({"error": "File upload failed"}), 500

    # Construct the file URL for production
    file_url = f"https://api.theholylabs.com/uploads/{filename}"
    
    return jsonify({
        "message": "File uploaded successfully",
        "file_url": file_url
    }), 200

# Route to serve the uploaded file
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# Keep root endpoint for browser visits
@app.route('/', methods=['GET'])
def root():
    return render_template('index.html')

# Web interface routes
@app.route('/upload-interface', methods=['GET'])
def upload_interface():
    return render_template('upload_interface.html')

@app.route('/resume-interface', methods=['GET'])
def resume_interface():
    return render_template('resume_interface.html')



@app.route('/auth-interface', methods=['GET'])
def auth_interface():
    return render_template('auth_interface.html')

@app.route('/api-docs', methods=['GET'])
def api_docs():
    return render_template('api_docs.html')

@app.route('/payment-interface', methods=['GET'])
def payment_interface():
    return render_template('payment_interface.html')

@app.route('/email-config', methods=['GET'])
def email_config_interface():
    """Render email configuration interface"""
    return render_template('email_config.html')

@app.route('/api/email-config', methods=['GET'])
def get_email_config():
    """Get current email configuration from database"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        cur.execute("SELECT * FROM email_config ORDER BY id DESC LIMIT 1")
        config = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if config:
            # Convert to dict and remove sensitive password for display
            config_dict = dict(config)
            config_dict['mail_password'] = '****' if config_dict['mail_password'] else ''
            return jsonify(config_dict), 200
        else:
            return jsonify({"error": "No email configuration found"}), 404
            
    except Exception as e:
        app.logger.error(f"Error fetching email config: {str(e)}")
        return jsonify({"error": "Failed to fetch email configuration"}), 500

@app.route('/api/email-config', methods=['POST'])
def update_email_config():
    """Update email configuration in database"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['mail_server', 'mail_port', 'mail_username', 'mail_password', 'mail_default_sender']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        
        # Check if config exists and update or insert accordingly
        cur.execute("SELECT id FROM email_config ORDER BY id DESC LIMIT 1")
        existing = cur.fetchone()
        
        if existing:
            # Update existing config
            cur.execute("""
                UPDATE email_config SET 
                    mail_server = %s,
                    mail_port = %s,
                    mail_use_tls = %s,
                    mail_use_ssl = %s,
                    mail_username = %s,
                    mail_password = %s,
                    mail_default_sender = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                data['mail_server'],
                int(data['mail_port']),
                data.get('mail_use_tls', True),
                data.get('mail_use_ssl', False),
                data['mail_username'],
                data['mail_password'],
                data['mail_default_sender'],
                existing['id']
            ))
        else:
            # Insert new config
            cur.execute("""
                INSERT INTO email_config (mail_server, mail_port, mail_use_tls, mail_use_ssl, 
                                        mail_username, mail_password, mail_default_sender)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                data['mail_server'],
                int(data['mail_port']),
                data.get('mail_use_tls', True),
                data.get('mail_use_ssl', False),
                data['mail_username'],
                data['mail_password'],
                data['mail_default_sender']
            ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Update Flask app config with new settings
        app.config['MAIL_SERVER'] = data['mail_server']
        app.config['MAIL_PORT'] = int(data['mail_port'])
        app.config['MAIL_USE_TLS'] = data.get('mail_use_tls', True)
        app.config['MAIL_USE_SSL'] = data.get('mail_use_ssl', False)
        app.config['MAIL_USERNAME'] = data['mail_username']
        app.config['MAIL_PASSWORD'] = data['mail_password']
        app.config['MAIL_DEFAULT_SENDER'] = data['mail_default_sender']
        
        # Reinitialize mail with new config
        global mail
        mail = Mail(app)
        
        return jsonify({"message": "Email configuration updated successfully"}), 200
        
    except Exception as e:
        app.logger.error(f"Error updating email config: {str(e)}")
        return jsonify({"error": "Failed to update email configuration"}), 500

@app.route('/api-keys', methods=['GET'])
def api_keys_interface():
    """Render API keys management interface"""
    return render_template('api_keys.html')

@app.route('/email-templates', methods=['GET'])
def email_templates_interface():
    """Render email templates management interface"""
    return render_template('email_templates.html')

@app.route('/api/email-templates', methods=['GET'])
def get_email_templates():
    """Get all email templates"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        cur.execute("""
            SELECT id, route_name, subject_template, html_template, created_at, updated_at
            FROM email_templates 
            ORDER BY route_name
        """)
        templates = cur.fetchall()
        
        cur.close()
        conn.close()
        
        # Convert to list of dictionaries
        templates_list = [dict(template) for template in templates]
        
        return jsonify(templates_list), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching email templates: {str(e)}")
        return jsonify({"error": "Failed to fetch email templates"}), 500

@app.route('/api/email-templates', methods=['POST'])
def create_email_template():
    """Create a new email template"""
    try:
        data = request.json
        route_name = data.get('route_name')
        subject_template = data.get('subject_template')
        html_template = data.get('html_template')
        
        if not route_name or not subject_template or not html_template:
            return jsonify({"error": "route_name, subject_template, and html_template are required"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        
        # Check if template for this route already exists
        cur.execute("SELECT id FROM email_templates WHERE route_name = %s", (route_name,))
        existing = cur.fetchone()
        
        if existing:
            cur.close()
            conn.close()
            return jsonify({"error": f"Template for route '{route_name}' already exists. Use PUT to update."}), 409
        
        # Insert new template
        cur.execute("""
            INSERT INTO email_templates (route_name, subject_template, html_template)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (route_name, subject_template, html_template))
        
        template_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "message": "Email template created successfully",
            "template_id": template_id,
            "route_name": route_name
        }), 201
        
    except Exception as e:
        app.logger.error(f"Error creating email template: {str(e)}")
        return jsonify({"error": "Failed to create email template"}), 500

@app.route('/api/email-templates/<int:template_id>', methods=['PUT'])
def update_email_template(template_id):
    """Update an existing email template"""
    try:
        data = request.json
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        
        # Check if template exists
        cur.execute("SELECT id FROM email_templates WHERE id = %s", (template_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"error": "Template not found"}), 404
        
        # Build dynamic update query
        update_fields = []
        params = []
        
        if 'route_name' in data:
            # Check if another template already uses this route_name
            cur.execute("SELECT id FROM email_templates WHERE route_name = %s AND id != %s", 
                       (data['route_name'], template_id))
            if cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({"error": f"Route '{data['route_name']}' is already used by another template"}), 409
            
            update_fields.append("route_name = %s")
            params.append(data['route_name'])
            
        if 'subject_template' in data:
            update_fields.append("subject_template = %s")
            params.append(data['subject_template'])
            
        if 'html_template' in data:
            update_fields.append("html_template = %s")
            params.append(data['html_template'])
        
        if not update_fields:
            cur.close()
            conn.close()
            return jsonify({"error": "No fields to update"}), 400
        
        # Add updated_at timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(template_id)
        
        query = f"UPDATE email_templates SET {', '.join(update_fields)} WHERE id = %s"
        cur.execute(query, params)
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "Email template updated successfully"}), 200
        
    except Exception as e:
        app.logger.error(f"Error updating email template: {str(e)}")
        return jsonify({"error": "Failed to update email template"}), 500

@app.route('/api/email-templates/<int:template_id>', methods=['DELETE'])
def delete_email_template(template_id):
    """Delete email template"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        cur.execute("DELETE FROM email_templates WHERE id = %s", (template_id,))
        
        if cur.rowcount == 0:
            return jsonify({"error": "Template not found"}), 404
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": "Email template deleted successfully"}), 200
        
    except Exception as e:
        app.logger.error(f"Error deleting email template: {str(e)}")
        return jsonify({"error": "Failed to delete email template"}), 500

@app.route('/api/api-keys', methods=['GET'])
def get_api_keys():
    """Get current API keys from database"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        cur.execute("SELECT * FROM api_keys ORDER BY id DESC LIMIT 1")
        keys = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if keys:
            # Convert to dict and mask sensitive keys for display
            keys_dict = dict(keys)
            # Mask sensitive data
            if keys_dict.get('openai_api_key'):
                keys_dict['openai_api_key'] = keys_dict['openai_api_key'][:10] + '...' + keys_dict['openai_api_key'][-10:]
            if keys_dict.get('telegram_bot_token'):
                keys_dict['telegram_bot_token'] = keys_dict['telegram_bot_token'][:10] + '...' + keys_dict['telegram_bot_token'][-10:]
            if keys_dict.get('stripe_live_key'):
                keys_dict['stripe_live_key'] = keys_dict['stripe_live_key'][:10] + '...' + keys_dict['stripe_live_key'][-10:]
            if keys_dict.get('stripe_test_key'):
                keys_dict['stripe_test_key'] = keys_dict['stripe_test_key'][:10] + '...' + keys_dict['stripe_test_key'][-10:]
            
            return jsonify(keys_dict), 200
        else:
            return jsonify({"error": "No API keys found"}), 404
            
    except Exception as e:
        app.logger.error(f"Error fetching API keys: {str(e)}")
        return jsonify({"error": "Failed to fetch API keys"}), 500

@app.route('/api/api-keys', methods=['POST'])
def update_api_keys():
    """Update API keys in database"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['openai_api_key', 'telegram_bot_token', 'telegram_chat_id', 'stripe_live_key', 'stripe_test_key', 'stripe_mode']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cur = conn.cursor()
        
        # Check if API keys exist and update or insert accordingly
        cur.execute("SELECT id FROM api_keys ORDER BY id DESC LIMIT 1")
        existing = cur.fetchone()
        
        if existing:
            # Update existing keys
            cur.execute("""
                UPDATE api_keys SET 
                    openai_api_key = %s,
                    telegram_bot_token = %s,
                    telegram_chat_id = %s,
                    stripe_live_key = %s,
                    stripe_test_key = %s,
                    stripe_mode = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                data['openai_api_key'],
                data['telegram_bot_token'],
                data['telegram_chat_id'],
                data['stripe_live_key'],
                data['stripe_test_key'],
                data['stripe_mode'],
                existing['id']
            ))
        else:
            # Insert new keys
            cur.execute("""
                INSERT INTO api_keys (openai_api_key, telegram_bot_token, telegram_chat_id, 
                                    stripe_live_key, stripe_test_key, stripe_mode)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                data['openai_api_key'],
                data['telegram_bot_token'],
                data['telegram_chat_id'],
                data['stripe_live_key'],
                data['stripe_test_key'],
                data['stripe_mode']
            ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Update global variables with new API keys
        global OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
        OPENAI_API_KEY = data['openai_api_key']
        TELEGRAM_BOT_TOKEN = data['telegram_bot_token'] 
        TELEGRAM_CHAT_ID = data['telegram_chat_id']
        
        # Update Stripe API key based on mode
        if data['stripe_mode'] == 'live':
            stripe.api_key = data['stripe_live_key']
        else:
            stripe.api_key = data['stripe_test_key']
        
        return jsonify({"message": "API keys updated successfully"}), 200
        
    except Exception as e:
        app.logger.error(f"Error updating API keys: {str(e)}")
        return jsonify({"error": "Failed to update API keys"}), 500

@app.route('/resume', methods=['GET', 'POST'])
def upload_resume():
    app.logger.info("Received file upload request")
    
    if 'file' not in request.files:
        app.logger.error("No file part in request")
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        app.logger.error("No selected file")
        return jsonify({"error": "No selected file"}), 400

    # Extract name, email, and jobTitle from the form data
    name = request.form.get('name')
    email = request.form.get('email')
    job_title = request.form.get('jobTitle')  # Capture jobTitle

    if not name or not email or not job_title:
        app.logger.error("Name, email, or jobTitle not provided")
        return jsonify({"error": "Name, email, and jobTitle are required"}), 400

    # Secure the filename and save the file
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    try:
        file.save(filepath)
        app.logger.info(f"File saved at {filepath}")
    except Exception as e:
        app.logger.error(f"Error saving file: {str(e)}")
        return jsonify({"error": "File upload failed"}), 500

    # Send file to Telegram (only if configured)
    telegram_success = False
    app.logger.info(f"Checking Telegram configuration:")
    app.logger.info(f"- Bot Token: {'✓ Available' if TELEGRAM_BOT_TOKEN else '✗ Missing'}")
    app.logger.info(f"- Chat ID: {'✓ Available' if TELEGRAM_CHAT_ID else '✗ Missing'}")
    
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        app.logger.info("Attempting to send file to Telegram...")
        try:
            with open(filepath, 'rb') as f:
                files = {'document': f}
                data = {
                    'chat_id': TELEGRAM_CHAT_ID,
                    'caption': f"Resume uploaded by {name} ({email}) for the position of {job_title}"
                }
                telegram_api_url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument'
                response = requests.post(telegram_api_url, data=data, files=files)

            if response.status_code == 200:
                app.logger.info("File sent to Telegram successfully")
                telegram_success = True
            else:
                app.logger.error(f"Failed to send file to Telegram: {response.text}")
                # Don't return error, just log it and continue
        except Exception as e:
            app.logger.error(f"Error sending file to Telegram: {str(e)}")
            # Don't return error, just log it and continue
    else:
        app.logger.warning("Telegram not configured. Please configure via /api-keys to enable Telegram notifications.")

    # Send confirmation email to user using template
    template_data = {
        'name': name,
        'email': email,
        'job_title': job_title,
        'filename': filename,
        'date_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    success, message = send_email_from_template('resume', email, template_data)
    if success:
        app.logger.info(message)
    else:
        app.logger.error(f"Error sending confirmation email: {message}")
        # Don't return error here, as the main functionality (file upload + Telegram) worked

    # Construct the file URL for production
    file_url = f"https://api.theholylabs.com/uploads/{filename}"
    
    # Create dynamic response message
    message_parts = ["Resume uploaded successfully"]
    if telegram_success:
        message_parts.append("sent to Telegram")
    if success:
        message_parts.append("confirmation email sent")
    
    response_message = ", ".join(message_parts)
    
    return jsonify({
        "message": response_message,
        "file_url": file_url,
        "telegram_sent": telegram_success,
        "email_sent": success
    }), 200


@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    if not stripe.api_key:
        return jsonify({'error': 'Stripe API key not configured. Please configure via /api-keys'}), 503
    
    try:
        # Extract amount and currency from the request
        data = request.json
        amount = data.get('amount')
        currency = data.get('currency', 'ils')  # Default to 'usd' if not provided

        # Create a PaymentIntent with support for Apple Pay
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            payment_method_types=['card'],
        )

        # Return the client secret
        return jsonify({'clientSecret': payment_intent['client_secret']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    if not stripe.api_key:
        return jsonify({'error': 'Stripe API key not configured. Please configure via /api-keys'}), 503
    
    try:
        data = request.json
        order = data.get('order')
        email = data.get('email')
        total = data.get('total')
        name = data.get('name')

        # Create checkout session with Stripe
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Order {order}',
                    },
                    'unit_amount': int(float(total) * 100),
                },
                'quantity': 1,
            }],
            mode='payment',

            success_url=f'https://foodiex.vercel.app/payment-success?order={order}&email={email}&total={total}&name={name}',
        
            cancel_url='https://api.theholylabs.com/error',
            customer_email=email,
        )

        return jsonify({'sessionUrl': session.url, 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500




@app.route('/error', methods=['GET'])
def error():
    return jsonify({"status": "Payment Error"}), 200


@app.route('/global_auth', methods=['GET', 'POST'])
def global_auth():
    # Handle GET request to initiate login with a phone number
    email = request.args.get('email')

    if email:
        # Generate a random verification code (password)
        generate_random_password = ''.join(random.choices('0123456789', k=6))

        # Send verification email using template
        template_data = {
            'email': email,
            'verification_code': generate_random_password,
            'date_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        success, message = send_email_from_template('global_auth', email, template_data)
        if not success:
            app.logger.error(f"Error sending verification email: {message}")
            return jsonify({"error": "Failed to send verification email"}), 500

        # Include the verification code in the response data
        response_data = {"message": "Verification code sent successfully", "verification_code": generate_random_password}
        return jsonify(response_data), 200

    else:
        return jsonify({'message': 'Missing email query parameter in GET request'}), 400


@app.route('/delete-data', methods=['POST', 'GET'])
def delete_data():
    """Handle data deletion requests (GDPR compliance)"""
    try:
        # Extract request parameters
        name = request.args.get("name")
        email = request.args.get("email")
        reason = request.args.get("reason", "User requested data deletion")
        
        if not name or not email:
            return jsonify({"error": "Missing required fields: name and email"}), 400
        
        # Send confirmation email to user using template
        template_data = {
            'name': name,
            'email': email,
            'reason': reason,
            'date_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        success, message = send_email_from_template('delete_data', email, template_data)
        if not success:
            app.logger.error(f"Error sending data deletion confirmation email: {message}")
            # Don't return error here, still process the request
        
        # Send Telegram notification to admin
        telegram_message = f"""
🗑️ *Data Deletion Request* 🗑️
👤 *Name:* {name}
📧 *Email:* {email}
📅 *Date:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
📝 *Reason:* {reason}

⚠️ *Action Required:* Review and process data deletion request
        """
        send_telegram_message(telegram_message)
        
        return jsonify({
            "message": "Data deletion request submitted successfully",
            "status": "Request received and will be processed within 30 days",
            "confirmation_email_sent": success
        }), 200
    
    except Exception as e:
        app.logger.error(f"Failed to process data deletion request: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to process deletion request"}), 500


# Function to parse M3U file
def parse_m3u_file(filepath):
    channels = []
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.readlines()

    for i in range(len(content)):
        line = content[i].strip()
        # Match the #EXTINF line with additional attributes
        match = re.match(r'^#EXTINF:-1\s+(.*?),\s*(.*?)$', line)
        if match:
            attributes = match.group(1)  # Attributes like tvg-id, tvg-logo, group-title
            name = match.group(2)       # Channel name

            # Extract tvg-logo and group-title from attributes
            logo_match = re.search(r'tvg-logo="([^"]+)"', attributes)
            group_match = re.search(r'group-title="([^"]+)"', attributes)

            logo = logo_match.group(1) if logo_match else ""
            group = group_match.group(1) if group_match else ""

            # The next line should be the URL
            if i + 1 < len(content):
                ip = content[i + 1].strip()
                if ip.startswith("http"):
                    channels.append({
                        "name": name,
                        "ip": ip,
                        "logo": logo,
                        "group": group
                    })

    return channels


@app.route('/parsing', methods=['POST'])
def parsing():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Secure the filename and save the file
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save the file
    file.save(filepath)

    # Parse the M3U file
    try:
        channels = parse_m3u_file(filepath)
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 500

    # Construct the file URL for production
    file_url = f"https://api.theholylabs.com/uploads/{filename}"
    
    return jsonify({
        "message": "File uploaded and parsed successfully",
        "file_url": file_url,
        "parsed_data": channels
    }), 200


@app.route('/subscribe', methods=['POST', 'GET'])
def subscribe():
    try:
        # Extract request parameters
        name = request.args.get("name")
        text = request.args.get("text")
        email = request.args.get("email")
        zipcode = request.args.get("zipcode")  # Add this if you need to include the zipcode
        
        if not name or not email or not text:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Send email to customer using template
        template_data = {
            'name': name,
            'email': email,
            'text': text
        }
        
        success, message = send_email_from_template('subscribe', email, template_data)
        if not success:
            app.logger.error(f"Error sending subscription email: {message}")
            return jsonify({"error": "Failed to send confirmation email"}), 500
        
        # Send Telegram notification
        telegram_message = f"""
📩 *New Website Inquiry* 📩
👤 *Name:* {name}
📧 *Email:* {email}
📅 *Date:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
📝 *Message:* {text}
        """
        send_telegram_message(telegram_message)
        
        return render_template('subscribe.html')
    
    except Exception as e:
        app.logger.error(f"Failed to process subscription: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to process subscription"}), 500



def send_telegram_message(text):
    """Send message to Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        app.logger.warning("Telegram API keys not configured. Message not sent.")
        return
    
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"}
        requests.post(url, json=payload)
    except Exception as e:
        app.logger.error(f"Failed to send Telegram message: {str(e)}")


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
