import os
import json
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS explicitly for all origins
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
    }
})

# API configuration - OpenAI only
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
IMAGE_MODEL = os.getenv('IMAGE_MODEL', 'dall-e-3')  # For OpenAI: dall-e-2, dall-e-3
CHAT_MODEL = os.getenv('CHAT_MODEL', 'gpt-4o-mini')  # For OpenAI: gpt-4o-mini, gpt-4o, etc.

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'dalle'}), 200

@app.route('/generate', methods=['POST'])
def generate_image():
    """Generate image using OpenRouter DALL-E/Flux API"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        prompt = data.get('prompt')
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400
        
        # Use OpenAI DALL-E API only
        if not OPENAI_API_KEY:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        headers = {
            'Authorization': f'Bearer {OPENAI_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        # DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
        # DALL-E 2 supports: 256x256, 512x512, 1024x1024
        size = data.get('size', '1024x1024')
        model = IMAGE_MODEL
        
        payload = {
            'model': model,
            'prompt': prompt,
            'n': 1,
            'size': size,
            'response_format': 'url'
        }
        
        # DALL-E 3 only supports n=1
        if model == 'dall-e-3':
            payload.pop('n', None)
            # DALL-E 3 only supports 1024x1024, 1792x1024, 1024x1792
            if size not in ['1024x1024', '1792x1024', '1024x1792']:
                payload['size'] = '1024x1024'
        
        api_url = 'https://api.openai.com/v1/images/generations'
        
        # Call the API
        response = requests.post(
            api_url,
            headers=headers,
            json=payload,
            timeout=120  # Image generation can take time
        )
        
        if not response.ok:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', response.text)
            except:
                error_msg = response.text
            return jsonify({
                'error': f'API error: {response.status_code}',
                'details': error_msg
            }), response.status_code
        
        result = response.json()
        
        # Extract image URL from response
        if 'data' in result and len(result['data']) > 0:
            image_data = result['data'][0]
            image_url = image_data.get('url') or image_data.get('b64_json')
            return jsonify({
                'url': image_url,
                'revised_prompt': image_data.get('revised_prompt')
            }), 200
        else:
            return jsonify({'error': 'No image data in response'}), 500
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout - image generation took too long'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/chat', methods=['POST'])
def chat_completion():
    """Generate chat completion using OpenAI or OpenRouter API"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Handle both message format and simple prompt format
        messages = data.get('messages')
        if not messages:
            prompt = data.get('prompt')
            if not prompt:
                return jsonify({'error': 'Either messages or prompt is required'}), 400
            messages = [{'role': 'user', 'content': prompt}]
        
        # Use OpenAI ChatGPT API only
        if not OPENAI_API_KEY:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        headers = {
            'Authorization': f'Bearer {OPENAI_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': data.get('model', CHAT_MODEL),
            'messages': messages,
            'temperature': data.get('temperature', 0.7),
            'max_tokens': data.get('max_tokens', 4000),
            'top_p': data.get('top_p', 1),
            'frequency_penalty': data.get('frequency_penalty', 0),
            'presence_penalty': data.get('presence_penalty', 0)
        }
        
        # Add response format if specified
        if data.get('response_format'):
            payload['response_format'] = data['response_format']
        
        api_url = 'https://api.openai.com/v1/chat/completions'
        
        # Call the API
        response = requests.post(
            api_url,
            headers=headers,
            json=payload,
            timeout=60  # Chat completion timeout
        )
        
        if not response.ok:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', response.text)
            except:
                error_msg = response.text
            return jsonify({
                'error': f'API error: {response.status_code}',
                'details': error_msg
            }), response.status_code
        
        result = response.json()
        
        # Return the full response (compatible with OpenAI format)
        return jsonify(result), 200
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout - chat completion took too long'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/', methods=['GET'])
def index():
    """Service information"""
    return jsonify({
        'service': 'AI Service (Images + Chat)',
        'version': '2.0.0',
        'endpoints': {
            'POST /generate': 'Generate an image from a text prompt',
            'POST /chat': 'Generate chat completion from messages or prompt',
            'GET /health': 'Health check'
        }
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('DEBUG', 'False') == 'True')

