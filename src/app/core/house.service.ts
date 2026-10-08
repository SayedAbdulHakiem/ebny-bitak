import { Injectable, inject } from '@angular/core';
import {
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { buildLocationKey, isSector, normalizeHouseNumber } from './location';
import { House, HouseAlreadyExistsError, HouseFilters, HousePhotosUploadError, SellerType, isSellerType } from './models';
import { normalizeYoutubeUrl } from './youtube';
import { parsePrice } from './price';
import { houseDocument, houseImageDocument, housesCollection } from './paths';
import { t } from '../../locale/locale';

export interface CreateHouseInput {
  name: string;
  description: string;
  region: number;
  sector: string;
  houseNumber: string;
  youtubeUrl: string;
  price: string;
  photos: File[];
}

export interface UpdateHouseInput {
  name: string;
  description: string;
  youtubeUrl: string;
  price: string;
  keepPhotoRefs: string[];
  photos: File[];
}

export interface EditableHouse {
  house: House;
  photoRefs: string[];
}

export const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_REF = 'fs:';

@Injectable({ providedIn: 'root' })
export class HouseService {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(AuthService);

  async search(filters: HouseFilters): Promise<House[]> {
    const db = this.firebase.requireFirestore();
    const housesRef = housesCollection(db);
    const regions = filters.regions.filter((region) => Number.isInteger(region) && region >= 1 && region <= 7);
    const sectors = filters.sectors.filter((sector) => isSector(sector));
    const houseNumber = filters.houseNumber ? normalizeHouseNumber(filters.houseNumber) : null;
    if (filters.houseNumber && !houseNumber) return [];

    const housesQuery =
      regions.length === 1
        ? query(housesRef, where('region', '==', regions[0]), limit(100))
        : regions.length > 1
          ? query(housesRef, where('region', 'in', regions), limit(100))
          : sectors.length === 1
            ? query(housesRef, where('sector', '==', sectors[0]), limit(100))
            : sectors.length > 1
              ? query(housesRef, where('sector', 'in', sectors), limit(100))
              : houseNumber
                ? query(housesRef, where('houseNumber', '==', houseNumber), limit(50))
                : query(housesRef, limit(100));

    const snap = await getDocs(housesQuery);
    let houses = snap.docs.map((item) => mapHouse(item.id, item.data()));
    if (regions.length) houses = houses.filter((house) => regions.includes(house.region));
    if (sectors.length) houses = houses.filter((house) => (sectors as readonly string[]).includes(String(house.sector)));
    if (houseNumber) houses = houses.filter((house) => house.houseNumber === houseNumber);
    return Promise.all(houses.sort((a, b) => b.createdAt - a.createdAt).map((house) => this.resolvePhotos(house, true)));
  }

  async getById(id: string): Promise<House | null> {
    const snap = await getDoc(houseDocument(this.firebase.requireFirestore(), id));
    return snap.exists() ? this.resolvePhotos(mapHouse(snap.id, snap.data())) : null;
  }

  async findByLocation(region: number, sector: string, houseNumber: string): Promise<House | null> {
    const key = buildLocationKey(region, sector, houseNumber);
    if (!key) return null;
    return this.getById(key);
  }

  async listPublished(max = 200): Promise<House[]> {
    const snap = await getDocs(query(housesCollection(this.firebase.requireFirestore()), limit(max)));
    const houses = snap.docs.map((item) => mapHouse(item.id, item.data())).sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(houses.map((house) => this.resolvePhotos(house, true)));
  }

  async listMine(): Promise<House[]> {
    const profile = this.auth.profile();
    if (!profile || profile.role !== 'seller') return [];
    const snap = await getDocs(
      query(housesCollection(this.firebase.requireFirestore()), where('sellerId', '==', profile.uid), limit(100)),
    );
    const houses = snap.docs.map((item) => mapHouse(item.id, item.data())).sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(houses.map((house) => this.resolvePhotos(house, true)));
  }

  async getOwned(id: string): Promise<EditableHouse | null> {
    const profile = this.auth.profile();
    const snap = await getDoc(houseDocument(this.firebase.requireFirestore(), id));
    if (!snap.exists() || !profile || profile.role !== 'seller') return null;
    const raw = mapHouse(snap.id, snap.data());
    if (raw.sellerId !== profile.uid) return null;
    const resolved = await Promise.all(raw.photos.map((photo) => this.resolvePhoto(photo)));
    const photoRefs: string[] = [];
    const photos: string[] = [];
    raw.photos.forEach((photoRef, index) => {
      photoRefs.push(photoRef);
      photos.push(resolved[index] ?? '');
    });
    return { house: { ...raw, photos }, photoRefs };
  }

  async update(houseId: string, input: UpdateHouseInput): Promise<EditableHouse> {
    const profile = this.auth.profile();
    const houseRef = houseDocument(this.firebase.requireFirestore(), houseId);
    const snap = await getDoc(houseRef);
    if (!snap.exists()) throw new Error(t().errors.houseMissing);
    const house = mapHouse(snap.id, snap.data());
    if (!profile || profile.role !== 'seller' || house.sellerId !== profile.uid) {
      throw new Error(t().errors.editOwnerOnly);
    }

    const name = input.name.trim();
    const description = input.description.trim();
    const youtubeUrl = normalizeYoutubeUrl(input.youtubeUrl);
    const price = parsePrice(input.price);
    if (name.length < 3 || name.length > 80) throw new Error(t().errors.shortDescription);
    if (description.length < 10 || description.length > 600) throw new Error(t().errors.description);

    const keep = input.keepPhotoRefs.filter((photo) => house.photos.includes(photo));
    const removed = house.photos.filter((photo) => !keep.includes(photo));
    if (keep.length + input.photos.length > MAX_PHOTOS) throw new Error(t().errors.maxPhotos(MAX_PHOTOS));
    input.photos.forEach(assertPhoto);

    const added = input.photos.length
      ? await this.uploadToDatabase(profile.uid, houseId, input.photos, nextPhotoIndex(houseId, house.photos))
      : [];

    try {
      await updateDoc(houseRef, { name, description, youtubeUrl, price, photos: [...keep, ...added] });
    } catch (error) {
      await this.deletePhotoRefs(added);
      throw error;
    }
    await this.deletePhotoRefs(removed);
    const updated = await this.getOwned(houseId);
    if (!updated) throw new Error(t().errors.readAfterEdit);
    return updated;
  }

  async bySeller(sellerId: string, exceptId?: string): Promise<House[]> {
    const snap = await getDocs(
      query(housesCollection(this.firebase.requireFirestore()), where('sellerId', '==', sellerId), limit(12)),
    );
    const houses = snap.docs
      .map((item) => mapHouse(item.id, item.data()))
      .filter((house) => house.id !== exceptId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(houses.map((house) => this.resolvePhotos(house, true)));
  }

  async create(input: CreateHouseInput): Promise<House> {
    const profile = this.auth.profile();
    if (!profile || profile.role !== 'seller' || !profile.sellerType) {
      throw new Error(t().errors.sellerOnlyCreate);
    }
    if (input.photos.length > MAX_PHOTOS) {
      throw new Error(t().errors.maxPhotos(MAX_PHOTOS));
    }
    input.photos.forEach(assertPhoto);

    const youtubeUrl = normalizeYoutubeUrl(input.youtubeUrl);
    const price = parsePrice(input.price);
    const key = buildLocationKey(input.region, input.sector, input.houseNumber);
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    if (!key || !houseNumber) {
      throw new Error(t().errors.location);
    }

    const existing = await this.getById(key);
    if (existing) throw new HouseAlreadyExistsError(existing);

    const houseRef = houseDocument(this.firebase.requireFirestore(), key);
    await runTransaction(this.firebase.requireFirestore(), async (transaction) => {
      const snap = await transaction.get(houseRef);
      if (snap.exists()) throw new HouseAlreadyExistsError(mapHouse(snap.id, snap.data()));
      transaction.set(houseRef, {
        name: input.name.trim(),
        description: input.description.trim(),
        region: input.region,
        sector: input.sector,
        houseNumber,
        locationKey: key,
        photos: [],
        youtubeUrl,
        price,
        sellerId: profile.uid,
        sellerName: profile.displayName,
        sellerType: profile.sellerType,
        sellerRating: profile.rating,
        sellerPhone: profile.phone,
        viewCount: 0,
        phoneRevealCount: 0,
        createdAt: serverTimestamp(),
      });
    });

    if (input.photos.length === 0) {
      const created = await this.getById(key);
      if (!created) throw new Error(t().errors.readAfterCreate);
      return created;
    }

    try {
      await this.attachPhotos(key, input.photos);
    } catch (error) {
      const created = await this.getById(key);
      if (created) {
        const reason = error instanceof Error && /[\u0600-\u06FF]/.test(error.message)
          ? error.message
          : t().errors.publishedWithoutPhotos;
        throw new HousePhotosUploadError(created, reason);
      }
      throw error;
    }

    const created = await this.getById(key);
    if (!created) throw new Error(t().errors.readAfterCreate);
    return created;
  }

  async addPhotos(houseId: string, files: File[]): Promise<House> {
    const profile = this.auth.profile();
    const house = await this.getById(houseId);
    const raw = await getDoc(houseDocument(this.firebase.requireFirestore(), houseId));
    const stored = Array.isArray(raw.data()?.['photos'])
      ? (raw.data()?.['photos'] as unknown[]).filter((item) => typeof item === 'string')
      : [];
    if (!profile || profile.role !== 'seller' || !house || house.sellerId !== profile.uid) {
      throw new Error(t().errors.photosOwnerOnly);
    }
    if (stored.length + files.length > MAX_PHOTOS) {
      throw new Error(t().errors.maxPhotos(MAX_PHOTOS));
    }
    files.forEach(assertPhoto);
    await this.attachPhotos(houseId, files, stored.length);
    const updated = await this.getById(houseId);
    if (!updated) throw new Error(t().errors.readAfterPhotos);
    return updated;
  }

  private async attachPhotos(houseId: string, files: File[], startIndex = 0): Promise<void> {
    const profile = this.auth.profile();
    if (!profile) throw new Error(t().errors.loginBeforePhotos);
    const photos = await this.uploadToDatabase(profile.uid, houseId, files, startIndex);
    const houseRef = houseDocument(this.firebase.requireFirestore(), houseId);
    const current = await getDoc(houseRef);
    const existing = Array.isArray(current.data()?.['photos'])
      ? (current.data()?.['photos'] as unknown[]).filter((item) => typeof item === 'string')
      : [];
    await updateDoc(houseRef, { photos: [...existing, ...photos] });
  }

  private async uploadToDatabase(sellerId: string, houseId: string, files: File[], startIndex: number): Promise<string[]> {
    const db = this.firebase.requireFirestore();
    const refs: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const photoId = `${houseId}__${startIndex + index}`;
      const image = await compressPhoto(files[index]);
      await setDoc(houseImageDocument(db, photoId), {
        sellerId,
        houseId,
        contentType: image.contentType,
        data: image.data,
      });
      refs.push(`${PHOTO_REF}${photoId}`);
    }
    return refs;
  }

  private async deletePhotoRefs(photos: string[]): Promise<void> {
    const db = this.firebase.requireFirestore();
    await Promise.all(
      photos.map(async (photo) => {
        try {
          if (photo.startsWith(PHOTO_REF)) {
            await deleteDoc(houseImageDocument(db, photo.slice(PHOTO_REF.length)));
          }
        } catch {
          // A missing file should not block the saved listing.
        }
      }),
    );
  }

  private async resolvePhotos(house: House, firstOnly = false): Promise<House> {
    const selected = firstOnly ? house.photos.slice(0, 1) : house.photos;
    const photos = await Promise.all(selected.map((photo) => this.resolvePhoto(photo)));
    return { ...house, photos: photos.filter((photo): photo is string => Boolean(photo)) };
  }

  private async resolvePhoto(photo: string): Promise<string | null> {
    if (!photo.startsWith(PHOTO_REF)) return photo;
    const snap = await getDoc(houseImageDocument(this.firebase.requireFirestore(), photo.slice(PHOTO_REF.length)));
    const data = snap.data();
    if (!snap.exists() || typeof data?.['data'] !== 'string') return null;
    const contentType = typeof data['contentType'] === 'string' ? data['contentType'] : 'image/jpeg';
    return `data:${contentType};base64,${data['data']}`;
  }
}

export function assertPhoto(file: File): void {
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(type)) {
    throw new Error(t().errors.photoTypes);
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error(t().errors.photoTooBig);
  }
}

