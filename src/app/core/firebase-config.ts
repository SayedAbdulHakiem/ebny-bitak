import type { FirebaseOptions } from 'firebase/app';
import { firebaseConfig as localFirebaseConfig } from './firebase-config.local';

/**
 * Values come from firebase-config.local.ts, which is listed in .gitignore.
 */
export const firebaseConfig: FirebaseOptions = localFirebaseConfig;

export function isFirebaseConfigured(config: FirebaseOptions = firebaseConfig): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId && config.storageBucket);
}
