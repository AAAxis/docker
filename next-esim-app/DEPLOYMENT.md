# 🚀 Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Firebase Project**: Your Firebase project should be set up
4. **Stripe Account**: Get your Stripe publishable keys

## 📋 Environment Variables Setup

In your Vercel dashboard, add these environment variables:

### Firebase Configuration
```
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Stripe Configuration
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
```

## 🚀 Deployment Steps

### Option 1: Auto-Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a React app

3. **Configure Environment Variables**:
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add all the variables listed above

4. **Deploy**:
   - Vercel will automatically build and deploy
   - Your app will be live at `https://your-app-name.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## 🔧 Build Configuration

The `vercel.json` file is already configured with:
- ✅ Proper routing for React Router
- ✅ Static file caching
- ✅ Environment variable mapping
- ✅ Build optimization

## 🌍 Custom Domain (Optional)

1. In Vercel dashboard → Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel

## ⚡ Performance Optimizations

The app includes:
- ✅ Code splitting with React.lazy()
- ✅ Image optimization
- ✅ Static asset caching
- ✅ Service worker (if enabled)

## 🔐 Security Notes

- Environment variables are automatically encrypted in Vercel
- Firebase security rules should be properly configured
- Stripe keys should be the publishable keys only

## 📊 Analytics & Monitoring

Vercel provides built-in:
- ✅ Performance monitoring
- ✅ Error tracking
- ✅ Usage analytics
- ✅ Function logs

## 🚨 Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Ensure all dependencies are in package.json
- Check for TypeScript errors

### App Doesn't Load
- Verify Firebase configuration
- Check browser console for errors
- Ensure Stripe keys are valid

### 404 Errors
- The `vercel.json` handles React Router routing
- All routes should work correctly

## 📱 Progressive Web App

The app includes PWA features:
- ✅ Service worker
- ✅ Manifest file
- ✅ Offline support
- ✅ App-like experience

Your eSIM app will be ready for production with all features working!
