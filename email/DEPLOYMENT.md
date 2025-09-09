# Vercel Deployment Guide

## 🚀 Deploy Email Management Frontend to Vercel

### Prerequisites
- Vercel account (free tier available)
- GitHub account
- Your backend services running (API and SMTP)

### Step 1: Prepare Your Repository

1. **Push your code to GitHub**:
   ```bash
   cd /Users/admin/Documents/GitHub/docker/email
   git init
   git add .
   git commit -m "Initial commit: Email management frontend"
   git branch -M main
   git remote add origin https://github.com/yourusername/email-management.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `email` (if deploying from monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the email directory**:
   ```bash
   cd /Users/admin/Documents/GitHub/docker/email
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? Choose your account
   - Link to existing project? `N`
   - Project name: `email-management` (or your preferred name)
   - Directory: `./`
   - Override settings? `N`

### Step 3: Configure Environment Variables

In your Vercel dashboard:

1. **Go to Project Settings → Environment Variables**
2. **Add the following variables**:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAPX9Yt5WBlQBz9L9GB6EQX5BFeAnFGsxE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=voice-85bc0.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=voice-85bc0
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=voice-85bc0.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=101707670627
NEXT_PUBLIC_FIREBASE_APP_ID=1:101707670627:web:5e0f5a022ca9367cf10456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-BGJH3TFW2Q

# API URLs
NEXT_PUBLIC_API_URL=https://api.theholylabs.com
NEXT_PUBLIC_SMTP_URL=https://smtp.theholylabs.com
```

3. **Redeploy** after adding environment variables

### Step 4: Configure Custom Domain (Optional)

1. **In Vercel Dashboard → Settings → Domains**
2. **Add your domain**: `email.theholylabs.com`
3. **Configure DNS**:
   - Add CNAME record: `email` → `cname.vercel-dns.com`
   - Or A record: `email` → Vercel's IP address

### Step 5: Firebase Security Rules

Update your Firebase Firestore rules to allow access from Vercel:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow public read access to projects and templates
    match /projects/{projectId} {
      allow read, write: if request.auth != null;
    }
    
    match /templates/{templateId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 6: Test Your Deployment

1. **Visit your Vercel URL**: `https://your-project.vercel.app`
2. **Test the following**:
   - User registration/login
   - Project creation
   - Template management
   - SMTP settings
   - Email sending

### Step 7: Monitor and Maintain

1. **Check Vercel Analytics** for performance metrics
2. **Monitor Function logs** for any errors
3. **Set up monitoring** for your backend services
4. **Configure alerts** for downtime

## 🔧 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version (should be 18.x)
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

2. **Environment Variables**:
   - Ensure all `NEXT_PUBLIC_` variables are set
   - Redeploy after adding new variables

3. **Firebase Connection**:
   - Verify Firebase project is active
   - Check Firestore security rules
   - Ensure API keys are correct

4. **API Connection**:
   - Verify backend services are running
   - Check CORS configuration
   - Test API endpoints directly

### Performance Optimization:

1. **Enable Vercel Analytics**
2. **Use Vercel Edge Functions** for API routes
3. **Optimize images** with Next.js Image component
4. **Enable compression** and caching

## 📊 Monitoring

- **Vercel Dashboard**: Real-time metrics and logs
- **Firebase Console**: Database and authentication monitoring
- **Backend Logs**: Check your API and SMTP service logs

## 🔄 Continuous Deployment

Once set up, every push to your main branch will automatically trigger a new deployment on Vercel!

---

**Need help?** Check the [Vercel Documentation](https://vercel.com/docs) or [Next.js Deployment Guide](https://nextjs.org/docs/deployment).
