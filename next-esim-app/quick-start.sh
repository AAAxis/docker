#!/bin/bash

echo "🚀 Quick Start - Next.js eSIM App"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "next.config.js" ]; then
    echo "❌ Error: Please run this script from the next-esim-app directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Setting up environment variables..."
if [ ! -f ".env.local" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env.local
        echo "✅ Created .env.local from env.example"
        echo "⚠️  Please update .env.local with your actual values"
    else
        echo "⚠️  No env.example found. Please create .env.local manually"
    fi
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📁 Checking directory structure..."
if [ ! -d "src/components" ]; then
    echo "⚠️  src/components directory not found"
    echo "   You need to copy your React components from the old app:"
    echo "   cp -r ../react-esim-app/src/components/* src/components/"
fi

if [ ! -d "src/contexts" ]; then
    echo "⚠️  src/contexts directory not found"
    echo "   You need to copy your React contexts from the old app:"
    echo "   cp -r ../react-esim-app/src/contexts/* src/contexts/"
fi

if [ ! -d "src/firebase" ]; then
    echo "⚠️  src/firebase directory not found"
    echo "   You need to copy your Firebase config from the old app:"
    echo "   cp -r ../react-esim-app/src/firebase/* src/firebase/"
fi

echo ""
echo "🚀 Starting development server..."
echo "   The app will be available at: http://localhost:3000"
echo ""
echo "📋 Available commands:"
echo "   npm run dev     - Start development server"
echo "   npm run build   - Build for production"
echo "   npm run start   - Start production server"
echo "   npm run lint    - Run ESLint"
echo ""
echo "🔍 If you get errors:"
echo "   1. Check that all components are copied"
echo "   2. Verify environment variables in .env.local"
echo "   3. Update import paths if needed"
echo "   4. Add 'use client' directive to components using hooks"
echo ""

# Ask if user wants to start the dev server
read -p "Do you want to start the development server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting development server..."
    npm run dev
else
    echo "✅ Setup complete! Run 'npm run dev' when you're ready to start."
fi
