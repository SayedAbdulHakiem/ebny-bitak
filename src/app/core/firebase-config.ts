import type { FirebaseOptions } from 'firebase/app';

/**
 * Paste the web app config from Firebase console:
 * Project settings → Your apps → SDK setup and configuration.
 *
 * The first admin is NOT created in the app. After Authentication and Firestore
 * are enabled:
 * 1. Authentication → Add user (email/password).
 * 2. Firestore → create ebny_bitak/root/users/{that-uid} with:
 *    email, displayName, role: "admin", phone: "", sellerType: null, rating: 0, createdAt
 * Role is read only from this document.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyDp-3hBFJ_WEvXhjp-HueHjjAWXQTb8L5k',
  authDomain: 'sayed-26f44.firebaseapp.com',
  databaseURL: 'https://sayed-26f44.firebaseio.com',
  projectId: 'sayed-26f44',
  storageBucket: 'sayed-26f44.firebasestorage.app',
  messagingSenderId: '872105448886',
  appId: '1:872105448886:web:c9e3883f15ca604e2a5d17',
};

export function isFirebaseConfigured(config: FirebaseOptions = firebaseConfig): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId && config.storageBucket);
}
