from flask import Flask, request, Response, jsonify, stream_with_context
import json
import requests
import firebase_admin
from firebase_admin import credentials, firestore
import random  # Import random at the top level

# Initialize Flask
app = Flask(__name__)

# Initialize Firestore
cred = credentials.Certificate("app/service.json")  # Update with your Firestore credentials
firebase_admin.initialize_app(cred)
db = firestore.client()


def fetch_restaurants():
    """Fetch restaurant data from Firestore."""
    try:
        # Stream all restaurant documents
        restaurants_ref = db.collection("restaurants").stream()
        
        # Create a list of dictionaries with the required fields
        restaurants = [
            {
                "docId": doc.id,  # This will correctly extract the document ID
                "name": doc.to_dict().get("name", "Unknown"),
                "description": doc.to_dict().get("description", ""),
                "address": doc.to_dict().get("address", ""),
                "rating": str(doc.to_dict().get("rating", 0)) + "⭐",  # Add rating
                "link": doc.to_dict().get("link", "")  # Link field
            }
            for doc in restaurants_ref
        ]
        
        # Return the list of restaurants or an empty list if no results
        if restaurants:
            return restaurants
        else:
            print("No restaurants found.")
            return []

    except Exception as e:
        print(f"Error fetching restaurants: {e}")  # Log the error message
        return []  # Return an empty list in case of error


@app.route('/generate', methods=['POST'])
def generate():
    prompt = request.json.get("prompt", "").strip()

    selected_restaurant_info = ""
    restaurant_link = ""
    restaurant_doc_id = ""

    # Only fetch restaurants if the prompt is relevant
    if "restaurant" in prompt.lower() or "food" in prompt.lower():
        restaurants = fetch_restaurants()
        if restaurants:
            selected_restaurant = random.choice(restaurants)
            selected_restaurant_info = (
                f"Recomend shortly this restaurant, dont mention that i provided this data. {selected_restaurant['name']}, address {selected_restaurant['address']}, description {selected_restaurant['description']}, rating {selected_restaurant['rating']}."
            )
            restaurant_link = selected_restaurant["link"]
            restaurant_doc_id = selected_restaurant["docId"]
            
    # Append restaurant info to the prompt if we have selected one
    if selected_restaurant_info:
        prompt += f"You need make me want go there {selected_restaurant_info}"

    url = "http://93.127.130.43:11434/api/generate"
    headers = {"Content-Type": "application/json"}
    data = {
        "model": "smollm2:1.7b",
        "prompt": prompt,
        "stream": True,
    }

    response = requests.post(url, headers=headers, json=data, stream=True)

    def stream():
        response_text = ""
        for line in response.iter_lines():
            if line:
                try:
                    json_response = json.loads(line.decode('utf-8'))
                    text = json_response.get("response", "")
                    response_text += text
                    # Include the restaurant link and docId as separate parameters
                    yield f"data: {json.dumps({'response': text, 'link': restaurant_link, 'docId': restaurant_doc_id})}\n\n"
                except json.JSONDecodeError:
                    continue

    return Response(stream_with_context(stream()), content_type='text/event-stream')

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
