import { Injectable, inject } from '@angular/core';
import {
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { buildLocationKey, isSector, normalizeHouseNumber } from './location';
import { House, HouseAlreadyExistsError, HouseFilters, SellerType, isSellerType } from './models';
import { houseDocument, housePhotoPath, housesCollection } from './paths';

export interface CreateHouseInput {
  name: string;
  description: string;
  region: number;
  sector: string;
  houseNumber: string;
  photos: File[];
}

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
                : query(housesRef, orderBy('createdAt', 'desc'), limit(48));

    const snap = await getDocs(housesQuery);
    let houses = snap.docs.map((item) => mapHouse(item.id, item.data()));
    if (regions.length) houses = houses.filter((house) => regions.includes(house.region));
    if (sectors.length) houses = houses.filter((house) => (sectors as readonly string[]).includes(String(house.sector)));
    if (houseNumber) houses = houses.filter((house) => house.houseNumber === houseNumber);
    return houses.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getById(id: string): Promise<House | null> {
    const snap = await getDoc(houseDocument(this.firebase.requireFirestore(), id));
    return snap.exists() ? mapHouse(snap.id, snap.data()) : null;
  }

  async findByLocation(region: number, sector: string, houseNumber: string): Promise<House | null> {
    const key = buildLocationKey(region, sector, houseNumber);
    if (!key) return null;
    return this.getById(key);
  }

  async listPublished(max = 200): Promise<House[]> {
    const snap = await getDocs(query(housesCollection(this.firebase.requireFirestore()), limit(max)));
    return snap.docs.map((item) => mapHouse(item.id, item.data())).sort((a, b) => b.createdAt - a.createdAt);
  }

  async bySeller(sellerId: string, exceptId?: string): Promise<House[]> {
    const snap = await getDocs(
      query(housesCollection(this.firebase.requireFirestore()), where('sellerId', '==', sellerId), limit(12)),
    );
    return snap.docs
      .map((item) => mapHouse(item.id, item.data()))
      .filter((house) => house.id !== exceptId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async create(input: CreateHouseInput): Promise<House> {
    const profile = this.auth.profile();
    if (!profile || profile.role !== 'seller' || !profile.sellerType) {
      throw new Error('إضافة المنزل متاحة لحساب بائع مكتمل البيانات.');
    }
    if (input.photos.length > MAX_PHOTOS) {
      throw new Error('الحد الأقصى 3 صور لكل منزل.');
    }
    input.photos.forEach(assertPhoto);

    const key = buildLocationKey(input.region, input.sector, input.houseNumber);
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    if (!key || !houseNumber) {
      throw new Error('تحقق من المنطقة والقطاع ورقم المنزل.');
    }

    const existing = await this.getById(key);
    if (existing) throw new HouseAlreadyExistsError(existing);

    const storage = this.firebase.requireStorage();
    const uploaded: string[] = [];
    const paths: string[] = [];
    try {
      for (let index = 0; index < input.photos.length; index += 1) {
        const file = input.photos[index];
        const path = housePhotoPath(profile.uid, key, `${index}.${extensionFor(file)}`);
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        paths.push(path);
        uploaded.push(await getDownloadURL(storageRef));
      }

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
          photos: uploaded,
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
    } catch (error) {
      await Promise.all(
        paths.map(async (path) => {
          try {
            await deleteObject(ref(storage, path));
          } catch {
            // The upload may already have been removed.
          }
        }),
      );
      throw error;
    }

    const created = await this.getById(key);
    if (!created) throw new Error('تعذر قراءة المنزل بعد حفظه.');
    return created;
  }
}

export function assertPhoto(file: File): void {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    throw new Error('الصور المسموحة: JPG أو PNG أو WEBP أو GIF.');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميغابايت.');
  }
}

function extensionFor(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
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
