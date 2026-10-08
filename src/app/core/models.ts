import { Sector } from './location';
import { t } from '../../locale/locale';

export type UserRole = 'admin' | 'seller';
export type SellerType = 'owner' | 'agent' | 'company';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone: string;
  sellerType: SellerType | null;
  rating: number;
  createdAt: number;
}

export interface House {
  id: string;
  name: string;
  description: string;
  region: number;
  sector: Sector | string;
  houseNumber: string;
  locationKey: string;
  photos: string[];
  youtubeUrl: string;
  price: number;
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
  sellerRating: number;
  sellerPhone: string;
  viewCount: number;
  phoneRevealCount: number;
  createdAt: number;
}

export interface HouseFilters {
  regions: number[];
  sectors: string[];
  houseNumber: string | null;
}

export interface RangeTotals {
  views: number;
  phoneReveals: number;
}

export interface HouseStatRow {
  house: House;
  views: number;
  phoneReveals: number;
}

export interface SellerStatRow {
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
  houses: number;
  views: number;
  phoneReveals: number;
}

export const SELLER_TYPES: SellerType[] = ['owner', 'agent', 'company'];

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  get owner() {
    return t().sellerTypes.owner;
  },
  get agent() {
    return t().sellerTypes.agent;
  },
  get company() {
    return t().sellerTypes.company;
  },
};

export function sellerTypeLabel(type: SellerType | null | undefined): string {
  if (!type) return t().sellerTypes.unknown;
  return SELLER_TYPE_LABELS[type] ?? t().sellerTypes.unknown;
}

export function isSellerType(value: string): value is SellerType {
  return (SELLER_TYPES as string[]).includes(value);
}

export class HouseAlreadyExistsError extends Error {
  constructor(readonly house: House) {
    super('house-exists');
    this.name = 'HouseAlreadyExistsError';
  }
}

export class HousePhotosUploadError extends Error {
  constructor(
    readonly house: House,
    message = t().errors.publishedWithoutPhotos,
  ) {
    super(message);
    this.name = 'HousePhotosUploadError';
  }
}
