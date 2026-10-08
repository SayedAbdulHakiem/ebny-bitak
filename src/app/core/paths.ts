import { CollectionReference, DocumentReference, Firestore, collection, doc } from 'firebase/firestore';

/** Every app document lives under this Firestore root. */
export const DATA_ROOT = 'ebny_bitak';
const ROOT_DOC = 'root';

export function rootDocument(db: Firestore): DocumentReference {
  return doc(db, DATA_ROOT, ROOT_DOC);
}

export function housesCollection(db: Firestore): CollectionReference {
  return collection(db, DATA_ROOT, ROOT_DOC, 'houses');
}

export function houseDocument(db: Firestore, houseId: string): DocumentReference {
  return doc(db, DATA_ROOT, ROOT_DOC, 'houses', houseId);
}

export function usersCollection(db: Firestore): CollectionReference {
  return collection(db, DATA_ROOT, ROOT_DOC, 'users');
}

export function userDocument(db: Firestore, uid: string): DocumentReference {
  return doc(db, DATA_ROOT, ROOT_DOC, 'users', uid);
}

export function houseDaysCollection(db: Firestore, houseId: string): CollectionReference {
  return collection(db, DATA_ROOT, ROOT_DOC, 'houseStats', houseId, 'daily');
}

export function houseDayDocument(db: Firestore, houseId: string, date: string): DocumentReference {
  return doc(db, DATA_ROOT, ROOT_DOC, 'houseStats', houseId, 'daily', date);
}

export function sellerDaysCollection(db: Firestore, sellerId: string): CollectionReference {
  return collection(db, DATA_ROOT, ROOT_DOC, 'sellerStats', sellerId, 'daily');
}

export function sellerDayDocument(db: Firestore, sellerId: string, date: string): DocumentReference {
  return doc(db, DATA_ROOT, ROOT_DOC, 'sellerStats', sellerId, 'daily', date);
}

export function housePhotoPath(sellerId: string, houseId: string, fileName: string): string {
  return `${DATA_ROOT}/houses/${sellerId}/${houseId}/${fileName}`;
}

export function houseImageDocument(db: Firestore, photoId: string): DocumentReference {
  return doc(db, DATA_ROOT, ROOT_DOC, 'housePhotos', photoId);
}
