#!/bin/bash

echo "🚀 Starting Theholylabs Flask Application..."

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
echo "📋 Installing dependencies..."
pip install -r requirements.txt

# Start the Flask application
echo "🌐 Starting Flask server..."
echo "✅ Server will be available at: http://localhost:1488"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

python run.py 