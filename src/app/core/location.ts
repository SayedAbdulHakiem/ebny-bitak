export const REGIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export const SECTORS = [
  'أ',
  'ب',
  'ت',
  'ث',
  'ج',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ك',
  'ل',
  'م',
  'ن',
  'ه',
  'و',
  'ي',
] as const;

export type Region = (typeof REGIONS)[number];
export type Sector = (typeof SECTORS)[number];

const HOUSE_NUMBER_PATTERN = /^[\u0600-\u06FFa-zA-Z0-9-]{1,20}$/;

export function isRegion(value: number): value is Region {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

export function isSector(value: string): value is Sector {
  return (SECTORS as readonly string[]).includes(value);
}

export function normalizeHouseNumber(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, '');
  if (!HOUSE_NUMBER_PATTERN.test(normalized) || normalized.includes('_')) return null;
  return normalized;
}

export function buildLocationKey(region: number, sector: string, houseNumber: string): string | null {
  const number = normalizeHouseNumber(houseNumber);
  if (!isRegion(region) || !isSector(sector) || !number) return null;
  return `${region}_${sector}_${number}`;
}
