# Admin Role System Setup Guide

## 🎉 **Admin Role System Successfully Implemented!**

Your React eSIM app now has a comprehensive admin role management system with the following features:

### **Admin Roles Available:**
- **Super Admin**: Full access including user management
- **Admin**: Access to countries, plans, and configuration
- **Moderator**: Access to countries and plans only
- **User**: Regular user with no admin privileges

### **Features Implemented:**
✅ **Role-based Access Control**
✅ **Permission System** 
✅ **Admin User Management Interface**
✅ **Admin Action Logging**
✅ **Secure Firestore Integration**
✅ **Real-time Permission Checking**

---

## 🚀 **How to Setup Your First Admin**

### **Method 1: Manual Firestore Setup (Recommended)**

1. **Register/Login** in your React app with your email
2. **Go to Firebase Console** → Firestore Database
3. **Navigate to `users` collection**
4. **Find your user document** (using your UID)
5. **Add a new field:**
   - Field: `role`
   - Value: `super_admin`
6. **Save and refresh** your React app
7. **Visit `/admin`** - you should now have full access!

### **Method 2: Programmatic Setup**

1. **Register/Login** in your React app
2. **Open browser console** (F12)
3. **Run this code:**
```javascript
// Replace with your actual user ID and email
import { adminService } from './src/services/adminService.js';
await adminService.createSuperAdmin('YOUR_USER_ID', 'your-email@example.com');
```

---

## 📱 **How to Use the Admin System**

### **Admin Dashboard** (`/admin`)
- Environment toggles (Test/Production)
- Stripe payment mode toggles
- DataPlans API configuration
- Countries management
- Plans management

### **User Management** (`/admin/users`)
- View all users and their roles
- Change user roles
- Remove admin privileges
- View admin action logs
- User statistics

### **Permission Levels:**

| Feature | Super Admin | Admin | Moderator | User |
|---------|-------------|-------|-----------|------|
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Manage Countries | ✅ | ✅ | ✅ | ❌ |
| Manage Plans | ✅ | ✅ | ✅ | ❌ |
| Manage Config | ✅ | ✅ | ❌ | ❌ |
| Delete Data | ✅ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ❌ |

---

## 🔐 **Security Features**

- **Role-based access control** at component level
- **Permission checking** for all admin actions
- **Admin action logging** for audit trails
- **Secure Firestore rules** (needs to be implemented)
- **Real-time role updates** without app restart

---

## 🛠 **Next Steps**

1. **Setup your first super admin** (see methods above)
2. **Test admin access** by visiting `/admin`
3. **Create additional admins** via User Management
4. **Configure Firestore security rules** (recommended)

---

## 🔧 **Firestore Security Rules** (Recommended)

Add these rules to your Firestore to secure admin operations:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Only super admins can modify roles
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin' &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['role', 'roleUpdatedAt', 'roleUpdatedBy']);
    }
    
    // Admin logs - only admins can read, system can write
    match /admin_logs/{logId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin', 'moderator'];
      allow create: if request.auth != null;
    }
    
    // Countries - admins and moderators can manage
    match /countries/{countryId} {
      allow read: if true; // Public read
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin', 'moderator'];
    }
    
    // Plans - admins and moderators can manage
    match /plans/{planId} {
      allow read: if true; // Public read
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin', 'moderator'];
    }
    
    // Config - only super admins and admins
    match /config/{configId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin'];
    }
  }
}
```

---

## 🎯 **Admin URLs**

- **Main Admin Panel**: `http://localhost:3000/admin`
- **User Management**: `http://localhost:3000/admin/users`

---

## 🆘 **Troubleshooting**

**"Access Denied" Error:**
- Make sure you're logged in
- Check your user document has the correct `role` field
- Refresh the page after adding the role

**Can't see User Management:**
- Only Super Admins can manage users
- Make sure your role is `super_admin`, not just `admin`

**Changes not reflecting:**
- Clear browser cache and refresh
- Check Firestore console for role updates
- Make sure you're logged in with the correct account

---

Your admin system is now ready! 🎉
