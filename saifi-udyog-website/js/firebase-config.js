/**
 * Firebase Configuration
 * ─────────────────────────────────────────────────────────────
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project → Add a Web app
 * 3. Copy your config below
 * 4. Enable Authentication → Email/Password
 * 5. Enable Firestore Database → Start in test mode (then update rules)
 * 6. Enable Storage → Start in test mode
 * 7. Create admin user: Authentication → Add user
 * ─────────────────────────────────────────────────────────────
 */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDu5bjBsIX3lq6TmOXX5cQyxNrsVFZ-PSU',
  authDomain: 'saifiudhyog.firebaseapp.com',
  projectId: 'saifiudhyog',
  storageBucket: 'saifiudhyog.firebasestorage.app',
  messagingSenderId: '613841137107',
  appId: '1:613841137107:web:98c604aa01821650bf9326'
};

/** Set to true once FIREBASE_CONFIG is filled in */
const FIREBASE_ENABLED = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId
);
