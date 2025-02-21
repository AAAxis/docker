# run.py
from app import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, ssl_context=("cert.pem", "key.pem"))
