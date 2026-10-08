import { Injectable } from '@angular/core';
import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly config: FirebaseOptions = firebaseConfig;
  readonly configured = isFirebaseConfigured(firebaseConfig);
  readonly app: FirebaseApp | null;
  readonly auth: Auth | null;
  readonly firestore: Firestore | null;
  readonly storage: FirebaseStorage | null;

  constructor() {
    if (!this.configured) {
      this.app = null;
      this.auth = null;
      this.firestore = null;
      this.storage = null;
      return;
    }

    this.app = getApps().find((app) => app.name === '[DEFAULT]') ?? initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.storage = getStorage(this.app);
  }

  requireAuth(): Auth {
    if (!this.auth) throw new Error('أضف إعدادات Firebase أولاً في ملف firebase-config.ts');
    return this.auth;
  }

  requireFirestore(): Firestore {
    if (!this.firestore) throw new Error('أضف إعدادات Firebase أولاً في ملف firebase-config.ts');
    return this.firestore;
  }

  requireStorage(): FirebaseStorage {
    if (!this.storage) throw new Error('أضف إعدادات Firebase أولاً في ملف firebase-config.ts');
    return this.storage;
  }

  sellerCreatorApp(): FirebaseApp {
    return getApps().find((app) => app.name === 'seller-creator') ?? initializeApp(this.config, 'seller-creator');
  }
}
