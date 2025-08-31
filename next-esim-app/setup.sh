#!/bin/bash

echo "🚀 Setting up React eSIM Application with Firebase"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your Firebase and Stripe credentials"
else
    echo "✅ .env file already exists"
fi

echo "🔥 Setting up Firebase Functions..."
cd functions
pip install -r requirements.txt
cd ..

echo "🔐 Firebase Configuration:"
echo "Your Firebase config is already set up in src/firebase/config.js"
echo "Project ID: esim-f0e3e"
echo "Auth Domain: esim-f0e3e.firebaseapp.com"

echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your Stripe publishable key"
echo "2. Run 'firebase login' to authenticate"
echo "3. Run 'firebase deploy --only functions' to deploy Firebase Functions"
echo "4. Run 'npm start' to start the development server"
echo ""
echo "🔑 Admin Access:"
echo "To access the admin panel, create a user with email 'admin@example.com'"
echo "Or update the role to 'admin' in Firestore for your user"
echo ""
echo "🎉 Setup complete! Run 'npm start' to begin development."
