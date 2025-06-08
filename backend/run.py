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
from flask import Flask, render_template, request, jsonify
from flask_mail import Mail, Message



# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# Configure CORS
# Make sure this is exactly as shown
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'polskoydm@gmail.com'
app.config['MAIL_PASSWORD'] = 'tkwoyrntsmnycuui'
app.config['MAIL_DEFAULT_SENDER'] = 'polskoydm@gmail.com'  # Add this line

mail = Mail(app) 

# Telegram Bot Config
TELEGRAM_BOT_TOKEN = "5278311018:AAHHgwcyvabDWaqIMKByTMQJS0cAWm7GyfM"
TELEGRAM_CHAT_ID = "338103637"


CORS(app, resources={r"/*": {"origins": "*"}})


UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")  # Absolute path
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the 'uploads' directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


OPENAI_API_KEY = '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'

#stripe.api_key = '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'
stripe.api_key = 'sk_test_51LXRaMDoWGog1gVBRii0ef0AgNCWInoqHcQXkGkyqF6Uwh7k7pfHq0AwFhuIFg0dcALX3boKoQsYLqvzNd7tcFQh0024Q8SGnM'


@app.route('/api/openai', methods=['POST'])
def proxy_openai():
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

    # Construct the file URL
    file_url = f"https://api.theholylabs.com/uploads/{filename}"
    
    return jsonify({
        "message": "File uploaded successfully",
        "file_url": file_url
    }), 200


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

    # Construct the file URL
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
    return jsonify({"status": "API Proxy running"}), 200


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

    # Send file to Telegram
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
        else:
            app.logger.error(f"Failed to send file to Telegram: {response.text}")
            return jsonify({"error": "Failed to send file to Telegram"}), 500
    except Exception as e:
        app.logger.error(f"Error sending file to Telegram: {str(e)}")
        return jsonify({"error": "Error sending file to Telegram"}), 500

    # Construct the file URL
    file_url = f"https://api.theholylabs.com/uploads/{filename}"
    
    return jsonify({
        "message": "File uploaded successfully and sent to Telegram",
        "file_url": file_url
    }), 200


@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
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

        # Create a formatted email body with a header image from the internet
        email_body = """
            <html>
                <body>
                    <p>Dear User, <h2 style="color: #007bff;">Verification Code is {}</h2></p>
                    <p>Thank you for choosing Theholylabs. Please find your verification code below:</p>

                    <p>If you did not request this code, please ignore this email.</p>
                         <img src="{}" alt="Theholylabs">
                    <p>Theholylabs Team,<br/>Thank you</p>

                </body>
            </html>
        """.format(generate_random_password, "https://media.istockphoto.com/id/1339410643/vector/hand-with-email-application-on-smartphone.jpg?s=612x612&w=0&k=20&c=x2GgZgJpMt5dB0bTN_Rr1vXFzRtkB5fT8ZeQkqgBPQE=")

        # Send an email with the verification code and header image
        msg = Message(
            subject='Verification Code',
            html=email_body,
            sender=app.config['MAIL_USERNAME'],  # Replace with your sender email address
        )
        msg.recipients = [email]

        mail.send(msg)

        # Include the verification code in the response data
        response_data = {"message": "Verification code sent successfully", "verification_code": generate_random_password}
        return jsonify(response_data), 200

    else:
        return jsonify({'message': 'Missing email query parameter in GET request'}), 400



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

    # Construct the file URL
    file_url = f"http://93.127.130.43:5001/uploads/{filename}"
    
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
        
        # Send email to customer
        msg = Message(
            subject=f"Thank you for connecting with Theholylabs, {name}!",
            sender=("Dmytro Polskoy | Theholylabs", app.config['MAIL_USERNAME']),
            recipients=[email]
        )
        
        # HTML content with direct link to the hosted image
        msg.html = f""" 
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Thank you for reaching out, {name}!</h2>
        <p>We've received your message and will get back to you shortly.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #5cb85c; margin: 20px 0;">
            <p><strong>Your message:</strong></p>
            <p style="font-style: italic;">{text}</p>
        </div>
        
        <p>If you have any additional questions, feel free to reply to this email.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p><strong>Best Regards,</strong></p>
            <p><strong>Dmytro Polskoy</strong><br>
            Project Manager<br>
            1578 Hunter St, North Vancouver,<br>V7J 1H5<br<br>
            
              <div style="margin-top: 20px;">
                <img src="https://api.theholylabs.com/uploads/index.png" alt="Theholylabs Logo" style="width: 100px; height: auto;">
            </div>
        </div>
    </div>
</body>
</html>
"""
      
        mail.send(msg)
        
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
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"}
    requests.post(url, json=payload)


if __name__ == '__main__':
    port = int(os.getenv('PORT', 1488))
    app.run(host='0.0.0.0', port=port)
