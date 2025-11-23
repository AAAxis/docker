FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY server.py .
COPY esim-f0e3e-firebase-adminsdk-fbsvc-cc27060e04.json .
COPY .env* ./

# Expose port
EXPOSE 5001

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=server.py
ENV PORT=5001

# Run the application
CMD ["python", "server.py"]

