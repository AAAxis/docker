// Configuration service to read admin settings
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get Stripe mode (test/live) from admin configuration
  async getStripeMode() {
    try {
      // First try to get from Firestore (admin panel)
      const configRef = doc(db, 'config', 'stripe');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        const configData = configDoc.data();
        if (configData.mode) {
          console.log('✅ Stripe mode loaded from Firestore:', configData.mode);
          return configData.mode;
        }
      }
      
      // Fallback to localStorage (admin panel fallback)
      const savedMode = localStorage.getItem('esim_stripe_mode');
      if (savedMode) {
        console.log('✅ Stripe mode loaded from localStorage:', savedMode);
        return savedMode;
      }
      
      // Default to test mode
      console.log('⚠️ No Stripe mode found, defaulting to test');
      return 'test';
    } catch (error) {
      console.error('❌ Error loading Stripe mode:', error);
      // Fallback to localStorage
      const savedMode = localStorage.getItem('esim_stripe_mode');
      return savedMode || 'test';
    }
  }

  // Get DataPlans environment (test/production)
  async getDataPlansEnvironment() {
    try {
      // First try to get from Firestore (admin panel)
      const configRef = doc(db, 'config', 'environment');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        const configData = configDoc.data();
        if (configData.mode) {
          console.log('✅ DataPlans environment loaded from Firestore:', configData.mode);
          return configData.mode;
        }
      }
      
      // Fallback to localStorage (admin panel fallback)
      const savedEnv = localStorage.getItem('esim_environment');
      if (savedEnv) {
        console.log('✅ DataPlans environment loaded from localStorage:', savedEnv);
        return savedEnv;
      }
      
      // Default to test environment
      console.log('⚠️ No DataPlans environment found, defaulting to test');
      return 'test';
    } catch (error) {
      console.error('❌ Error loading DataPlans environment:', error);
      // Fallback to localStorage
      const savedEnv = localStorage.getItem('esim_environment');
      return savedEnv || 'test';
    }
  }

  // Get Stripe publishable key based on mode
  getStripePublishableKey(mode = 'test') {
    if (mode === 'live' || mode === 'production') {
      return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    } else {
      return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    }
  }

  // Get Stripe secret key based on mode (for server-side)
  getStripeSecretKey(mode = 'test') {
    if (mode === 'live' || mode === 'production') {
      return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
    } else {
      return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export const configService = new ConfigService();
