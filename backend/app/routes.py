from flask import request, jsonify
import requests
import logging
from app import app

# Configure logging for better error tracking
logging.basicConfig(level=logging.INFO)

# Update the API URL to point to Deepseek
DEEPSEEK_API_URL = "http://deepseek:8080/api/generate"  # Replace with the correct Deepseek API endpoint

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()

    # Check if the 'prompt' field is provided
    prompt = data.get('prompt')
    if not prompt:
        logging.error("Prompt is missing in the request")
        return jsonify({"error": "Prompt is required"}), 400

    # Update the payload to match Deepseek's expected input format
    payload = {
        "prompt": prompt,
        "max_tokens": 100,  # Example: Adjust based on Deepseek's API requirements
        "temperature": 0.7,  # Example: Adjust based on Deepseek's API requirements
        "top_p": 1.0,  # Example: Adjust based on Deepseek's API requirements
        "stream": False  # Example: Adjust based on Deepseek's API requirements
    }

    try:
        # Make the request to the Deepseek API
        response = requests.post(DEEPSEEK_API_URL, json=payload)

        # Check if the response is OK (status code 200)
        response.raise_for_status()

        # Safely parse the response JSON
        try:
            response_data = response.json()
        except ValueError:
            logging.error(f"Invalid JSON response: {response.text}")
            return jsonify({"error": "Invalid JSON response from Deepseek API"}), 500

        # Return the response from Deepseek
        return jsonify(response_data)

    except requests.exceptions.RequestException as e:
        # Log the error and return a more specific message
        logging.error(f"Failed to generate response from Deepseek: {str(e)}")
        return jsonify({"error": f"Failed to generate response: {str(e)}"}), 500