import { computed, signal } from '@angular/core';
import { ar } from './ar';
import { en } from './en';

export type LocaleId = 'ar' | 'en';

const STORAGE_KEY = 'ebny-locale';
const catalogs = { ar, en };

function readLocale(): LocaleId {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

export const localeId = signal<LocaleId>(readLocale());

export const text = computed(() => catalogs[localeId()]);

export function t() {
  return text();
}

export function numberLocale(): string {
  return localeId() === 'ar' ? 'ar-EG' : 'en-EG';
}

export function dateLocale(): string {
  return localeId() === 'ar' ? 'ar-EG' : 'en-GB';
}

export function setLocale(id: LocaleId): void {
  localeId.set(id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // The choice still applies for this visit.
  }
  applyDocumentLocale(id);
}

export function applyDocumentLocale(id: LocaleId = localeId()): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = id;
  document.documentElement.dir = id === 'ar' ? 'rtl' : 'ltr';
}

applyDocumentLocale();
