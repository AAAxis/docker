from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Allow CORS for any origin
CORS(app, resources={r"/*": {"origins": "*"}})



# Import routes after creating the app to avoid circular imports
from app import routes