function nextPhotoIndex(houseId: string, photos: string[]): number {
  const prefix = `${houseId}__`;
  let next = photos.length;
  for (const photo of photos) {
    if (!photo.startsWith(PHOTO_REF)) continue;
    const id = photo.slice(PHOTO_REF.length);
    if (!id.startsWith(prefix)) continue;
    const index = Number(id.slice(prefix.length));
    if (Number.isInteger(index)) next = Math.max(next, index + 1);
  }
  return next;
}

async function compressPhoto(file: File): Promise<{ contentType: string; data: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(t().errors.photoUnreadable);
  }

  try {
    let maxEdge = 1400;
    let quality = 0.72;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const data = await blobToBase64(await renderJpeg(bitmap, maxEdge, quality));
      if (data.length < 600_000) return { contentType: 'image/jpeg', data };
      quality = Math.max(0.45, quality - 0.1);
      maxEdge = Math.max(640, Math.round(maxEdge * 0.75));
    }
    throw new Error(t().errors.photoStillTooBig);
  } finally {
    bitmap.close();
  }
}

function renderJpeg(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error(t().errors.photoPrepare));
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas, quality);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(t().errors.photoPrepare))), 'image/jpeg', quality);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error(t().errors.photoRead));
    reader.readAsDataURL(blob);
  });
}

function mapHouse(id: string, data: DocumentData): House {
  const sellerType = data['sellerType'];
  return {
    id,
    name: String(data['name'] ?? ''),
    description: String(data['description'] ?? ''),
    region: Number(data['region']),
    sector: String(data['sector'] ?? ''),
    houseNumber: String(data['houseNumber'] ?? ''),
    locationKey: String(data['locationKey'] ?? id),
    photos: Array.isArray(data['photos']) ? data['photos'].filter((item) => typeof item === 'string') : [],
    youtubeUrl: String(data['youtubeUrl'] ?? ''),
    price: Number(data['price'] ?? 0),
    sellerId: String(data['sellerId'] ?? ''),
    sellerName: String(data['sellerName'] ?? ''),
    sellerType: isSellerType(String(sellerType)) ? (sellerType as SellerType) : 'owner',
    sellerRating: Number(data['sellerRating'] ?? 0),
    sellerPhone: String(data['sellerPhone'] ?? ''),
    viewCount: Number(data['viewCount'] ?? 0),
    phoneRevealCount: Number(data['phoneRevealCount'] ?? 0),
    createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'].toMillis() : 0,
  };
}
