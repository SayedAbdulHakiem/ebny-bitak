import { Injectable, inject, signal } from '@angular/core';
import {
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch, DocumentData, Timestamp } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AppUser, SellerType, UserRole, isSellerType } from './models';
import { housesCollection, userDocument, usersCollection } from './paths';
import { localeId, t } from '../../locale/locale';

export interface CreateSellerInput {
  displayName: string;
  email: string;
  password: string;
  phone: string;
  sellerType: SellerType;
  rating: number;
}

export interface UpdateSellerInput {
  uid: string;
  displayName: string;
  phone: string;
  sellerType: SellerType;
  rating: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebase = inject(FirebaseService);

  readonly profile = signal<AppUser | null>(null);
  /** undefined while the first auth state is unknown, null when signed out. */
  readonly authUid = signal<string | null | undefined>(undefined);

  constructor() {
    if (!this.firebase.auth || !this.firebase.firestore) {
      this.authUid.set(null);
      return;
    }

    onAuthStateChanged(this.firebase.auth, (user) => {
      void this.publish(user);
    });
  }

  async ensureReady(): Promise<void> {
    const started = Date.now();
    while (this.authUid() === undefined) {
      if (Date.now() - started > 10000) return;
      await delay(40);
    }
  }

  async login(email: string, password: string): Promise<AppUser> {
    const auth = this.firebase.requireAuth();
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await this.waitForUid(credential.user.uid);
    const profile = this.profile();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'seller')) {
      await signOut(auth);
      throw new Error(t().errors.noRole);
    }
    return profile;
  }

  async logout(): Promise<void> {
    if (!this.firebase.auth) return;
    await signOut(this.firebase.auth);
  }

  async createSeller(input: CreateSellerInput): Promise<void> {
    this.requireAdmin();
    const secondaryAuth = getAuth(this.firebase.sellerCreatorApp());
    const credential = await createUserWithEmailAndPassword(secondaryAuth, input.email.trim(), input.password);
    try {
      await setDoc(userDocument(this.firebase.requireFirestore(), credential.user.uid), {
        email: input.email.trim(),
        displayName: input.displayName.trim(),
        role: 'seller',
        phone: input.phone.trim(),
        sellerType: input.sellerType,
        rating: input.rating,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      await credential.user.delete().catch(() => undefined);
      throw error;
    } finally {
      await signOut(secondaryAuth).catch(() => undefined);
    }
  }

  async updateSeller(input: UpdateSellerInput): Promise<void> {
    this.requireAdmin();
    const db = this.firebase.requireFirestore();
    const userRef = userDocument(db, input.uid);
    const houses = await getDocs(query(housesCollection(db), where('sellerId', '==', input.uid)));
    const batch = writeBatch(db);
    batch.update(userRef, {
      displayName: input.displayName.trim(),
      phone: input.phone.trim(),
      sellerType: input.sellerType,
      rating: input.rating,
    });
    houses.docs.forEach((house) => {
      batch.update(house.ref, {
        sellerName: input.displayName.trim(),
        sellerPhone: input.phone.trim(),
        sellerType: input.sellerType,
        sellerRating: input.rating,
      });
    });
    await batch.commit();
  }

  async listSellers(): Promise<AppUser[]> {
    this.requireAdmin();
    const snap = await getDocs(
      query(usersCollection(this.firebase.requireFirestore()), where('role', '==', 'seller')),
    );
    return snap.docs
      .map((item) => mapUser(item.id, item.data()))
      .filter((user): user is AppUser => user !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, localeId()));
  }

  private requireAdmin(): void {
    if (this.profile()?.role !== 'admin') {
      throw new Error(t().errors.adminOnly);
    }
  }

  private async publish(user: User | null): Promise<void> {
    if (!user || !this.firebase.firestore) {
      this.profile.set(null);
      this.authUid.set(null);
      return;
    }

    const snap = await getDoc(userDocument(this.firebase.firestore, user.uid));
    const mapped = snap.exists() ? mapUser(snap.id, snap.data()) : null;
    const allowed = mapped && (mapped.role === 'admin' || mapped.role === 'seller') ? mapped : null;
    this.profile.set(allowed);
    this.authUid.set(user.uid);
  }

  private async waitForUid(uid: string): Promise<void> {
    const started = Date.now();
    while (this.authUid() !== uid) {
      if (Date.now() - started > 10000) {
        throw new Error(t().errors.authTimeout);
      }
      await delay(40);
    }
  }
}

function mapUser(uid: string, data: DocumentData): AppUser | null {
  const role = data['role'];
  if (role !== 'admin' && role !== 'seller') return null;
  const sellerTypeValue = data['sellerType'];
  return {
    uid,
    email: String(data['email'] ?? ''),
    displayName: String(data['displayName'] ?? ''),
    role: role as UserRole,
    phone: String(data['phone'] ?? ''),
    sellerType: typeof sellerTypeValue === 'string' && isSellerType(sellerTypeValue) ? sellerTypeValue : null,
    rating: Number(data['rating'] ?? 0),
    createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'].toMillis() : 0,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
