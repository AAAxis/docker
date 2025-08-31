# 🚀 Vercel Deployment Guide for eSIM App

## Prerequisites
- [Vercel Account](https://vercel.com/signup)
- [GitHub Repository](https://github.com) with your code
- Firebase project configured
- Stripe account configured

## 🎯 Quick Deploy (Recommended)

### Option 1: Deploy via Vercel Dashboard
1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure project settings:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `next-esim-app` (if your repo has multiple folders)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Option 2: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd next-esim-app
vercel

# Follow the prompts to configure your project
```

## ⚙️ Environment Variables Setup

### Required Environment Variables in Vercel Dashboard:

#### Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

#### Stripe Configuration
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=your_stripe_test_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=your_stripe_live_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

#### Optional Configuration
```
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_GOOGLE_VERIFICATION=your_google_verification_code
NEXT_PUBLIC_YANDEX_VERIFICATION=your_yandex_verification_code
NEXT_PUBLIC_YAHOO_VERIFICATION=your_yahoo_verification_code
NEXT_PUBLIC_DATAPLANS_API_KEY=your_dataplans_api_key
```

## 🔧 How to Set Environment Variables in Vercel

1. **Go to your project in Vercel Dashboard**
2. **Click "Settings" tab**
3. **Click "Environment Variables"**
4. **Add each variable:**
   - **Name**: `NEXT_PUBLIC_FIREBASE_API_KEY`
   - **Value**: Your actual Firebase API key
   - **Environment**: Production, Preview, Development (select all)
5. **Click "Add"**
6. **Repeat for all variables**

## 📁 Project Structure for Vercel

Your project should have this structure:
```
next-esim-app/
├── src/
│   ├── app/
│   ├── components/
│   ├── services/
│   └── firebase/
├── public/
├── package.json
├── next.config.js
├── vercel.json
└── .gitignore
```

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel
1. **Import your repository in Vercel**
2. **Set all environment variables**
3. **Deploy**

### Step 3: Configure Custom Domain (Optional)
1. **Go to "Domains" in Vercel Dashboard**
2. **Add your custom domain**
3. **Update DNS records as instructed**

## 🔍 Post-Deployment Checklist

- [ ] **Check build logs** for any errors
- [ ] **Verify environment variables** are loaded correctly
- [ ] **Test Firebase authentication** works
- [ ] **Test Stripe payments** (use test mode first)
- [ ] **Check admin panel** functionality
- [ ] **Test eSIM plan selection** and checkout flow
- [ ] **Verify mobile/desktop responsiveness**

## 🐛 Common Issues & Solutions

### Issue: Build Fails
**Solution**: Check build logs and ensure all dependencies are in `package.json`

### Issue: Environment Variables Not Loading
**Solution**: Verify variable names start with `NEXT_PUBLIC_` for client-side access

### Issue: Firebase Connection Fails
**Solution**: Check Firebase project settings and ensure domain is whitelisted

### Issue: Stripe Payments Fail
**Solution**: Verify Stripe keys and webhook endpoints are configured

## 📱 Testing Your Deployment

### Test URLs to Verify:
- **Homepage**: `https://your-app.vercel.app/`
- **Plans Page**: `https://your-app.vercel.app/plans`
- **Admin Panel**: `https://your-app.vercel.app/admin`
- **Checkout**: `https://your-app.vercel.app/checkout`

### Test Scenarios:
1. **User Registration/Login**
2. **Plan Selection**
3. **Checkout Flow**
4. **Admin Panel Functions**
5. **Payment Processing**

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to your main branch:
```bash
git push origin main  # Triggers automatic deployment
```

## 📞 Support

If you encounter issues:
1. **Check Vercel build logs**
2. **Verify environment variables**
3. **Test locally first** with `npm run dev`
4. **Check Firebase/Stripe console** for errors

## 🎉 Success!

Once deployed, your eSIM app will be available at:
`https://your-app-name.vercel.app`

Your app now has:
- ✅ **Automatic deployments** from GitHub
- ✅ **Global CDN** for fast loading
- ✅ **SSL certificates** included
- ✅ **Environment-specific** configurations
- ✅ **Easy rollbacks** if needed

Happy deploying! 🚀
