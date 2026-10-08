import { dateLocale } from '../../locale/locale';

export function todayKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function monthStartKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-01`;
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatArabicDate(millis: number): string {
  if (!millis) return '';
  return new Intl.DateTimeFormat(dateLocale(), { dateStyle: 'medium' }).format(new Date(millis));
}
