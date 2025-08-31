import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAl456JTQntXJItbXSv8hx1oQ9KW4BGci4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "esim-f0e3e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "esim-f0e3e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "esim-f0e3e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "482450515497",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:482450515497:web:08533fb9536c8e6aa39e38",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-T0YBW024Z8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
// Initialize Analytics only if supported
export let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
  } else {
    console.log('⚠️ Firebase Analytics not supported in this environment');
  }
}).catch((error) => {
  console.log('⚠️ Firebase Analytics initialization failed:', error);
});

// Configure functions region if needed
// functions.useEmulator('localhost', 5001); // Uncomment for local development

export default app;
