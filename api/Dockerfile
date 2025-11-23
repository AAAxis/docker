# syntax=docker/dockerfile:1.4
FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies + gunicorn
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application files (excluding secrets via .dockerignore)
# Secrets are excluded: *.json files (except package*.json), credentials, etc.
COPY . .

# Create directory for credentials (will be mounted at runtime)
RUN mkdir -p /app/secrets && chmod 700 /app/secrets

# Expose the port
EXPOSE 5000

# Run the server using Gunicorn
# 
# SECURITY NOTES:
# Firebase credentials should be provided via one of these methods:
# 
# Method 1: Mount as volume at runtime (recommended for Docker Compose):
#   docker run -v /path/to/credentials.json:/app/secrets/firebase-credentials.json:ro \
#     -e GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/firebase-credentials.json ...
#
# Method 2: Use Docker secrets (for Docker Swarm):
#   docker service create --secret firebase-credentials ...
#
# Method 3: Use environment variables for credentials (if server.py supports it)
#   -e FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
#
# Method 4: Use BuildKit secrets (build-time, not recommended for runtime secrets):
#   docker build --secret id=firebase-credentials,src=./esim-f0e3e-firebase-adminsdk-fbsvc-cc27060e04.json .
#
# NEVER commit credentials to the image!
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "server:app"]
